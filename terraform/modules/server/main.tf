terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

resource "digitalocean_droplet" "sample" {
  name    = var.name
  region  = var.region
  size    = var.size
  image   = var.image
  ssh_keys = var.ssh_key_ids
}
