#!/bin/bash

# terraform
(cd terraform && ./terraform_init.sh)

# ansible
(cd ansible/ansible_quickstart && ./run.sh)

