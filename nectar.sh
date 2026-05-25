#!/bin/bash

# Nectar Labs Base CLI
# Script to manage Nectar Labs projects

COMMAND=$1
if [ $# -gt 0 ]; then
    shift
fi

# Helper function to run Django commands in dev (using exec if running, run --rm if not)
run_django_cmd_dev() {
    if docker compose ps --services --filter "status=running" | grep -q "^backend$"; then
        docker compose exec backend python manage.py "$@"
    else
        docker compose run --rm backend python manage.py "$@"
    fi
}

# Helper function to run Django commands in staging (using exec if running, run --rm if not)
run_django_cmd_staging() {
    if docker compose -f docker-compose.staging.yml ps --services --filter "status=running" | grep -q "^backend-staging$"; then
        docker compose -f docker-compose.staging.yml exec backend-staging python manage.py "$@"
    else
        docker compose -f docker-compose.staging.yml run --rm backend-staging python manage.py "$@"
    fi
}

# Helper function to run Django commands in prod (using exec if running, run --rm if not)
run_django_cmd_prod() {
    if docker compose -f docker-compose.prod.yml ps --services --filter "status=running" | grep -q "^backend$"; then
        docker compose -f docker-compose.prod.yml exec backend python manage.py "$@"
    else
        docker compose -f docker-compose.prod.yml run --rm backend python manage.py "$@"
    fi
}

show_help() {
    echo "Nectar Labs CLI"
    echo ""
    echo "Usage: ./nectar.sh [command]"
    echo ""
    echo "Commands:"
    echo "  dev                     - Start development environment (Docker)"
    echo "  stop                    - Stop all containers"
    echo "  restart                 - Restart containers"
    echo "  logs                    - Show real-time logs"
    echo "  makemigrations          - Generate new database migrations"
    echo "  migrate                 - Run database migrations"
    echo "  createsuperuser         - Create a Django admin user"
    echo "  shell                   - Open backend shell"
    echo "  test                    - Run backend tests"
    echo "  typecheck               - Run TypeScript type-check in Dev frontend"
    echo "  buildcheck              - Run Next.js build check in Dev frontend"
    echo "  frontend                - Run frontend locally (npm run dev)"
    echo "  build                   - Build production images"
    echo "  up-prod                 - Start production environment"
    echo "  down-prod               - Stop production environment"
    echo "  makemigrations-prod     - Generate database migrations (Prod)"
    echo "  migrate-prod            - Run database migrations (Prod)"
    echo "  createsuperuser-prod    - Create admin user (Prod)"
    echo "  shell-prod              - Open backend shell (Prod)"
    echo "  collectstatic           - Run collectstatic in backend (Prod)"
    echo "  certbot                 - Request SSL certificate (Prod)"
    echo "  up-staging              - Start staging environment"
    echo "  down-staging            - Stop staging environment"
    echo "  restart-staging         - Restart staging environment"
    echo "  build-staging           - Build staging images"
    echo "  logs-staging            - View staging logs in real-time"
    echo "  makemigrations-staging  - Generate database migrations (Staging)"
    echo "  migrate-staging         - Run database migrations (Staging)"
    echo "  createsuperuser-staging - Create admin user (Staging)"
    echo "  shell-staging           - Open backend shell (Staging)"
    echo "  collectstatic-staging   - Run collectstatic in backend (Staging)"
    echo "  test-staging            - Run backend tests (Staging)"
    echo "  typecheck-staging       - Run TypeScript type-check in Staging frontend"
    echo "  buildcheck-staging      - Run Next.js build check in Staging frontend"
    echo "  help                    - Show this help"
}

case $COMMAND in
    dev)
        echo "Starting Nectar Labs Dev Environment..."
        docker compose up -d --build "$@"
        ;;
    stop)
        echo "Stopping containers..."
        docker compose down "$@"
        ;;
    up-prod)
        echo "Starting Nectar Labs Production Environment..."
        docker compose -f docker-compose.prod.yml up -d "$@"
        ;;
    down-prod)
        echo "Stopping Production Environment..."
        docker compose -f docker-compose.prod.yml down "$@"
        ;;
    makemigrations-prod)
        run_django_cmd_prod makemigrations "$@"
        ;;
    migrate-prod)
        run_django_cmd_prod migrate "$@"
        ;;
    createsuperuser-prod)
        run_django_cmd_prod createsuperuser "$@"
        ;;
    shell-prod)
        run_django_cmd_prod shell "$@"
        ;;
    up-staging)
        echo "Starting Nectar Labs Staging Environment..."
        docker compose -f docker-compose.staging.yml up -d --build "$@"
        ;;
    down-staging|stop-staging)
        echo "Stopping Staging Environment..."
        docker compose -f docker-compose.staging.yml down "$@"
        ;;
    restart-staging)
        echo "Restarting Staging Environment..."
        docker compose -f docker-compose.staging.yml restart "$@"
        ;;
    build-staging)
        echo "Building Staging Images..."
        docker compose -f docker-compose.staging.yml build "$@"
        ;;
    logs-staging)
        if [ $# -eq 0 ]; then
            docker compose -f docker-compose.staging.yml logs -f --tail=100
        else
            docker compose -f docker-compose.staging.yml logs "$@"
        fi
        ;;
    migrate-staging)
        run_django_cmd_staging migrate "$@"
        ;;
    createsuperuser-staging)
        run_django_cmd_staging createsuperuser "$@"
        ;;
    shell-staging)
        run_django_cmd_staging shell "$@"
        ;;
    collectstatic-staging)
        echo "Running collectstatic in Staging..."
        run_django_cmd_staging collectstatic --no-input "$@"
        ;;
    makemigrations-staging)
        run_django_cmd_staging makemigrations "$@"
        ;;
    test-staging)
        run_django_cmd_staging test "$@"
        ;;
    typecheck-staging)
        echo "Running TypeScript type-check in Staging frontend..."
        docker compose -f docker-compose.staging.yml exec frontend-staging npx tsc --noEmit "$@"
        ;;
    buildcheck-staging)
        echo "Running Next.js build-check in Staging frontend..."
        docker compose -f docker-compose.staging.yml exec frontend-staging npm run build "$@"
        ;;
    restart)
        docker compose restart "$@"
        ;;
    logs)
        if [ $# -eq 0 ]; then
            docker compose logs -f --tail=100
        else
            docker compose logs "$@"
        fi
        ;;
    makemigrations|makemigrations-dev)
        run_django_cmd_dev makemigrations "$@"
        ;;
    migrate|migrate-dev)
        run_django_cmd_dev migrate "$@"
        ;;
    collectstatic)
        echo "Running collectstatic..."
        if docker ps --filter "name=nectar_backend" --filter "status=running" | grep -q "nectar_backend"; then
            docker exec -it nectar_backend python manage.py collectstatic --no-input "$@"
        else
            docker compose -f docker-compose.prod.yml run --rm backend python manage.py collectstatic --no-input "$@"
        fi
        ;;
    createsuperuser|createsuperuser-dev)
        run_django_cmd_dev createsuperuser "$@"
        ;;
    shell|shell-dev)
        run_django_cmd_dev shell "$@"
        ;;
    test|test-dev)
        run_django_cmd_dev test "$@"
        ;;
    typecheck)
        echo "Running TypeScript type-check in Dev frontend..."
        docker compose exec frontend npx tsc --noEmit "$@"
        ;;
    buildcheck)
        echo "Running Next.js build-check in Dev frontend..."
        docker compose exec frontend npm run build "$@"
        ;;
    frontend)
        cd frontend && npm run dev "$@"
        ;;
    build)
        docker compose -f docker-compose.prod.yml build "$@"
        ;;
    certbot)
        DOMAIN=$1
        if [ -z "$DOMAIN" ]; then
            echo "Usage: ./nectar.sh certbot example.com"
            exit 1
        fi
        docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path=/var/www/certbot -d $DOMAIN -d www.$DOMAIN
        ;;
    *)
        show_help
        ;;
esac
