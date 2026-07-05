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

# Helper function to run npm commands in dev frontend container
run_npm_cmd_dev() {
    if docker compose ps --services --filter "status=running" | grep -q "^frontend$"; then
        docker compose exec frontend npm "$@"
    else
        docker compose run --rm frontend npm "$@"
    fi
}

# Helper function to run npm commands in staging frontend container
run_npm_cmd_staging() {
    if docker compose -f docker-compose.staging.yml ps --services --filter "status=running" | grep -q "^frontend-staging$"; then
        docker compose -f docker-compose.staging.yml exec frontend-staging npm "$@"
    else
        docker compose -f docker-compose.staging.yml run --rm frontend-staging npm "$@"
    fi
}

# Helper function to run npm commands in prod frontend container
run_npm_cmd_prod() {
    if docker compose -f docker-compose.prod.yml ps --services --filter "status=running" | grep -q "^frontend$"; then
        docker compose -f docker-compose.prod.yml exec frontend npm "$@"
    else
        docker compose -f docker-compose.prod.yml run --rm frontend npm "$@"
    fi
}

show_help() {
    echo "Nectar Labs CLI"
    echo ""
    echo "Usage: ./nectar.sh [command]"
    echo ""
    echo "=== DEVELOPMENT ENV (Local) ==="
    echo "  dev                      - Start development environment (Docker)"
    echo "  stop                     - Stop development containers"
    echo "  restart                  - Restart development containers"
    echo "  logs                     - Show real-time dev logs"
    echo "  makemigrations           - Generate database migrations (Dev)"
    echo "  migrate                  - Run database migrations (Dev)"
    echo "  createsuperuser          - Create Django admin user (Dev)"
    echo "  shell                    - Open Django shell (Dev)"
    echo "  test                     - Run Django tests (Dev)"
    echo "  frontend                 - Run Next.js frontend locally (npm run dev)"
    echo "  typecheck                - Run TypeScript typecheck (Dev frontend)"
    echo "  buildcheck               - Run Next.js buildcheck (Dev frontend)"
    echo "  seed-addons              - Seed addons table in Dev database"
    echo "  install-frontend         - Install npm packages in local Dev"
    echo ""
    echo "=== STAGING ENV ==="
    echo "  up-staging               - Start staging environment"
    echo "  down-staging             - Stop staging environment"
    echo "  restart-staging          - Restart staging environment"
    echo "  build-staging            - Build staging Docker images"
    echo "  logs-staging             - View staging logs in real-time"
    echo "  makemigrations-staging   - Generate database migrations (Staging)"
    echo "  migrate-staging          - Run database migrations (Staging)"
    echo "  createsuperuser-staging  - Create admin user (Staging)"
    echo "  shell-staging            - Open Django shell (Staging)"
    echo "  collectstatic-staging    - Run collectstatic (Staging)"
    echo "  test-staging             - Run Django tests (Staging)"
    echo "  typecheck-staging        - Run TypeScript typecheck (Staging frontend)"
    echo "  buildcheck-staging       - Run Next.js buildcheck (Staging frontend)"
    echo "  seed-addons-staging      - Seed addons table in Staging database"
    echo "  install-frontend-staging - Install npm packages in Staging container"
    echo ""
    echo "=== PRODUCTION ENV (Prod) ==="
    echo "  up-prod                  - Start production environment"
    echo "  down-prod                - Stop production environment"
    echo "  logs-prod                - View production logs in real-time"
    echo "  build                    - Build production Docker images"
    echo "  makemigrations-prod      - Generate database migrations (Prod)"
    echo "  migrate-prod             - Run database migrations (Prod)"
    echo "  createsuperuser-prod     - Create admin user (Prod)"
    echo "  shell-prod               - Open Django shell (Prod)"
    echo "  collectstatic            - Run collectstatic in backend (Prod)"
    echo "  certbot                  - Request SSL certificate (Prod)"
    echo "  seed-addons-prod         - Seed addons table in Production database"
    echo "  install-frontend-prod    - Install npm packages in Production container"
    echo ""
    echo "=== UTILITIES ==="
    echo "  clean                    - Safe Docker cleanup (cache, networks, volumes)"
    echo "  help                     - Show this help"
}

case $COMMAND in
    # ── DEVELOPMENT ENV ──
    dev)
        echo "Starting Nectar Labs Dev Environment..."
        docker compose up -d --build "$@"
        ;;
    stop)
        echo "Stopping dev containers..."
        docker compose down "$@"
        ;;
    restart)
        echo "Restarting dev containers..."
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
    createsuperuser|createsuperuser-dev)
        run_django_cmd_dev createsuperuser "$@"
        ;;
    shell|shell-dev)
        run_django_cmd_dev shell "$@"
        ;;
    test|test-dev)
        run_django_cmd_dev test "$@"
        ;;
    frontend)
        cd frontend && npm run dev "$@"
        ;;
    typecheck)
        echo "Running TypeScript type-check in Dev frontend..."
        docker compose exec frontend npx tsc --noEmit "$@"
        ;;
    buildcheck)
        echo "Running Next.js build-check in Dev frontend..."
        docker compose exec frontend npm run build "$@"
        ;;
    seed-addons|seed-addons-dev)
        echo "Seeding addons in Local Dev..."
        if docker compose ps --services --filter "status=running" | grep -q "^backend$"; then
            docker compose exec backend python seed_addons.py "$@"
        else
            docker compose run --rm backend python seed_addons.py "$@"
        fi
        ;;
    install-frontend)
        echo "Installing frontend dependencies locally (via Docker Compose)..."
        run_npm_cmd_dev install "$@"
        ;;

    # ── STAGING ENV ──
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
    makemigrations-staging)
        run_django_cmd_staging makemigrations "$@"
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
    seed-addons-staging)
        echo "Seeding addons in Staging..."
        if docker compose -f docker-compose.staging.yml ps --services --filter "status=running" | grep -q "^backend-staging$"; then
            docker compose -f docker-compose.staging.yml exec backend-staging python seed_addons.py "$@"
        else
            docker compose -f docker-compose.staging.yml run --rm backend-staging python seed_addons.py "$@"
        fi
        ;;
    install-frontend-staging)
        echo "Installing frontend dependencies in Staging (via Docker Compose)..."
        run_npm_cmd_staging install "$@"
        ;;

    # ── PRODUCTION ENV ──
    up-prod)
        echo "Starting Nectar Labs Production Environment..."
        docker compose -f docker-compose.prod.yml up -d "$@"
        ;;
    down-prod)
        echo "Stopping Production Environment..."
        docker compose -f docker-compose.prod.yml down "$@"
        ;;
    logs-prod)
        if [ $# -eq 0 ]; then
            docker compose -f docker-compose.prod.yml logs -f --tail=100
        else
            docker compose -f docker-compose.prod.yml logs "$@"
        fi
        ;;
    build)
        docker compose -f docker-compose.prod.yml build "$@"
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
    collectstatic)
        echo "Running collectstatic..."
        if docker ps --filter "name=nectar_backend" --filter "status=running" | grep -q "nectar_backend"; then
            docker exec -it nectar_backend python manage.py collectstatic --no-input "$@"
        else
            docker compose -f docker-compose.prod.yml run --rm backend python manage.py collectstatic --no-input "$@"
        fi
        ;;
    certbot)
        DOMAIN=$1
        if [ -z "$DOMAIN" ]; then
            echo "Usage: ./nectar.sh certbot example.com"
            exit 1
        fi
        docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path=/var/www/certbot -d $DOMAIN -d www.$DOMAIN
        ;;
    seed-addons-prod)
        echo "Seeding addons in Production..."
        if docker compose -f docker-compose.prod.yml ps --services --filter "status=running" | grep -q "^backend$"; then
            docker compose -f docker-compose.prod.yml exec backend python seed_addons.py "$@"
        else
            docker compose -f docker-compose.prod.yml run --rm backend python seed_addons.py "$@"
        fi
        ;;
    install-frontend-prod)
        echo "Installing frontend dependencies in Production (via Docker Compose)..."
        run_npm_cmd_prod install "$@"
        ;;

    # ── UTILITIES ──
    clean)
        echo "Starting comprehensive and safe VPS cleanup..."
        echo ""
        echo "1. Removing stopped containers..."
        docker container prune -f
        
        echo "2. Removing dangling networks..."
        docker network prune -f
        
        echo "3. Removing dangling volumes (only unused/anonymous volumes)..."
        docker volume prune -f
        
        echo "4. Removing dangling/untagged images..."
        docker image prune -f
        
        echo "5. Removing Docker build cache..."
        docker builder prune -f
        
        # Check if running on Linux with journalctl to clean system logs
        if command -v journalctl &> /dev/null; then
            echo "6. Vacuuming system logs (journald) to 100MB..."
            sudo journalctl --vacuum-size=100M 2>/dev/null || echo "   (Skip: sudo privileges required to vacuum logs)"
        fi
        
        # Check if running on Debian/Ubuntu to clean apt cache
        if command -v apt-get &> /dev/null; then
            echo "7. Cleaning APT package cache..."
            sudo apt-get autoclean -y 2>/dev/null || echo "   (Skip: sudo privileges required to clean APT cache)"
        fi
        
        echo ""
        echo "System cleanup complete! Disk space reclaimed successfully."
        ;;
    *)
        show_help
        ;;
esac
