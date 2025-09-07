.PHONY: help build up down logs clean 

all: db-setup build backend #ELKUP PROMUP

build:
	@docker network create monitoring_network || true

backend:
	docker compose -f docker-compose.backend.yml up --build

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

# deployement {1- vagrant 2- kubctl apply -f to manifests files}

down: ELKDOWN PROMDOWN
	docker compose -f docker-compose.backend.yml down -v
	docker network rm monitoring_network

logs:
	docker-compose logs -f

clean:
	docker compose -f docker-compose.backend.yml down -v --remove-orphans
	docker compose -f ./elk/docker-compose.elk.yml down -v --remove-orphans
	docker compose -f ./prometheus/docker-compose.prometheus.yml down -v --remove-orphans
	docker system prune -f

re: down all

db-setup:
	@mkdir -p databases
	@touch databases/auth.db databases/users.db databases/game.db databases/chat.db databases/tournaments.db databases/notifications.db

# Restart specific service
restart-%:
	docker-compose restart $*

# View logs for specific service
logs-%:
	docker-compose logs -f $*
