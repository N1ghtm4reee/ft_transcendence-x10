
# output "jenkins_ip" {
#   description = "The public IPv4 address of the droplet"
#   value       = module.jenkins.droplet_ip
# }

output "server-1" {
  value = module.server-1.droplet_ip
}

output "server-2" {
  value = module.server-2.droplet_ip
}

output "server-3" {
  value = module.server-3.droplet_ip
}

output "server-4" {
  value = module.server-4.droplet_ip
}
