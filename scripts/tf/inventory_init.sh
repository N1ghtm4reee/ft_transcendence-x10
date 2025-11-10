#!/bin/bash

# this script fill inventory file for ansible with the newly provisioned server

sleep 40

input_file="ansible/inventory/hosts.txt"
inventory_file="ansible/inventory/inventory.ini"

> "$inventory_file"

while IFS='=' read -r key value; do
    key=$(echo "$key" | xargs)
    ip=$(echo "$value" | tr -d ' "')
    safe_key=$(echo "$key" | tr '-' '_')
    declare "$safe_key=$ip"
done < "$input_file"

cat <<EOF > "$inventory_file"
[server]
$server ansible_user=root
EOF
