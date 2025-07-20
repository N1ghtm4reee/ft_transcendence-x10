#!/bin/bash

MASTER_IP="104.248.6.46"

TOKEN=$(cat /home/token.txt)

curl -sfL https://get.k3s.io | K3S_URL=https://$MASTER_IP:6443 K3S_TOKEN=$TOKEN sh -

sudo snap install kubelet --classic && sudo snap install kubeadm --classic

mkdir -p /home/logs
mkdir -p /home/databases

