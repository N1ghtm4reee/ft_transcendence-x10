#!/bin/bash

# Exit on any error
set -e

MASTER_IP="68.183.153.79"

# Check if token file exists
if [[ ! -f "/home/token.txt" ]]; then
    echo "ERROR: /home/token.txt not found!"
    exit 1
fi

TOKEN=$(cat /home/token.txt)

if [[ -z "$TOKEN" ]]; then
    echo "ERROR: Token is empty!"
    exit 1
fi

echo "Installing K3s agent..."
curl -sfL https://get.k3s.io | K3S_URL=https://$MASTER_IP:6443 K3S_TOKEN=$TOKEN sh -

# Note: kubelet and kubeadm are included with K3s, no need to install separately
# The snap installations in the original script were incorrect for K3s

echo "Creating directories..."
mkdir -p /home/logs
mkdir -p /home/databases

echo "K3s worker node setup complete!"
