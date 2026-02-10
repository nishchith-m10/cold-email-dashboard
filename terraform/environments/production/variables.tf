# ============================================
# PRODUCTION ENVIRONMENT VARIABLES
# ============================================

# ============================================
# AUTHENTICATION
# ============================================

variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

# ============================================
# INFRASTRUCTURE SIZING
# ============================================

variable "primary_region" {
  description = "Primary region for production"
  type        = string
  default     = "nyc1"
}

variable "dashboard_size" {
  description = "Dashboard droplet size"
  type        = string
  default     = "s-4vcpu-8gb"  # Production sizing
}

variable "redis_size" {
  description = "Redis cluster size"
  type        = string
  default     = "db-s-4vcpu-8gb"  # Production sizing
}

variable "redis_nodes" {
  description = "Number of Redis cluster nodes"
  type        = number
  default     = 2  # Primary + replica for HA
}

variable "lb_size" {
  description = "Load balancer size"
  type        = string
  default     = "lb-medium"
}

# ============================================
# NETWORKING
# ============================================

variable "domain" {
  description = "Production domain name"
  type        = string
}

variable "ssl_certificate_name" {
  description = "Name of SSL certificate in DigitalOcean"
  type        = string
}

variable "create_wildcard_dns" {
  description = "Create wildcard DNS for tenant subdomains"
  type        = bool
  default     = false
}

variable "admin_ips" {
  description = "IP addresses allowed for admin access (SSH, Redis)"
  type        = list(string)
  default     = []
}

variable "ssh_key_ids" {
  description = "SSH key IDs for droplet access"
  type        = list(string)
}
