#!/bin/bash


#not working

export SERVER_IP=192.168.56.10
scp user@$SERVER_IP:/etc/rancher/k3s/k3s.yaml ~/.kube/config && \
sed -i "s/127.0.0.1/$SERVER_IP/g" ~/.kube/config && \
export KUBECONFIG=~/.kube/config