output "droplet_ip" {
  value = digitalocean_droplet.k8s_node.ipv4_address
}
