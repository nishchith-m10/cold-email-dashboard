# ============================================
# GENESIS LOAD BALANCER MODULE
# ============================================
#
# Optional load balancer for high-availability Dashboard deployment.

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
# LOAD BALANCER
# ============================================

resource "digitalocean_loadbalancer" "dashboard" {
  name   = var.lb_name
  region = var.region
  size   = var.size_unit

  # Forwarding rules
  dynamic "forwarding_rule" {
    for_each = var.forwarding_rules
    content {
      entry_port      = forwarding_rule.value.entry_port
      entry_protocol  = forwarding_rule.value.entry_protocol
      target_port     = forwarding_rule.value.target_port
      target_protocol = forwarding_rule.value.target_protocol
      
      # Certificate for HTTPS
      certificate_name = forwarding_rule.value.certificate_name
      tls_passthrough  = forwarding_rule.value.tls_passthrough
    }
  }

  # Health check
  healthcheck {
    port                   = var.health_check.port
    protocol               = var.health_check.protocol
    path                   = var.health_check.path
    check_interval_seconds = var.health_check.check_interval_seconds
    response_timeout_seconds = var.health_check.response_timeout_seconds
    unhealthy_threshold    = var.health_check.unhealthy_threshold
    healthy_threshold      = var.health_check.healthy_threshold
  }

  # Sticky sessions (optional)
  dynamic "sticky_sessions" {
    for_each = var.sticky_sessions_enabled ? [1] : []
    content {
      type               = var.sticky_sessions_type
      cookie_name        = var.sticky_sessions_cookie_name
      cookie_ttl_seconds = var.sticky_sessions_cookie_ttl
    }
  }

  # Droplets to balance
  droplet_ids = var.droplet_ids

  # Redirect HTTP to HTTPS (optional)
  redirect_http_to_https = var.redirect_http_to_https

  # Algorithm
  algorithm = var.algorithm

  lifecycle {
    prevent_destroy = var.prevent_destroy
  }
}
