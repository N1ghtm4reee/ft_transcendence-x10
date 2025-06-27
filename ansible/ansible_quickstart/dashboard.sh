#!/bin/bash

kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

kubectl -n kubernetes-dashboard patch svc kubernetes-dashboard \
  -p '{"spec": {"type": "NodePort"}}'

kubectl -n kubernetes-dashboard get svc kubernetes-dashboard > /home/dashboard_ip_port.txt

# create admin-user account
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: admin-user
  namespace: kubernetes-dashboard
EOF

# get dashboard access token
kubectl -n kubernetes-dashboard create token admin-user > /home/dashboard_token.txt