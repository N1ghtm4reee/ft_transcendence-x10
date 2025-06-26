#!/bin/bash

terraform init

terraform apply -auto-approve

terraform output droplet_ip > ip.txt