#!/bin/bash

# terraform
(cd terraform && ./terraform_init.sh)

sleep 20

# ansible
(cd ansible && ./run.sh)
