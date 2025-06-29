# Additional variables for sensitive data

variable "jwt_secret" {
  description = "JWT secret key for authentication"
  type        = string
  sensitive   = true
}

variable "cors_origins" {
  description = "Allowed CORS origins (comma-separated)"
  type        = string
  default     = "https://yourdomain.com"
}

variable "superuser_email" {
  description = "Superuser email"
  type        = string
  default     = "admin@ccdh.me"
}

variable "superuser_username" {
  description = "Superuser username"
  type        = string
  default     = "admin"
}

variable "superuser_password" {
  description = "Superuser password"
  type        = string
  sensitive   = true
}