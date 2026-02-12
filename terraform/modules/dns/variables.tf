# ============================================
# DNS MODULE VARIABLES
# ============================================

variable "domain" {
  description = "Domain name (must already exist in DigitalOcean)"
  type        = string
  
  validation {
    condition     = can(regex("^[a-z0-9.-]+$", var.domain))
    error_message = "Invalid domain format"
  }
}

variable "dns_records" {
  description = "List of DNS records to create"
  type = list(object({
    name     = string
    type     = string
    value    = string
    ttl      = number
    priority = optional(number)
  }))
  default = []
  
  validation {
    condition     = alltrue([for r in var.dns_records : contains(["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV"], r.type)])
    error_message = "DNS record type must be one of: A, AAAA, CNAME, MX, TXT, NS, SRV"
  }
}

variable "create_wildcard" {
  description = "Create wildcard (*) A record"
  type        = bool
  default     = false
}

variable "wildcard_target_ip" {
  description = "Target IP for wildcard record"
  type        = string
  default     = ""
}

variable "wildcard_ttl" {
  description = "TTL for wildcard record (seconds)"
  type        = number
  default     = 3600
}
