output "droplet_id" {
  description = "The ID of the created droplet"
  value       = digitalocean_droplet.sample.id
}

output "droplet_ip" {
  description = "The public IPv4 address of the droplet"
  value       = digitalocean_droplet.sample.ipv4_address
}

# output "front_ip" {
#   value = module.front.droplet_ip
# }