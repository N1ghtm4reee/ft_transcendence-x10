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

module "server" {
  source = "../../../modules/server"

  name            = "server"
  region          = var.region
  size            = var.size
  image           = var.image
  ssh_key_ids     = var.ssh_key_ids
  assign_floating_ip = var.assign_floating_ip
}
