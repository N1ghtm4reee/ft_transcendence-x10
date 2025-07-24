#!/bin/bash


curl -sSL -o /tmp/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x /tmp/argocd
sudo mv /tmp/argocd /usr/local/bin/argocd

# create namespaces
kubectl create namespace argocd

# apply deployements to the dedicated namespaces
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# wait for argocd to be ready
# echo "Waiting for ArgoCD to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/argocd-server -n argocd

# start port-forwarding for argocd in background ??
kubectl -n argocd patch svc argocd-server \
  -p '{"spec": {"type": "NodePort", "ports": [{"port": 443, "targetPort": 8080, "nodePort": 32000}]}}'
# kubectl port-forward svc/argocd-server -n argocd 8443:443 > /dev/null 2>&1 &
# ARGOCD_PF_PID=$!

# wait for port-forward to be ready
sleep 20

# get secret to access the UI
NODE_IP=$(kubectl get nodes -o jsonpath="{.items[0].status.addresses[?(@.type=='InternalIP')].address}")
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
echo "ArgoCD admin password: $ARGOCD_PASSWORD"

# setup argocd app
argocd login $NODE_IP:32000 --username admin --password "$ARGOCD_PASSWORD" --insecure

argocd app create transcendence \
  --repo https://github.com/N1ghtm4reee/ft_transcendence-x10.git \
  --path k8s/manifests/app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace transcendence \
  --sync-policy automated

argocd app sync transcendence

argocd app create elk \
  --repo https://github.com/N1ghtm4reee/ft_transcendence-x10.git \
  --path k8s/manifests/elk \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace elk \
  --sync-policy automated

argocd app sync elk

argocd app create monitoring \
  --repo https://github.com/N1ghtm4reee/ft_transcendence-x10.git \
  --path k8s/manifests/monitoring \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace monitoring \
  --sync-policy automated

argocd app sync monitoring

# get pod name after deployment is ready
# POD_NAME=$(kubectl get pods -n transcendence --no-headers | grep "^app" | awk '{print $1}' | head -n 1)

echo "Setup complete!"
echo "ArgoCD UI: https://localhost:8443 (admin/$ARGOCD_PASSWORD)"
echo "Port-forward PIDs: ArgoCD=$ARGOCD_PF_PID, App=$APP_PF_PID"