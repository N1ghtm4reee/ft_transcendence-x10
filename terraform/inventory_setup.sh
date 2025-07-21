#!/bin/bash

# Exit on any error
set -e

# Function to print status messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Check if ip.txt exists
if [[ ! -f "ip.txt" ]]; then
    echo "ERROR: ip.txt file not found!"
    exit 1
fi

# Check if ip.txt is not empty
if [[ ! -s "ip.txt" ]]; then
    echo "ERROR: ip.txt file is empty!"
    exit 1
fi

log "Reading IPs from ip.txt..."

# Read all IPs into an array, removing any empty lines or whitespace
mapfile -t ips < <(grep -v '^[[:space:]]*$' ip.txt | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

# Check if we have at least 2 IPs (minimum: 1 master + 1 NFS)
if [[ ${#ips[@]} -lt 2 ]]; then
    echo "ERROR: Need at least 2 IP addresses (1 master + 1 NFS server)"
    exit 1
fi

log "Found ${#ips[@]} IP addresses"

# Assign first IP as master, last IP as NFS, middle IPs as workers
masterip="${ips[0]}"
nfsip="${ips[-1]}" # Last IP is the NFS server

# Calculate worker IPs (exclude first and last)
if [[ ${#ips[@]} -gt 2 ]]; then
    workerips=("${ips[@]:1:${#ips[@]}-2}")
else
    workerips=() # No workers if only 2 IPs total
fi

log "Master IP: $masterip"
log "NFS IP: $nfsip"
log "Worker IPs: ${workerips[*]:-None}"

# Create necessary directories
log "Creating directories..."
mkdir -p ../ansible/inventory
mkdir -p ../ansible/scripts
mkdir -p ../k8s/manifests

# Start writing to inventory.ini
log "Generating inventory.ini..."
cat > ../ansible/inventory/inventory.ini << EOF
[master]
${masterip} ansible_user=root ansible_ssh_private_key_file=~/.ssh/id_ed25519 ansible_ssh_common_args='-o StrictHostKeyChecking=no'

[nfs]
${nfsip} ansible_user=root ansible_ssh_private_key_file=~/.ssh/id_ed25519 ansible_ssh_common_args='-o StrictHostKeyChecking=no'

[workers]
EOF

# Add worker IPs if any exist
if [[ ${#workerips[@]} -gt 0 ]]; then
    for ip in "${workerips[@]}"; do
        echo "${ip} ansible_user=root ansible_ssh_private_key_file=~/.ssh/id_ed25519 ansible_ssh_common_args='-o StrictHostKeyChecking=no'" >> ../ansible/inventory/inventory.ini
    done
    log "Added ${#workerips[@]} worker node(s)"
else
    echo "# No worker nodes configured" >> ../ansible/inventory/inventory.ini
    log "No worker nodes configured"
fi

# Create worker.sh script
log "Generating worker.sh script..."
cat > ../ansible/scripts/worker.sh << 'EOF'
#!/bin/bash

# Exit on any error
set -e

MASTER_IP="MASTER_IP_PLACEHOLDER"

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
EOF

# Replace placeholder with actual master IP
sed -i "s/MASTER_IP_PLACEHOLDER/$masterip/g" ../ansible/scripts/worker.sh

# Make worker.sh executable
chmod +x ../ansible/scripts/worker.sh

# Create PersistentVolume manifest
log "Generating shared-logs-pv.yaml..."
cat > ../k8s/manifests/shared-logs-pv.yaml << EOF
apiVersion: v1
kind: PersistentVolume
metadata:
  name: shared-logs-pv
spec:
  capacity:
    storage: 1Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  nfs:
    path: /srv/nfs/logs
    server: ${nfsip}
EOF

cat > ../k8s/manifests/elk/elk-pv.yaml << EOF
apiVersion: v1
kind: PersistentVolume
metadata:
  name: elk-pv
spec:
  capacity:
    storage: 1Gi
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  nfs:
    path: /srv/nfs/logs
    server: ${nfsip}

EOF

log "Files generated successfully:"
log "  - ../ansible/inventory/inventory.ini"
log "  - ../ansible/scripts/worker.sh"
log "  - ../k8s/manifests/shared-logs-pv.yaml"

log "Script completed successfully!"