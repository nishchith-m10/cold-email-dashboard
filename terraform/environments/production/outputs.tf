# ============================================
# PRODUCTION ENVIRONMENT OUTPUTS
# ============================================

# ============================================
# DASHBOARD
# ============================================

output "dashboard_ip" {
  description = "Dashboard droplet IP address"
  value       = module.dashboard.ipv4_address
}

output "dashboard_id" {
  description = "Dashboard droplet ID"
  value       = module.dashboard.droplet_id
}

output "dashboard_reserved_ip" {
  description = "Dashboard reserved IP (if enabled)"
  value       = module.dashboard.reserved_ip
}

# ============================================
# REDIS
# ============================================

output "redis_uri" {
  description = "Redis connection URI (sensitive)"
  value       = module.redis.uri
  sensitive   = true
}

output "redis_host" {
  description = "Redis host"
  value       = module.redis.host
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = module.redis.port
}

output "redis_password" {
  description = "Redis password"
  value       = module.redis.password
  sensitive   = true
}

output "redis_connection_pool_uri" {
  description = "Redis connection pool URI"
  value       = module.redis.connection_pool_uri
  sensitive   = true
}

output "redis_dedicated_user" {
  description = "Redis dedicated user name"
  value       = module.redis.dedicated_user_name
}

output "redis_dedicated_password" {
  description = "Redis dedicated user password"
  value       = module.redis.dedicated_user_password
  sensitive   = true
}

# ============================================
# LOAD BALANCER
# ============================================

output "lb_ip" {
  description = "Load balancer IP address"
  value       = module.loadbalancer.ip_address
}

output "lb_id" {
  description = "Load balancer ID"
  value       = module.loadbalancer.lb_id
}

output "lb_status" {
  description = "Load balancer status"
  value       = module.loadbalancer.status
}

# ============================================
# DNS
# ============================================

output "dns_records" {
  description = "Created DNS records"
  value       = module.dns.dns_records
}

output "domain" {
  description = "Domain name"
  value       = module.dns.domain
}

# ============================================
# DEPLOYMENT INFO
# ============================================

output "deployment_timestamp" {
  description = "Timestamp of this deployment"
  value       = timestamp()
}

output "environment" {
  description = "Environment name"
  value       = "production"
}
