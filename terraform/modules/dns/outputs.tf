# ============================================
# DNS MODULE OUTPUTS
# ============================================

output "domain" {
  description = "Domain name"
  value       = data.digitalocean_domain.main.name
}

output "dns_records" {
  description = "Created DNS records"
  value = {
    for name, record in digitalocean_record.dashboard : name => {
      id    = record.id
      fqdn  = record.fqdn
      type  = record.type
      value = record.value
      ttl   = record.ttl
    }
  }
}

output "wildcard_record_id" {
  description = "Wildcard record ID (if created)"
  value       = var.create_wildcard ? digitalocean_record.wildcard[0].id : null
}

output "wildcard_fqdn" {
  description = "Wildcard FQDN (if created)"
  value       = var.create_wildcard ? digitalocean_record.wildcard[0].fqdn : null
}
