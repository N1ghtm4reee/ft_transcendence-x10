#!/bin/bash

terraform init

terraform apply -auto-approve

terraform output -json droplet_ip | jq -r '.[]' > ip.txt

./inventory_setup.sh