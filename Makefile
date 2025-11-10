
all: infra config

re: destroy_infra infra config

infra: # Provision Infrastructure
	cd terraform/environments/prod/server && terraform init
	cd terraform/environments/prod/server && terraform apply --auto-approve && terraform output > ../../../../ansible/inventory/hosts.txt

config: # Configure Servers
	./scripts/tf/inventory_init.sh
	cd ansible && ansible-playbook ./playbooks/server/playbook.yaml
	cd ansible && ansible-playbook ./playbooks/server/prom_playbook.yaml

destroy_infra: # Destroy Infrastructure
	cd terraform/environments/prod/server && terraform destroy --auto-approve
	sleep 30
