#!/bin/bash

terraform init

terraform apply -auto-approve

terraform output -raw droplet_ip > ip.txt