#!/bin/bash

# Read all IPs into an array
mapfile -t ips < ip.txt

# Assign first IP as master, rest as workers
masterip="${ips[0]}"
workerips=("${ips[@]:1}")

# Start writing to inventory.ini
echo "[master]" > ../ansible/ansible_quickstart/inventory.ini
echo "${masterip} ansible_user=root ansible_ssh_private_key_file=~/.ssh/id_ed25519 ansible_ssh_common_args='-o StrictHostKeyChecking=no'" >> ../ansible/ansible_quickstart/inventory.ini

echo "" >> ../ansible/ansible_quickstart/inventory.ini
echo "[workers]" >> ../ansible/ansible_quickstart/inventory.ini

# Loop through worker IPs and add them
for ip in "${workerips[@]}"; do
  echo "${ip} ansible_user=root ansible_ssh_private_key_file=~/.ssh/id_ed25519 ansible_ssh_common_args='-o StrictHostKeyChecking=no'" >> ../ansible/ansible_quickstart/inventory.ini
done
