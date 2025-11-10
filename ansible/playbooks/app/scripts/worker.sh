#!/bin/bash

MASTER_IP=$1

TOKEN=$(cat /home/token.txt)

echo "Installing K3s agent..."
curl -sfL https://get.k3s.io | K3S_URL=https://$MASTER_IP:6443 K3S_TOKEN=$TOKEN sh -

echo "Creating directories..."
mkdir -p /home/logs
mkdir -p /home/databases

echo "K3s worker node setup complete!"