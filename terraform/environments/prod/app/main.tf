terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

# module "jenkins" {
#   source = "../../../modules/server"

#   name            = "jenkins"
#   region          = var.region
#   size            = var.size
#   image           = var.image
#   ssh_key_ids     = var.ssh_key_ids
#   assign_floating_ip = var.assign_floating_ip
# }

module "server-1" {
  source = "../../../modules/server"

  name            = "server-1"
  region          = var.region
  size            = var.size
  image           = var.image
  ssh_key_ids     = var.ssh_key_ids
  assign_floating_ip = var.assign_floating_ip
}

module "server-2" {
  source = "../../../modules/server"

  name            = "server-2"
  region          = var.region
  size            = var.size
  image           = var.image
  ssh_key_ids     = var.ssh_key_ids
  assign_floating_ip = var.assign_floating_ip
}

module "server-3" {
  source = "../../../modules/server"

  name            = "server-3"
  region          = var.region
  size            = var.size
  image           = var.image
  ssh_key_ids     = var.ssh_key_ids
  assign_floating_ip = var.assign_floating_ip
}

module "server-4" {
  source = "../../../modules/server"

  name            = "server-4"
  region          = var.region
  size            = var.size
  image           = var.image
  ssh_key_ids     = var.ssh_key_ids
  assign_floating_ip = var.assign_floating_ip
}

# resource "digitalocean_droplet" "sample" {
#   name    = var.name
#   region  = var.region
#   size    = var.size
#   image   = var.image
#   ssh_keys = var.ssh_key_ids
# }
