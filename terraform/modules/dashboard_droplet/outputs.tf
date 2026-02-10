# ============================================
# DASHBOARD DROPLET MODULE OUTPUTS
# ============================================

output "droplet_id" {
  description = "ID of the created droplet"
  value       = digitalocean_droplet.dashboard.id
}

output "droplet_name" {
  description = "Name of the droplet"
  value       = digitalocean_droplet.dashboard.name
}

output "ipv4_address" {
  description = "Public IPv4 address"
  value       = digitalocean_droplet.dashboard.ipv4_address
}

output "ipv4_address_private" {
  description = "Private IPv4 address"
  value       = digitalocean_droplet.dashboard.ipv4_address_private
}

output "region" {
  description = "Droplet region"
  value       = digitalocean_droplet.dashboard.region
}

output "status" {
  description = "Droplet status"
  value       = digitalocean_droplet.dashboard.status
}

output "size" {
  description = "Droplet size"
  value       = digitalocean_droplet.dashboard.size
}

output "tags" {
  description = "Droplet tags"
  value       = digitalocean_droplet.dashboard.tags
}

output "monitoring_enabled" {
  description = "Whether monitoring is enabled"
  value       = digitalocean_droplet.dashboard.monitoring
}

output "backups_enabled" {
  description = "Whether backups are enabled"
  value       = digitalocean_droplet.dashboard.backups
}

output "reserved_ip" {
  description = "Reserved IP address (if enabled)"
  value       = var.use_reserved_ip ? digitalocean_reserved_ip.dashboard[0].ip_address : null
}

output "firewall_id" {
  description = "Firewall ID (if created)"
  value       = var.create_firewall ? digitalocean_firewall.dashboard[0].id : null
}
