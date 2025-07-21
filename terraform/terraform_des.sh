#!/bin/bash

terraform destroy -auto-approve -lock=false

rm -f ip.txt