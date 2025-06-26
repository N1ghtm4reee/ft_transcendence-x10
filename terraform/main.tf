terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

# Set the variable value in *.tfvars file
# or using -var="do_token=..." CLI option

# Configure the DigitalOcean Provider
provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_droplet" "k8s_node" {
    name = "k8s-node"
    region = "nyc3"
    size   = "s-1vcpu-2gb"
    image  = "ubuntu-22-04-x64"
    ssh_keys = [var.ssh_fingerprint]
}
