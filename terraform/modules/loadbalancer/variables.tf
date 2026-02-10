# ============================================
# LOAD BALANCER MODULE VARIABLES
# ============================================

variable "lb_name" {
  description = "Name of the load balancer"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "region" {
  description = "DigitalOcean region"
  type        = string
  default     = "nyc1"
}

variable "size_unit" {
  description = "Load balancer size (lb-small, lb-medium, lb-large)"
  type        = string
  default     = "lb-small"
  
  validation {
    condition     = contains(["lb-small", "lb-medium", "lb-large"], var.size_unit)
    error_message = "Size must be lb-small, lb-medium, or lb-large"
  }
}

variable "algorithm" {
  description = "Load balancing algorithm"
  type        = string
  default     = "round_robin"
  
  validation {
    condition     = contains(["round_robin", "least_connections"], var.algorithm)
    error_message = "Algorithm must be round_robin or least_connections"
  }
}

variable "forwarding_rules" {
  description = "List of forwarding rules"
  type = list(object({
    entry_port       = number
    entry_protocol   = string
    target_port      = number
    target_protocol  = string
    certificate_name = optional(string)
    tls_passthrough  = optional(bool, false)
  }))
  default = [
    {
      entry_port      = 443
      entry_protocol  = "https"
      target_port     = 3000
      target_protocol = "http"
    }
  ]
}

variable "health_check" {
  description = "Health check configuration"
  type = object({
    port                     = number
    protocol                 = string
    path                     = string
    check_interval_seconds   = number
    response_timeout_seconds = number
    unhealthy_threshold      = number
    healthy_threshold        = number
  })
  default = {
    port                     = 3000
    protocol                 = "http"
    path                     = "/api/health"
    check_interval_seconds   = 10
    response_timeout_seconds = 5
    unhealthy_threshold      = 3
    healthy_threshold        = 2
  }
}

variable "droplet_ids" {
  description = "IDs of droplets to attach to LB"
  type        = list(string)
  default     = []
}

variable "redirect_http_to_https" {
  description = "Automatically redirect HTTP to HTTPS"
  type        = bool
  default     = true
}

variable "sticky_sessions_enabled" {
  description = "Enable sticky sessions"
  type        = bool
  default     = false
}

variable "sticky_sessions_type" {
  description = "Sticky sessions type (cookies only)"
  type        = string
  default     = "cookies"
}

variable "sticky_sessions_cookie_name" {
  description = "Cookie name for sticky sessions"
  type        = string
  default     = "lb"
}

variable "sticky_sessions_cookie_ttl" {
  description = "Cookie TTL in seconds"
  type        = number
  default     = 3600
}

variable "additional_tags" {
  description = "Additional tags"
  type        = list(string)
  default     = []
}

variable "prevent_destroy" {
  description = "Prevent accidental destruction"
  type        = bool
  default     = true
}
