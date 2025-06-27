#!/bin/bash

MASTER_IP="165.22.44.190"

TOKEN=$(cat /home/token.txt)

curl -sfL https://get.k3s.io | K3S_URL=https://$MASTER_IP:6443 K3S_TOKEN=$TOKEN sh -

sudo snap install kubelet --classic && sudo snap install kubeadm --classic
