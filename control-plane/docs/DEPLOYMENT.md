# Genesis Control Plane — Deployment Guide

## Overview

The Genesis Control Plane is a 24/7 Node.js service that runs alongside the Vercel-hosted Next.js application. It handles long-running tasks that can't execute within Vercel's serverless function limits:

- **BullMQ Workers**: Process workflow updates, sidecar updates, wake requests, credential injections
- **Watchdog Service**: Monitors Sidecar agent health (every 60s)
- **Scale Alerts**: Monitors database metrics (every 15 min)
- **Heartbeat Processor**: Ingests heartbeat pings from up to 15,000 agents

---

## Stage Migration Playbooks

### Stage 1: MVP (Vercel-Only)

**Tenants:** 0–100  
**Platform:** Vercel only  
**Control Plane:** Not deployed  

At this stage, the Control Plane code exists but is not deployed. All operations run through Vercel API routes and cron jobs. The admin dashboard shows "Control Plane not deployed (Stage 1)".

**What works without the Control Plane:**
- Dashboard, sequences, contacts, settings
- Cron-based health checks
- Email event ingestion
- Basic Sidecar management via API routes

**What requires the Control Plane (deferred):**
- BullMQ job queues (workflow updates, credential injection)
- Real-time watchdog monitoring
- Heartbeat ingestion at scale
- Blue-green sidecar deployments

---

### Stage 2: Growth (Vercel + Railway)

**Tenants:** 100–1,000  
**Platform:** Vercel + Railway  
**Migration time:** 3–4 days  
**Downtime:** 0 seconds

#### Migration Steps:

1. **Provision Redis** (Upstash or Railway Redis)
   ```bash
   # Railway
   railway add redis
   # or Upstash (recommended)
   # Create at upstash.com → Copy REDIS_URL
   ```

2. **Deploy Control Plane to Railway**
   ```bash
   cd control-plane
   railway init
   railway link
   
   # Set environment variables
   railway variables set DATABASE_URL=...
   railway variables set SUPABASE_URL=...
   railway variables set SUPABASE_SERVICE_ROLE_KEY=...
   railway variables set REDIS_URL=...
   railway variables set DIGITALOCEAN_API_TOKEN=...
   
   # Deploy
   railway up
   ```

3. **Verify Health**
   ```bash
   curl https://your-control-plane.railway.app/health
   ```

4. **Set CONTROL_PLANE_URL in Vercel**
   ```bash
   vercel env add CONTROL_PLANE_URL https://your-control-plane.railway.app
   vercel --prod
   ```

5. **Verify Admin Dashboard** shows Control Plane status as "healthy"

#### Cost:
- Railway: ~$5–20/month (Hobby → Pro)
- Redis (Upstash): ~$0–10/month (pay per request)

---

### Stage 3: Scale (Vercel + AWS ECS)

**Tenants:** 1,000–5,000  
**Platform:** Vercel + AWS ECS  
**Migration time:** 2–3 weeks  
**Downtime:** 0 seconds

#### Prerequisites:
- AWS account with ECS, ECR, VPC configured
- AWS CLI installed and configured
- Railway still running (kept as fallback)

#### Migration Steps:

1. **Push Docker Image to ECR**
   ```bash
   aws ecr create-repository --repository-name genesis-control-plane
   
   docker build -t genesis-control-plane ./control-plane
   docker tag genesis-control-plane:latest <account>.dkr.ecr.<region>.amazonaws.com/genesis-control-plane:latest
   docker push <account>.dkr.ecr.<region>.amazonaws.com/genesis-control-plane:latest
   ```

2. **Create ECS Task Definition**
   - CPU: 512 (0.5 vCPU)
   - Memory: 1024 MB
   - Health check: `GET /health`
   - Environment variables: same as Railway

3. **Create ECS Service**
   - Desired count: 1 (scale to 2+ later)
   - Load balancer: ALB with health check path `/health`
   - Auto-scaling: based on CPU + queue depth

4. **Run Pre-Flight Tests** (see MIGRATION_CHECKLIST.md)

5. **Point CONTROL_PLANE_URL to ECS ALB**
   ```bash
   vercel env rm CONTROL_PLANE_URL
   vercel env add CONTROL_PLANE_URL https://control-plane.yourcdomain.com
   vercel --prod
   ```

6. **Keep Railway as Fallback** for 7 days

7. **Monitor** error rates, job processing times, health check results

8. **Decommission Railway** after 7 days stable

#### Cost:
- ECS Fargate: ~$30–100/month (depending on CPU/memory)
- ElastiCache Redis: ~$15–50/month
- ALB: ~$20/month

---

### Stage 4: Hyper-Scale (Full AWS/K8s)

**Tenants:** 5,000–15,000  
**Platform:** Full AWS + Kubernetes  
**Migration time:** 2–4 weeks  
**Downtime:** 0 seconds

#### Key Changes:
- Deploy to EKS (Kubernetes) instead of ECS
- Use Horizontal Pod Autoscaler (HPA)
- Add Prometheus + Grafana monitoring
- Add PagerDuty alerting integration
- Consider dedicated Redis cluster (ElastiCache Cluster Mode)

#### Kubernetes Manifests (simplified):
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: genesis-control-plane
spec:
  replicas: 3
  selector:
    matchLabels:
      app: genesis-control-plane
  template:
    metadata:
      labels:
        app: genesis-control-plane
    spec:
      containers:
      - name: control-plane
        image: <ecr-url>/genesis-control-plane:latest
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: genesis-control-plane-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            cpu: 256m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
```

---

## Emergency Rollback Protocol

If a migration goes wrong at any stage:

1. **T+0:** Detect issue (error rate >1% or health check failing)
2. **T+1:** Stop new platform workers
   - Railway: `railway down`
   - ECS: `aws ecs update-service --desired-count 0`
   - K8s: `kubectl scale deployment genesis-control-plane --replicas=0`
3. **T+2:** Restart old platform workers
4. **T+3:** Old platform processes backlog from Redis (jobs are persistent)
5. **T+5:** System stable, investigation begins

**TOTAL ROLLBACK TIME: 5 minutes**  
**DATA LOSS: 0** (all jobs are in Redis queue)

**CRITICAL:** Always keep the old platform running for 7 days after migration. Don't decommission until the new platform is proven stable.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────┐
│                   VERCEL LAYER                     │
│  ┌────────────┐  ┌──────────┐  ┌───────────────┐ │
│  │  Next.js   │  │   API    │  │  Cron Jobs    │ │
│  │  Frontend  │  │  Routes  │  │  (Vercel)     │ │
│  └────────────┘  └────┬─────┘  └───────────────┘ │
│                       │                            │
└───────────────────────┼────────────────────────────┘
                        │ CONTROL_PLANE_URL
                        ▼
┌──────────────────────────────────────────────────┐
│              CONTROL PLANE (Railway/ECS/K8s)       │
│  ┌──────────────────────────────────────────────┐ │
│  │                Express Health (/health)       │ │
│  ├──────────────────────────────────────────────┤ │
│  │  BullMQ Workers        │  Background Services│ │
│  │  ├─ workflow-update     │  ├─ Watchdog       │ │
│  │  ├─ sidecar-update      │  ├─ Scale Alerts   │ │
│  │  ├─ wake-droplet        │  └─ Heartbeat Proc │ │
│  │  ├─ credential-inject   │                    │ │
│  │  └─ hard-reboot         │                    │ │
│  └──────────────────────────────────────────────┘ │
└───────────────┬──────────────────┬────────────────┘
                │                  │
        ┌───────▼──────┐   ┌──────▼──────┐
        │    Redis     │   │  Supabase   │
        │   (BullMQ)   │   │  (Postgres) │
        └──────────────┘   └─────────────┘
```

---

## Monitoring

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Health check | `/health` endpoint | `status !== 'healthy'` |
| Worker error rate | BullMQ failed jobs | > 1% of jobs |
| Job queue depth | Redis LLEN | > 1000 pending |
| CPU usage | Platform metrics | > 80% sustained |
| Memory usage | Platform metrics | > 85% |
| Heartbeat latency | Supabase timestamps | > 5 minutes stale |
