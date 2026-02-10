# ============================================
# DASHBOARD DROPLET MODULE VARIABLES
# ============================================

variable "droplet_name" {
  description = "Name of the dashboard droplet"
  type        = string
  
  validation {
    condition     = length(var.droplet_name) > 0 && length(var.droplet_name) <= 255
    error_message = "Droplet name must be between 1 and 255 characters"
  }
}

variable "environment" {
  description = "Environment name (staging, production, development)"
  type        = string
  
  validation {
    condition     = contains(["staging", "production", "development"], var.environment)
    error_message = "Environment must be one of: staging, production, development"
  }
}

variable "region" {
  description = "DigitalOcean region"
  type        = string
  default     = "nyc1"
  
  validation {
    condition = contains([
      "nyc1", "nyc3", "sfo1", "sfo3", "ams3", 
      "sgp1", "lon1", "fra1", "tor1", "blr1"
    ], var.region)
    error_message = "Must be a valid DigitalOcean region"
  }
}

variable "droplet_size" {
  description = "Droplet size (CPU/RAM)"
  type        = string
  default     = "s-2vcpu-4gb"
  
  validation {
    condition = can(regex("^[a-z0-9\\-]+$", var.droplet_size))
    error_message = "Invalid droplet size format"
  }
}

variable "image_slug" {
  description = "DigitalOcean image slug"
  type        = string
  default     = "ubuntu-22-04-x64"
}

variable "user_data" {
  description = "Cloud-init user data (leave empty to use default)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "ssh_key_ids" {
  description = "List of SSH key IDs for access"
  type        = list(string)
  default     = []
}

variable "monitoring_enabled" {
  description = "Enable DigitalOcean monitoring agent"
  type        = bool
  default     = true
}

variable "backups_enabled" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "additional_tags" {
  description = "Additional tags beyond default (genesis, dashboard, environment)"
  type        = list(string)
  default     = []
}

variable "prevent_destroy" {
  description = "Prevent accidental terraform destroy"
  type        = bool
  default     = true
}

variable "create_firewall" {
  description = "Create firewall rules for droplet"
  type        = bool
  default     = true
}

variable "ssh_allowed_ips" {
  description = "CIDR blocks allowed to SSH (empty = deny all SSH)"
  type        = list(string)
  default     = []
}

variable "app_port" {
  description = "Application port (Next.js default: 3000)"
  type        = string
  default     = "3000"
}

variable "loadbalancer_ips" {
  description = "IP addresses of load balancers that can reach app port"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "use_reserved_ip" {
  description = "Allocate and assign a reserved (floating) IP"
  type        = bool
  default     = false
}
