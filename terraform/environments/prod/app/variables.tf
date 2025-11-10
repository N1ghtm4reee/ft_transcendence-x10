

variable "name" {
  description = "value"
  type = string
}

variable "region" {
  description = "value"
  type = string
}

variable "size" {
  description = "value"
  type = string
}

variable "image" {
  description = "value"
  type = string
}

variable "ssh_key_ids" {
  description = "List of SSH key IDs"
  type        = list(string)
}

variable "assign_floating_ip" {
  description = "value"
  type = bool
}

variable "do_token" {
    description = "value"
    type = string
}
