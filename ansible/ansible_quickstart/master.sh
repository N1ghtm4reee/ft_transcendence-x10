#!/bin/bash

# Install K3s on the master node
curl -sfL https://get.k3s.io | sh -

sudo snap install kubectl --classic
sudo snap install kubeadm --classic

# Get the token for the worker nodes    
TOKEN=$(sudo cat /var/lib/rancher/k3s/server/node-token)

echo $TOKEN > /home/token.txt