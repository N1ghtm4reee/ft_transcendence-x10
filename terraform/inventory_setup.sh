#!/bin/bash

# Read all IPs into an array
mapfile -t ips < ip.txt

# Assign first IP as master, rest as workers
masterip="${ips[0]}"
workerips=("${ips[@]:1}")

# Start writing to inventory.ini
cat > ../ansible/inventory/inventory.ini << EOF
[master]
${masterip} ansible_user=root ansible_ssh_private_key_file=~/.ssh/id_ed25519 ansible_ssh_common_args='-o StrictHostKeyChecking=no'

[workers]
EOF

for ip in "${workerips[@]}"; do
  echo "${ip} ansible_user=root ansible_ssh_private_key_file=~/.ssh/id_ed25519 ansible_ssh_common_args='-o StrictHostKeyChecking=no'" >> ../ansible/inventory/inventory.ini
done

# Create worker.sh with master_ip and token if token file exists locally
cat > ../ansible/scripts/worker.sh << EOF
#!/bin/bash

MASTER_IP="${masterip}"

TOKEN=\$(cat /home/token.txt)

curl -sfL https://get.k3s.io | K3S_URL=https://\$MASTER_IP:6443 K3S_TOKEN=\$TOKEN sh -

sudo snap install kubelet --classic && sudo snap install kubeadm --classic
EOF