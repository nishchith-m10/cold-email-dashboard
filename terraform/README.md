# Genesis Dashboard Infrastructure as Code

Terraform configurations for provisioning Genesis Dashboard infrastructure (NOT tenant droplets).

## Structure

```
terraform/
├── modules/              # Reusable Terraform modules
│   ├── dashboard_droplet/   # Dashboard Next.js app droplet
│   ├── redis_cluster/       # BullMQ Redis cluster
│   ├── loadbalancer/        # HA load balancer
│   └── dns/                 # DNS records
└── environments/         # Environment-specific configs
    ├── staging/
    └── production/
```

## What This Manages

✅ **Dashboard droplet** - Next.js control plane application  
✅ **Redis cluster** - BullMQ job queue and caching  
✅ **Load balancer** - Optional HA setup  
✅ **DNS records** - Domain configuration  

❌ **Tenant droplets** - Managed by Ignition Orchestrator (Phase 41)

## Usage

### 1. Initialize Terraform

```bash
cd terraform/environments/production
terraform init
```

### 2. Create `terraform.tfvars`

```hcl
do_token              = "dop_v1_xxx"
domain                = "genesis-platform.com"
ssl_certificate_name  = "genesis-prod-cert"
ssh_key_ids           = ["12345678"]
admin_ips             = ["203.0.113.0/24"]
```

### 3. Plan Changes

```bash
terraform plan -out=plan.tfplan
```

### 4. Apply

```bash
terraform apply plan.tfplan
```

### 5. Get Outputs

```bash
terraform output redis_uri
```

## State Management

### Local State (Development)

State is stored locally in `terraform.tfstate`. **Do not commit this file to git.**

⚠️ **CRITICAL SECURITY WARNING**: State files contain sensitive data (passwords, API tokens, connection strings). Always encrypt and secure your state files.

### Remote State (Production)

For production, use Terraform Cloud or encrypted S3 backend:

#### Option 1: Terraform Cloud (Recommended)

1. Create organization at https://app.terraform.io
2. Create workspace `genesis-production`
3. Uncomment `backend "remote"` block in `main.tf`
4. Run `terraform init -migrate-state`

**Benefits:**
- ✅ State encrypted at rest and in transit
- ✅ Built-in state locking (prevents concurrent applies)
- ✅ Team collaboration with RBAC
- ✅ State versioning and rollback
- ✅ Free for small teams (<5 users)

#### Option 2: AWS S3 + DynamoDB (Self-hosted)

```hcl
terraform {
  backend "s3" {
    bucket         = "genesis-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "genesis-terraform-locks"
  }
}
```

**Setup:**
1. Create S3 bucket with versioning enabled
2. Enable server-side encryption (SSE-S3 or SSE-KMS)
3. Create DynamoDB table for state locking
4. Configure IAM permissions
5. Run `terraform init -migrate-state`

### State File Encryption (Local Development)

If you must use local state, encrypt it:

```bash
# Encrypt state file
gpg -c terraform.tfstate

# Decrypt when needed
gpg terraform.tfstate.gpg

# Add to .gitignore
echo "terraform.tfstate*" >> .gitignore
```

### State Backup Strategy

Terraform Cloud and S3 backends automatically version state. For local state:

```bash
# Manual backup before major changes
cp terraform.tfstate terraform.tfstate.backup-$(date +%Y%m%d-%H%M%S)
```

## Safety Features

- **prevent_destroy** enabled on critical resources
- **create_before_destroy** for zero-downtime changes
- **Firewall rules** restrict access to known IPs
- **Sensitive outputs** marked for secure handling

## Disaster Recovery

To recreate infrastructure from scratch:

```bash
cd terraform/environments/production
terraform apply
```

All resources will be provisioned per the configuration. Use state backups if needed.

## Validation

Use the TypeScript utilities to validate infrastructure health:

```typescript
import { TerraformStateManager, InfrastructureValidator } from '@/lib/genesis/phase70b';

const stateManager = new TerraformStateManager('./terraform/environments/production/terraform.tfstate');
const validator = new InfrastructureValidator(stateManager);

const report = await validator.generateReport('production');
console.log(`Infrastructure health: ${report.overallStatus}`);
```

## Important Notes

1. **Do NOT use Terraform for tenant droplets** - Those are managed dynamically by the application
2. **SSH access** requires your IP to be in `admin_ips` variable
3. **Redis firewall** only allows connections from Dashboard droplet
4. **Load balancer** is optional for smaller deployments

## Cost Estimate (Monthly)

| Component | Production | Staging |
|-----------|-----------|---------|
| Dashboard Droplet | $48 (4vCPU/8GB) | $24 (2vCPU/4GB) |
| Redis Cluster | $120 (4vCPU/8GB, 2 nodes) | $30 (1vCPU/1GB) |
| Load Balancer | $12 (medium) | $12 (small) |
| **Total** | **~$180/month** | **~$66/month** |

*Prices approximate as of 2024. Check DigitalOcean pricing for current rates.*

## Support

For issues or questions:
- Review Terraform docs: https://registry.terraform.io/providers/digitalocean/digitalocean/latest/docs
- Check Genesis plan: `docs/plans/GENESIS_SINGULARITY_PLAN_V35.md` (Phase 70.B)
