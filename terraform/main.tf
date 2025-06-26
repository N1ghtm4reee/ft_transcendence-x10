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

resource "digitalocean_droplet" "k8s_node1" {
    name = "k8s-node1"
    region = "nyc3"
    size   = "s-1vcpu-2gb"
    image  = "ubuntu-22-04-x64"
    ssh_keys = [var.ssh_fingerprint]
}

resource "digitalocean_droplet" "k8s_node2" {
    name = "k8s-node2"
    region = "nyc3"
    size   = "s-1vcpu-2gb"
    image  = "ubuntu-22-04-x64"
    ssh_keys = [var.ssh_fingerprint]
}

resource "digitalocean_droplet" "k8s_node3" {
    name = "k8s-node3"
    region = "nyc3"
    size   = "s-1vcpu-2gb"
    image  = "ubuntu-22-04-x64"
    ssh_keys = [var.ssh_fingerprint]
}

resource "digitalocean_droplet" "k8s_node4" {
    name = "k8s-node4"
    region = "nyc3"
    size   = "s-1vcpu-2gb"
    image  = "ubuntu-22-04-x64"
    ssh_keys = [var.ssh_fingerprint]
}
