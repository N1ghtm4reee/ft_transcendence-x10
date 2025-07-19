#!/bin/bash

# Install K3s on the master node
curl -sfL https://get.k3s.io | sh -

sudo snap install kubectl --classic
sudo snap install kubeadm --classic

# Install Kompose
curl -L https://github.com/kubernetes/kompose/releases/download/v1.36.0/kompose-linux-amd64 -o kompose
chmod +x ./kompose
sudo mv ./kompose /usr/local/bin/kompose

# Get the token for the worker nodes
TOKEN=$(sudo cat /var/lib/rancher/k3s/server/node-token)

echo $TOKEN > /home/token.txt