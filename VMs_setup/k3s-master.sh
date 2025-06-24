#!/bin/bash

# Install K3s on the master node
curl -sfL https://get.k3s.io | sh -

# Make sure kubectl is set up for the vagrant user
sudo mkdir -p /home/vagrant/.kube
sudo cp /etc/rancher/k3s/k3s.yaml /home/vagrant/.kube/config
sudo chown -R vagrant:vagrant /home/vagrant/.kube/config

sudo snap install kubectl --classic
sudo snap install kubeadm --classic

# Get the token for the worker nodes    
TOKEN=$(sudo cat /var/lib/rancher/k3s/server/node-token)

# Store the token for the workers to use
echo $TOKEN > /vagrant/token

# create namespaces
sudo kubectl create namespace app

sudo kubectl create namespace elk

sudo kubectl create namespace monitor


# create labels
sudo kubectl label nodes app-node  role=app

sudo kubectl label nodes elk-node role=elk

sudo kubectl label nodes prometheus-node role=monitoring

