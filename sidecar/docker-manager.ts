/**
 * DOCKER MANAGER - Container Lifecycle Management
 * 
 * Manages Docker operations for n8n containers:
 * - Container restart
 * - Image pull
 * - Blue-green deployment swaps
 * - Health monitoring
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  health?: string;
  created: string;
  ports: string[];
}

export interface ContainerMetrics {
  cpu_percent: number;
  memory_usage_mb: number;
  memory_limit_mb: number;
  network_rx_mb: number;
  network_tx_mb: number;
}

/**
 * Docker Manager Class
 * Interacts with Docker daemon via socket
 */
export class DockerManager {
  private containerName: string;

  constructor(containerName: string = 'n8n') {
    this.containerName = containerName;
  }

  /**
   * CONTAINER LIFECYCLE OPERATIONS
   */

  async restartContainer(): Promise<{ success: boolean; newPid?: number }> {
    try {
      // Restart the container
      await execAsync(`docker restart ${this.containerName}`);

      // Wait for container to come back up
      await this.waitForHealthy(30);

      // Get new PID
      const { stdout } = await execAsync(`docker inspect ${this.containerName} --format '{{.State.Pid}}'`);
      const pid = parseInt(stdout.trim(), 10);

      return { success: true, newPid: pid };
    } catch (error) {
      console.error('Container restart failed:', error);
      return { success: false };
    }
  }

  async stopContainer(): Promise<boolean> {
    try {
      await execAsync(`docker stop ${this.containerName}`);
      return true;
    } catch (error) {
      console.error('Container stop failed:', error);
      return false;
    }
  }

  async startContainer(): Promise<boolean> {
    try {
      await execAsync(`docker start ${this.containerName}`);
      await this.waitForHealthy(30);
      return true;
    } catch (error) {
      console.error('Container start failed:', error);
      return false;
    }
  }

  /**
   * IMAGE OPERATIONS
   */

  async pullImage(imageName: string, tag: string = 'latest'): Promise<boolean> {
    try {
      const fullImage = `${imageName}:${tag}`;
      console.log(`Pulling image: ${fullImage}`);

      await execAsync(`docker pull ${fullImage}`, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for pull output
      });

      return true;
    } catch (error) {
      console.error('Image pull failed:', error);
      return false;
    }
  }

  /**
   * BLUE-GREEN DEPLOYMENT
   * 
   * Strategy:
   * 1. Pull new image
   * 2. Create new container with -new suffix
   * 3. Start new container
   * 4. Wait for health check
   * 5. Stop old container
   * 6. Rename new container to original name
   * 7. Remove old container
   */
  async swapContainer(newImageTag: string): Promise<{ success: boolean; oldContainerId?: string }> {
    try {
      const oldContainerName = this.containerName;
      const newContainerName = `${this.containerName}-new`;

      // STEP 1: Get old container ID
      const { stdout: oldId } = await execAsync(
        `docker inspect ${oldContainerName} --format '{{.Id}}'`
      );
      const oldContainerId = oldId.trim();

      // STEP 2: Pull new image
      const pullSuccess = await this.pullImage('n8nio/n8n', newImageTag);
      if (!pullSuccess) {
        throw new Error('Failed to pull new image');
      }

      // STEP 3: Get old container config
      const { stdout: configJson } = await execAsync(
        `docker inspect ${oldContainerName}`
      );
      const config = JSON.parse(configJson)[0];

      // STEP 4: Create new container with same config
      const envVars = config.Config.Env.map((e: string) => `-e ${e}`).join(' ');
      const volumes = Object.keys(config.Mounts || {})
        .map((m: any) => `-v ${m.Source}:${m.Destination}`)
        .join(' ');
      const ports = Object.keys(config.HostConfig?.PortBindings || {})
        .map((p) => {
          const hostPort = config.HostConfig.PortBindings[p][0]?.HostPort;
          return `-p ${hostPort}:${p.split('/')[0]}`;
        })
        .join(' ');

      await execAsync(
        `docker create --name ${newContainerName} ${envVars} ${volumes} ${ports} n8nio/n8n:${newImageTag}`
      );

      // STEP 5: Start new container
      await execAsync(`docker start ${newContainerName}`);

      // STEP 6: Wait for health check
      const healthy = await this.waitForHealthy(60, newContainerName);
      if (!healthy) {
        // Rollback: remove new container
        await execAsync(`docker rm -f ${newContainerName}`);
        throw new Error('New container failed health check');
      }

      // STEP 7: Stop old container
      await execAsync(`docker stop ${oldContainerName}`);

      // STEP 8: Rename new container
      await execAsync(`docker rename ${newContainerName} ${oldContainerName}`);

      // STEP 9: Remove old container
      await execAsync(`docker rm ${oldContainerId}`);

      console.log(`Blue-green swap complete: ${oldContainerId} → ${newImageTag}`);

      return { success: true, oldContainerId };
    } catch (error) {
      console.error('Blue-green swap failed:', error);
      return { success: false };
    }
  }

  /**
   * MONITORING OPERATIONS
   */

  async getContainerInfo(): Promise<ContainerInfo | null> {
    try {
      const { stdout } = await execAsync(
        `docker inspect ${this.containerName} --format '{{json .}}'`
      );

      const info = JSON.parse(stdout);

      return {
        id: info.Id,
        name: info.Name,
        image: info.Config.Image,
        status: info.State.Status,
        health: info.State.Health?.Status,
        created: info.Created,
        ports: Object.keys(info.NetworkSettings?.Ports || {}),
      };
    } catch (error) {
      console.error('Failed to get container info:', error);
      return null;
    }
  }

  async getContainerMetrics(): Promise<ContainerMetrics | null> {
    try {
      const { stdout } = await execAsync(
        `docker stats ${this.containerName} --no-stream --format '{{json .}}'`
      );

      const stats = JSON.parse(stdout);

      // Parse CPU percentage (e.g., "5.23%")
      const cpuPercent = parseFloat(stats.CPUPerc.replace('%', ''));

      // Parse memory (e.g., "123.4MiB / 2GiB")
      const memMatch = stats.MemUsage.match(/([0-9.]+)([A-Z]+)i?B?\s*\/\s*([0-9.]+)([A-Z]+)i?B?/);
      const memUsage = memMatch ? this.toMB(parseFloat(memMatch[1]), memMatch[2]) : 0;
      const memLimit = memMatch ? this.toMB(parseFloat(memMatch[3]), memMatch[4]) : 0;

      // Parse network (e.g., "1.23MB / 4.56MB")
      const netMatch = stats.NetIO.match(/([0-9.]+)([A-Z]+)B?\s*\/\s*([0-9.]+)([A-Z]+)B?/);
      const netRx = netMatch ? this.toMB(parseFloat(netMatch[1]), netMatch[2]) : 0;
      const netTx = netMatch ? this.toMB(parseFloat(netMatch[3]), netMatch[4]) : 0;

      return {
        cpu_percent: cpuPercent,
        memory_usage_mb: memUsage,
        memory_limit_mb: memLimit,
        network_rx_mb: netRx,
        network_tx_mb: netTx,
      };
    } catch (error) {
      console.error('Failed to get container metrics:', error);
      return null;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const info = await this.getContainerInfo();
      return info?.status === 'running' && (!info.health || info.health === 'healthy');
    } catch (error) {
      return false;
    }
  }

  /**
   * UTILITY OPERATIONS
   */

  async getLogs(lines: number = 100, since?: string): Promise<string[]> {
    try {
      const sinceArg = since ? `--since ${since}` : '';
      const { stdout } = await execAsync(
        `docker logs ${this.containerName} --tail ${lines} ${sinceArg}`
      );

      return stdout.split('\n').filter((line) => line.trim());
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }

  /**
   * PRIVATE HELPERS
   */

  private async waitForHealthy(timeoutSeconds: number, containerName?: string): Promise<boolean> {
    const name = containerName || this.containerName;
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const { stdout } = await execAsync(
          `docker inspect ${name} --format '{{.State.Status}}'`
        );

        if (stdout.trim() === 'running') {
          // Additional check: wait 2 seconds for n8n to initialize
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return true;
        }
      } catch (error) {
        // Container not found yet, wait
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return false;
  }

  private toMB(value: number, unit: string): number {
    const units: Record<string, number> = {
      B: 1 / 1024 / 1024,
      K: 1 / 1024,
      M: 1,
      G: 1024,
      T: 1024 * 1024,
    };

    return value * (units[unit.toUpperCase()] || 1);
  }
}
