# ============================================
# LOAD BALANCER MODULE OUTPUTS
# ============================================

output "lb_id" {
  description = "Load balancer ID"
  value       = digitalocean_loadbalancer.dashboard.id
}

output "lb_name" {
  description = "Load balancer name"
  value       = digitalocean_loadbalancer.dashboard.name
}

output "ip_address" {
  description = "Load balancer IP address"
  value       = digitalocean_loadbalancer.dashboard.ip
}

output "status" {
  description = "Load balancer status"
  value       = digitalocean_loadbalancer.dashboard.status
}

output "algorithm" {
  description = "Load balancing algorithm"
  value       = digitalocean_loadbalancer.dashboard.algorithm
}

output "droplet_count" {
  description = "Number of droplets attached"
  value       = length(digitalocean_loadbalancer.dashboard.droplet_ids)
}

output "forwarding_rules" {
  description = "Active forwarding rules"
  value       = digitalocean_loadbalancer.dashboard.forwarding_rule
}
