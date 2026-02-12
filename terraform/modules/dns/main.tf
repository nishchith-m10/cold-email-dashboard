# ============================================
# GENESIS DNS RECORDS MODULE
# ============================================
#
# Manages DNS records for the Dashboard. Supports A, AAAA, CNAME, MX, TXT.

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
# DNS DOMAIN (assumes domain already exists)
# ============================================

data "digitalocean_domain" "main" {
  name = var.domain
}

# ============================================
# DNS RECORDS
# ============================================

resource "digitalocean_record" "dashboard" {
  for_each = { for record in var.dns_records : record.name => record }
  
  domain = data.digitalocean_domain.main.name
  type   = each.value.type
  name   = each.value.name
  value  = each.value.value
  ttl    = each.value.ttl
  
  # Priority for MX records only
  priority = each.value.type == "MX" ? each.value.priority : null
  
  # Weight for SRV records
  weight = each.value.type == "SRV" ? lookup(each.value, "weight", null) : null
  port   = each.value.type == "SRV" ? lookup(each.value, "port", null) : null
}

# ============================================
# WILDCARD RECORD (Optional)
# ============================================

resource "digitalocean_record" "wildcard" {
  count = var.create_wildcard ? 1 : 0
  
  domain = data.digitalocean_domain.main.name
  type   = "A"
  name   = "*"
  value  = var.wildcard_target_ip
  ttl    = var.wildcard_ttl
}
