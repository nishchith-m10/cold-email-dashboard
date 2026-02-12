# ============================================
# GENESIS DASHBOARD DROPLET MODULE
# ============================================
#
# Creates a DigitalOcean droplet for the Genesis Dashboard (Next.js app).
# This is the control plane droplet - NOT for tenant workspaces.

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
# DASHBOARD DROPLET
# ============================================

resource "digitalocean_droplet" "dashboard" {
  name   = var.droplet_name
  region = var.region
  size   = var.droplet_size
  image  = var.image_slug

  # Cloud-init configuration for initial setup
  user_data = var.user_data != "" ? var.user_data : file("${path.module}/cloud-init/dashboard.yml")

  # SSH access
  ssh_keys = var.ssh_key_ids

  # Monitoring and backups
  monitoring = var.monitoring_enabled
  backups    = var.backups_enabled

  # Metadata
  tags = concat(
    ["genesis", "dashboard", var.environment],
    var.additional_tags
  )

  # Prevent accidental destruction
  lifecycle {
    prevent_destroy = var.prevent_destroy
    
    # Recreate if critical attributes change
    create_before_destroy = true
    
    # Ignore user_data changes after creation (handled by config management)
    ignore_changes = [user_data]
  }
}

# ============================================
# FIREWALL (Optional)
# ============================================

resource "digitalocean_firewall" "dashboard" {
  count = var.create_firewall ? 1 : 0
  
  name = "${var.droplet_name}-firewall"
  
  droplet_ids = [digitalocean_droplet.dashboard.id]

  # Inbound rules
  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.ssh_allowed_ips
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = var.app_port
    source_addresses = var.loadbalancer_ips
  }

  # Outbound rules
  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

# ============================================
# RESERVED IP (Optional)
# ============================================

resource "digitalocean_reserved_ip" "dashboard" {
  count  = var.use_reserved_ip ? 1 : 0
  region = var.region
}

resource "digitalocean_reserved_ip_assignment" "dashboard" {
  count      = var.use_reserved_ip ? 1 : 0
  ip_address = digitalocean_reserved_ip.dashboard[0].ip_address
  droplet_id = digitalocean_droplet.dashboard.id
}
