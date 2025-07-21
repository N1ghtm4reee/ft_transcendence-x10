#!/bin/bash

# terraform
(cd terraform && ./terraform_init.sh)

sleep 60

# ansible
(cd ansible && ./run.sh)
