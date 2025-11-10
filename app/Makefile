.PHONY: help build up down logs clean front dfront certs

CERTS_DIR := ./front/certs
SSL_CERT := $(CERTS_DIR)/ssl_cert.pem
SSL_KEY := $(CERTS_DIR)/ssl_key.pem

all: db-setup build backend front ELKUP PROMUP

build:
	@docker network create monitoring_network || true

certs:
	@echo "🔒 Generating self-signed SSL certificates..."
	@mkdir -p $(CERTS_DIR)
	@if [ ! -f $(SSL_CERT) ] || [ ! -f $(SSL_KEY) ]; then \
		openssl req -x509 -newkey rsa:4096 -sha256 -days 365 -nodes \
			-keyout $(SSL_KEY) -out $(SSL_CERT) \
			-subj "/C=MA/ST=Morocco/L=Benguerir/O=1337/OU=Transcendence/CN=localhost"; \
		echo "✅ Certificates generated at $(CERTS_DIR)"; \
	else \
		echo "✅ Certificates already exist, skipping generation."; \
	fi

front: certs
	@echo "🚀 Running Front-end with HTTPS..."
	cd front && docker build -t front . 
	docker run -d \
		--name front \
		-p 4000:4000 \
		--mount type=bind,source=$(abspath $(SSL_CERT)),target=/run/secrets/ssl_cert,readonly \
		--mount type=bind,source=$(abspath $(SSL_KEY)),target=/run/secrets/ssl_key,readonly \
		front:latest

dfront:
	@echo "🛑 Stopping and removing Front-end container..."
	-docker stop front
	-docker rm front
	@echo "🧹 Optional: Removing the front image..."
	-docker rmi front || true

backend:
	docker compose -f docker-compose.backend.yml up --build -d

ELKUP:
	@echo "Starting ELK stack..."
	docker compose -f ./elk/docker-compose.elk.yml up -d

PROMUP:
	@echo "Starting prometheus/Grafana..."
	docker compose -f ./prometheus/docker-compose.prometheus.yml up -d

ELKDOWN:
	@echo "Stopping ELK stack..."
	docker compose -f ./elk/docker-compose.elk.yml down -v

PROMDOWN:
	@echo "Stopping prometheus stack..."
	docker compose -f ./prometheus/docker-compose.prometheus.yml down -v 

down: ELKDOWN PROMDOWN dfront
	docker compose -f docker-compose.backend.yml down -v
	docker network rm monitoring_network || true

logs:
	docker-compose logs -f

clean:
	docker compose -f docker-compose.backend.yml down -v --remove-orphans
	docker compose -f ./elk/docker-compose.elk.yml down -v --remove-orphans
	docker compose -f ./prometheus/docker-compose.prometheus.yml down -v --remove-orphans
	docker system prune -f

re: down dfront all

db-setup:
	@mkdir -p databases
	@touch databases/auth.db databases/users.db databases/game.db databases/chat.db databases/tournaments.db databases/notifications.db

restart-%:
	docker-compose restart $*

logs-%:
	docker-compose logs -f $*
