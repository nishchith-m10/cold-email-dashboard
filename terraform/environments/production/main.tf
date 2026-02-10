# ============================================
# GENESIS PRODUCTION ENVIRONMENT
# ============================================
#
# Production infrastructure for Genesis Dashboard.
# Provisions: Dashboard droplet, Redis cluster, Load balancer, DNS.

terraform {
  required_version = ">= 1.6.0"
  
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
  
  # Backend configuration for state storage
  # Uncomment and configure after setting up Terraform Cloud
  # backend "remote" {
  #   organization = "your-org"
  #   workspaces {
  #     name = "genesis-production"
  #   }
  # }
}

# ============================================
# PROVIDER
# ============================================

provider "digitalocean" {
  token = var.do_token
}

# ============================================
# LOCAL VARIABLES
# ============================================

locals {
  environment = "production"
  common_tags = ["genesis", "production", "dashboard"]
}

# ============================================
# DASHBOARD DROPLET
# ============================================

module "dashboard" {
  source = "../../modules/dashboard_droplet"
  
  droplet_name       = "genesis-dashboard-prod"
  environment        = local.environment
  region             = var.primary_region
  droplet_size       = var.dashboard_size
  image_slug         = "ubuntu-22-04-x64"
  ssh_key_ids        = var.ssh_key_ids
  monitoring_enabled = true
  backups_enabled    = true
  
  # Firewall configuration
  create_firewall  = true
  ssh_allowed_ips  = var.admin_ips
  app_port         = "3000"
  loadbalancer_ips = [module.loadbalancer.ip_address]
  
  # Reserved IP for stability
  use_reserved_ip = true
  
  # Production safety
  prevent_destroy = true
  
  additional_tags = ["critical"]
}

# ============================================
# REDIS CLUSTER
# ============================================

module "redis" {
  source = "../../modules/redis_cluster"
  
  cluster_name  = "genesis-redis-prod"
  environment   = local.environment
  region        = var.primary_region
  redis_version = "7"
  cluster_size  = var.redis_size
  node_count    = var.redis_nodes
  
  # Maintenance during off-peak hours (Sunday 2 AM)
  maintenance_day  = "sunday"
  maintenance_hour = "02:00"
  
  # Eviction policy for cache
  eviction_policy = "allkeys_lru"
  
  # Firewall: only dashboard droplet can connect
  trusted_source_droplet_ids = [module.dashboard.droplet_id]
  trusted_source_ips         = var.admin_ips
  
  # Connection pool for BullMQ
  create_connection_pool = true
  pool_size              = 20
  
  # Dedicated user
  create_dedicated_user = true
  user_name             = "genesis_app"
  
  # Production safety
  prevent_destroy = true
}

# ============================================
# LOAD BALANCER
# ============================================

module "loadbalancer" {
  source = "../../modules/loadbalancer"
  
  lb_name     = "genesis-lb-prod"
  environment = local.environment
  region      = var.primary_region
  size_unit   = var.lb_size
  algorithm   = "least_connections"
  
  # HTTPS termination at LB, HTTP to backend
  forwarding_rules = [
    {
      entry_port       = 443
      entry_protocol   = "https"
      target_port      = 3000
      target_protocol  = "http"
      certificate_name = var.ssl_certificate_name
    },
    {
      entry_port      = 80
      entry_protocol  = "http"
      target_port     = 3000
      target_protocol = "http"
    }
  ]
  
  # Health check endpoint
  health_check = {
    port                     = 3000
    protocol                 = "http"
    path                     = "/api/health"
    check_interval_seconds   = 10
    response_timeout_seconds = 5
    unhealthy_threshold      = 3
    healthy_threshold        = 2
  }
  
  # Attach dashboard droplet
  droplet_ids = [module.dashboard.droplet_id]
  
  # Redirect HTTP → HTTPS
  redirect_http_to_https = true
  
  # Session affinity (for websockets if needed)
  sticky_sessions_enabled   = false
  
  # Production safety
  prevent_destroy = true
}

# ============================================
# DNS RECORDS
# ============================================

module "dns" {
  source = "../../modules/dns"
  
  domain = var.domain
  
  dns_records = [
    {
      name     = "@"  # Apex
      type     = "A"
      value    = module.loadbalancer.ip_address
      ttl      = 300
      priority = null
    },
    {
      name     = "www"
      type     = "CNAME"
      value    = "${var.domain}."
      ttl      = 300
      priority = null
    },
    {
      name     = "api"
      type     = "A"
      value    = module.loadbalancer.ip_address
      ttl      = 300
      priority = null
    }
  ]
  
  # Wildcard for tenant subdomains (if needed)
  create_wildcard     = var.create_wildcard_dns
  wildcard_target_ip  = module.loadbalancer.ip_address
  wildcard_ttl        = 300
}
