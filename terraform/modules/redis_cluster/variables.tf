# ============================================
# REDIS CLUSTER MODULE VARIABLES
# ============================================

variable "cluster_name" {
  description = "Name of the Redis cluster"
  type        = string
  
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.cluster_name))
    error_message = "Cluster name must be lowercase alphanumeric with hyphens"
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
}

variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "7"
  
  validation {
    condition     = contains(["6", "7"], var.redis_version)
    error_message = "Redis version must be 6 or 7"
  }
}

variable "cluster_size" {
  description = "Database cluster size"
  type        = string
  default     = "db-s-1vcpu-1gb"
  
  validation {
    condition     = can(regex("^db-[a-z0-9\\-]+$", var.cluster_size))
    error_message = "Invalid cluster size format"
  }
}

variable "node_count" {
  description = "Number of cluster nodes"
  type        = number
  default     = 1
  
  validation {
    condition     = var.node_count >= 1 && var.node_count <= 3
    error_message = "Node count must be between 1 and 3"
  }
}

variable "maintenance_day" {
  description = "Day of week for maintenance (lowercase)"
  type        = string
  default     = "sunday"
  
  validation {
    condition = contains([
      "monday", "tuesday", "wednesday", "thursday",
      "friday", "saturday", "sunday"
    ], var.maintenance_day)
    error_message = "Must be a valid day of the week (lowercase)"
  }
}

variable "maintenance_hour" {
  description = "Hour of day for maintenance (00:00-23:00)"
  type        = string
  default     = "02:00"
  
  validation {
    condition     = can(regex("^([01][0-9]|2[0-3]):[0-5][0-9]$", var.maintenance_hour))
    error_message = "Maintenance hour must be in HH:MM format (24-hour)"
  }
}

variable "eviction_policy" {
  description = "Redis eviction policy"
  type        = string
  default     = "allkeys_lru"
  
  validation {
    condition = contains([
      "noeviction", "allkeys_lru", "allkeys_lfu", 
      "volatile_lru", "volatile_lfu", "allkeys_random", "volatile_random"
    ], var.eviction_policy)
    error_message = "Invalid eviction policy"
  }
}

variable "trusted_source_droplet_ids" {
  description = "Droplet IDs allowed to connect to Redis"
  type        = list(string)
  default     = []
}

variable "trusted_source_ips" {
  description = "IP addresses/CIDR blocks allowed to connect"
  type        = list(string)
  default     = []
}

variable "create_connection_pool" {
  description = "Create a connection pool"
  type        = bool
  default     = false
}

variable "pool_size" {
  description = "Connection pool size"
  type        = number
  default     = 10
  
  validation {
    condition     = var.pool_size >= 1 && var.pool_size <= 100
    error_message = "Pool size must be between 1 and 100"
  }
}

variable "db_name" {
  description = "Database name for connection pool"
  type        = string
  default     = "defaultdb"
}

variable "create_dedicated_user" {
  description = "Create a dedicated database user"
  type        = bool
  default     = false
}

variable "user_name" {
  description = "Username for dedicated user"
  type        = string
  default     = "genesis_app"
}

variable "additional_tags" {
  description = "Additional tags beyond defaults"
  type        = list(string)
  default     = []
}

variable "prevent_destroy" {
  description = "Prevent accidental destruction"
  type        = bool
  default     = true
}
