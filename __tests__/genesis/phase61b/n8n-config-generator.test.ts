/**
 * GENESIS PART VI - PHASE 60.D: N8N AUTHENTICATION & ACCESS CONTROL
 * Configuration Generator Tests
 */

import { N8nConfigGenerator } from '@/lib/genesis/phase61b/n8n-config-generator';

describe('N8nConfigGenerator', () => {
  const mockN8nHost = '1-2-3-4.sslip.io';
  const mockEncryptionKey = 'a'.repeat(64);
  const mockJwtSecret = 'b'.repeat(64);
  const mockSmtpConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    user: 'alerts@example.com',
    pass: 'smtp_password',
    sender: 'Genesis <alerts@example.com>',
  };

  describe('generateEnvironmentConfig', () => {
    it('should generate config without SMTP', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret
      );

      expect(config.n8n_host).toBe(mockN8nHost);
      expect(config.n8n_encryption_key).toBe(mockEncryptionKey);
      expect(config.n8n_jwt_secret).toBe(mockJwtSecret);
      expect(config.smtp_host).toBeUndefined();
    });

    it('should generate config with SMTP', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret,
        mockSmtpConfig
      );

      expect(config.smtp_host).toBe(mockSmtpConfig.host);
      expect(config.smtp_port).toBe(mockSmtpConfig.port);
      expect(config.smtp_user).toBe(mockSmtpConfig.user);
      expect(config.smtp_pass).toBe(mockSmtpConfig.pass);
      expect(config.smtp_sender).toBe(mockSmtpConfig.sender);
    });
  });

  describe('generateDockerComposeEnvironment', () => {
    it('should generate environment array without SMTP', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret
      );

      const env = N8nConfigGenerator.generateDockerComposeEnvironment(config);

      expect(env).toContain(`N8N_HOST=${mockN8nHost}`);
      expect(env).toContain(`N8N_ENCRYPTION_KEY=${mockEncryptionKey}`);
      expect(env).toContain(`N8N_USER_MANAGEMENT_DISABLED=false`);
      expect(env).toContain(`N8N_USER_MANAGEMENT_JWT_SECRET=${mockJwtSecret}`);
      expect(env.some(e => e.includes('SMTP'))).toBe(false);
    });

    it('should generate environment array with SMTP', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret,
        mockSmtpConfig
      );

      const env = N8nConfigGenerator.generateDockerComposeEnvironment(config);

      expect(env).toContain('N8N_EMAIL_MODE=smtp');
      expect(env).toContain(`N8N_SMTP_HOST=${mockSmtpConfig.host}`);
      expect(env).toContain(`N8N_SMTP_PORT=${mockSmtpConfig.port}`);
      expect(env).toContain(`N8N_SMTP_USER=${mockSmtpConfig.user}`);
      expect(env).toContain(`N8N_SMTP_PASS=${mockSmtpConfig.pass}`);
      expect(env).toContain(`N8N_SMTP_SENDER=${mockSmtpConfig.sender}`);
    });

    it('should include all required n8n variables', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret
      );

      const env = N8nConfigGenerator.generateDockerComposeEnvironment(config);

      expect(env.some(e => e.startsWith('N8N_HOST='))).toBe(true);
      expect(env.some(e => e.startsWith('N8N_ENCRYPTION_KEY='))).toBe(true);
      expect(env.some(e => e.includes('N8N_USER_MANAGEMENT'))).toBe(true);
    });
  });

  describe('generateDockerCompose', () => {
    it('should generate valid docker-compose YAML', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret
      );

      const yaml = N8nConfigGenerator.generateDockerCompose(config);

      expect(yaml).toContain('version: \'3.8\'');
      expect(yaml).toContain('services:');
      expect(yaml).toContain('n8n:');
      expect(yaml).toContain('image: n8nio/n8n:latest');
      expect(yaml).toContain('volumes:');
      expect(yaml).toContain('networks:');
    });

    it('should include all environment variables', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret
      );

      const yaml = N8nConfigGenerator.generateDockerCompose(config);

      expect(yaml).toContain(`N8N_HOST=${mockN8nHost}`);
      expect(yaml).toContain(`N8N_ENCRYPTION_KEY=${mockEncryptionKey}`);
      expect(yaml).toContain('N8N_USER_MANAGEMENT_DISABLED=false');
    });

    it('should include SMTP config when provided', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret,
        mockSmtpConfig
      );

      const yaml = N8nConfigGenerator.generateDockerCompose(config);

      expect(yaml).toContain('N8N_EMAIL_MODE=smtp');
      expect(yaml).toContain(`N8N_SMTP_HOST=${mockSmtpConfig.host}`);
    });

    it('should expose port 5678', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret
      );

      const yaml = N8nConfigGenerator.generateDockerCompose(config);

      expect(yaml).toContain('5678:5678');
    });

    it('should use restart policy', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret
      );

      const yaml = N8nConfigGenerator.generateDockerCompose(config);

      expect(yaml).toContain('restart: unless-stopped');
    });
  });

  describe('generateEnvFile', () => {
    it('should generate .env file content', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret
      );

      const envFile = N8nConfigGenerator.generateEnvFile(config);

      expect(envFile).toContain('# n8n Configuration');
      expect(envFile).toContain(`N8N_HOST=${mockN8nHost}`);
      expect(envFile).toContain(`N8N_ENCRYPTION_KEY=${mockEncryptionKey}`);
      expect(envFile).toContain(`N8N_JWT_SECRET=${mockJwtSecret}`);
    });

    it('should include SMTP config when provided', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret,
        mockSmtpConfig
      );

      const envFile = N8nConfigGenerator.generateEnvFile(config);

      expect(envFile).toContain('# SMTP Configuration');
      expect(envFile).toContain(`SMTP_HOST=${mockSmtpConfig.host}`);
      expect(envFile).toContain(`SMTP_PORT=${mockSmtpConfig.port}`);
    });

    it('should end with newline', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret
      );

      const envFile = N8nConfigGenerator.generateEnvFile(config);

      expect(envFile.endsWith('\n')).toBe(true);
    });

    it('should use KEY=VALUE format', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret
      );

      const envFile = N8nConfigGenerator.generateEnvFile(config);
      const lines = envFile.split('\n').filter(l => l && !l.startsWith('#'));

      lines.forEach(line => {
        // Check that each line has format KEY=value where KEY is uppercase with underscores and numbers
        expect(line).toMatch(/^[A-Z_0-9]+=.+/);
      });
    });
  });

  describe('validateConfig', () => {
    it('should validate correct config', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret
      );

      const validation = N8nConfigGenerator.validateConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject missing n8n_host', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        '',
        mockEncryptionKey,
        mockJwtSecret
      );

      const validation = N8nConfigGenerator.validateConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('n8n_host is required');
    });

    it('should reject short encryption key', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        'short',
        mockJwtSecret
      );

      const validation = N8nConfigGenerator.validateConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('encryption_key'))).toBe(true);
    });

    it('should reject short JWT secret', () => {
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        'short'
      );

      const validation = N8nConfigGenerator.validateConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('jwt_secret'))).toBe(true);
    });

    it('should reject invalid SMTP port', () => {
      const invalidSmtp = { ...mockSmtpConfig, port: 99999 };
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret,
        invalidSmtp
      );

      const validation = N8nConfigGenerator.validateConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid SMTP port');
    });

    it('should reject SMTP config without user', () => {
      const invalidSmtp = { ...mockSmtpConfig, user: '' };
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret,
        invalidSmtp
      );

      const validation = N8nConfigGenerator.validateConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('SMTP user'))).toBe(true);
    });

    it('should reject SMTP config without password', () => {
      const invalidSmtp = { ...mockSmtpConfig, pass: '' };
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret,
        invalidSmtp
      );

      const validation = N8nConfigGenerator.validateConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('SMTP password'))).toBe(true);
    });

    it('should reject SMTP config without sender', () => {
      const invalidSmtp = { ...mockSmtpConfig, sender: '' };
      const config = N8nConfigGenerator.generateEnvironmentConfig(
        mockN8nHost,
        mockEncryptionKey,
        mockJwtSecret,
        invalidSmtp
      );

      const validation = N8nConfigGenerator.validateConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('SMTP sender'))).toBe(true);
    });

    it('should accumulate multiple errors', () => {
      const config = {
        n8n_host: '',
        n8n_encryption_key: 'short',
        n8n_jwt_secret: 'short',
      };

      const validation = N8nConfigGenerator.validateConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(1);
    });

    it('should validate SMTP port range', () => {
      const validPorts = [25, 587, 465, 2525];
      
      validPorts.forEach(port => {
        const config = N8nConfigGenerator.generateEnvironmentConfig(
          mockN8nHost,
          mockEncryptionKey,
          mockJwtSecret,
          { ...mockSmtpConfig, port }
        );

        const validation = N8nConfigGenerator.validateConfig(config);
        expect(validation.valid).toBe(true);
      });
    });
  });
});
