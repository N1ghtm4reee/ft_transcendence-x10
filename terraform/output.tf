output "droplet_ip" {
  value = [
    digitalocean_droplet.k8s_node1.ipv4_address,
    digitalocean_droplet.k8s_node2.ipv4_address,
    digitalocean_droplet.k8s_node3.ipv4_address,
    digitalocean_droplet.k8s_node4.ipv4_address,
  ]

}
