# ============================================
# GENESIS REDIS CLUSTER MODULE
# ============================================
#
# Creates a managed Redis cluster for BullMQ (job queue) and
# application caching. NOT for tenant-specific data.

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

# ============================================
# REDIS CLUSTER
# ============================================

resource "digitalocean_database_cluster" "redis" {
  name       = var.cluster_name
  engine     = "redis"
  version    = var.redis_version
  size       = var.cluster_size
  region     = var.region
  node_count = var.node_count

  # Maintenance window (off-peak hours)
  maintenance_window {
    day  = var.maintenance_day
    hour = var.maintenance_hour
  }

  # Eviction policy for cache behavior
  eviction_policy = var.eviction_policy

  # Tags
  tags = concat(
    ["genesis", "redis", var.environment],
    var.additional_tags
  )

  # Lifecycle
  lifecycle {
    prevent_destroy = var.prevent_destroy
    
    # Prevent downtime during resize
    create_before_destroy = true
    
    # Ignore minor version changes (auto-applied by DO)
    ignore_changes = [version]
  }
}

# ============================================
# REDIS FIREWALL RULES
# ============================================

resource "digitalocean_database_firewall" "redis" {
  cluster_id = digitalocean_database_cluster.redis.id

  # Allow access from dashboard droplets
  dynamic "rule" {
    for_each = var.trusted_source_droplet_ids
    content {
      type  = "droplet"
      value = rule.value
    }
  }

  # Allow access from specific IP ranges (e.g., corporate VPN)
  dynamic "rule" {
    for_each = var.trusted_source_ips
    content {
      type  = "ip_addr"
      value = rule.value
    }
  }
}

# ============================================
# CONNECTION POOL (Optional)
# ============================================

resource "digitalocean_database_connection_pool" "redis_pool" {
  count      = var.create_connection_pool ? 1 : 0
  cluster_id = digitalocean_database_cluster.redis.id
  name       = "${var.cluster_name}-pool"
  mode       = "transaction"
  size       = var.pool_size
  db_name    = var.db_name
  user       = digitalocean_database_user.redis_user[0].name
}

# ============================================
# DEDICATED USER (Optional)
# ============================================

resource "digitalocean_database_user" "redis_user" {
  count      = var.create_dedicated_user ? 1 : 0
  cluster_id = digitalocean_database_cluster.redis.id
  name       = var.user_name
}
