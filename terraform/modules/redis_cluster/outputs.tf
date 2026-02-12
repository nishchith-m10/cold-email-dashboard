# ============================================
# REDIS CLUSTER MODULE OUTPUTS
# ============================================

output "cluster_id" {
  description = "ID of the Redis cluster"
  value       = digitalocean_database_cluster.redis.id
}

output "cluster_name" {
  description = "Name of the Redis cluster"
  value       = digitalocean_database_cluster.redis.name
}

output "host" {
  description = "Redis host address"
  value       = digitalocean_database_cluster.redis.host
  sensitive   = true
}

output "port" {
  description = "Redis port"
  value       = digitalocean_database_cluster.redis.port
}

output "uri" {
  description = "Redis connection URI"
  value       = digitalocean_database_cluster.redis.uri
  sensitive   = true
}

output "private_uri" {
  description = "Private network Redis connection URI"
  value       = digitalocean_database_cluster.redis.private_uri
  sensitive   = true
}

output "password" {
  description = "Redis password (default user)"
  value       = digitalocean_database_cluster.redis.password
  sensitive   = true
}

output "status" {
  description = "Cluster status"
  value       = digitalocean_database_cluster.redis.status
}

output "engine_version" {
  description = "Redis engine version"
  value       = digitalocean_database_cluster.redis.engine
}

output "node_count" {
  description = "Number of cluster nodes"
  value       = digitalocean_database_cluster.redis.node_count
}

output "region" {
  description = "Cluster region"
  value       = digitalocean_database_cluster.redis.region
}

output "database_name" {
  description = "Default database name"
  value       = digitalocean_database_cluster.redis.database
}

output "connection_pool_uri" {
  description = "Connection pool URI (if created)"
  value       = var.create_connection_pool ? digitalocean_database_connection_pool.redis_pool[0].uri : null
  sensitive   = true
}

output "dedicated_user_name" {
  description = "Dedicated user name (if created)"
  value       = var.create_dedicated_user ? digitalocean_database_user.redis_user[0].name : null
}

output "dedicated_user_password" {
  description = "Dedicated user password (if created)"
  value       = var.create_dedicated_user ? digitalocean_database_user.redis_user[0].password : null
  sensitive   = true
}
