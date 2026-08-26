#!/bin/bash

# Nectar Labs CLI
# Script to manage Nectar Labs environments (Dev, Staging, Production)

COMMAND=$1
if [ $# -gt 0 ]; then
    shift
fi

# Detect Container runtime and compose provider (docker or podman)
if command -v podman &> /dev/null && command -v podman-compose &> /dev/null; then
    DOCKER_BIN="podman"
    COMPOSE_BIN="podman-compose"
elif command -v docker &> /dev/null; then
    DOCKER_BIN="docker"
    if docker compose version &> /dev/null 2>&1; then
        COMPOSE_BIN="docker compose"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_BIN="docker-compose"
    fi
elif command -v podman &> /dev/null; then
    DOCKER_BIN="podman"
    if command -v podman-compose &> /dev/null; then
        COMPOSE_BIN="podman-compose"
    elif podman compose version &> /dev/null 2>&1; then
        COMPOSE_BIN="podman compose"
    fi
else
    echo "==========================================="
    echo "  [ERROR] No container runtime detected!   "
    echo "==========================================="
    echo "No se encontró ni 'docker' ni 'podman' en el PATH del sistema."
    exit 1
fi

# Detect rootless Podman socket and export DOCKER_SOCK if not set
if [ -z "$DOCKER_SOCK" ] || [ ! -e "$DOCKER_SOCK" ]; then
    if [ -S "$XDG_RUNTIME_DIR/podman/podman.sock" ]; then
        export DOCKER_SOCK="$XDG_RUNTIME_DIR/podman/podman.sock"
    elif [ -S "/run/user/$(id -u)/podman/podman.sock" ]; then
        export DOCKER_SOCK="/run/user/$(id -u)/podman/podman.sock"
    elif [ -S "/var/run/docker.sock" ] && [ -r "/var/run/docker.sock" ]; then
        export DOCKER_SOCK="/var/run/docker.sock"
    else
        mkdir -p ./docker/dummy_sock
        export DOCKER_SOCK="$(pwd)/docker/dummy_sock"
    fi
fi

# Ensure external network 'prod_network' exists
ensure_network() {
    local net_name="prod_network"
    if command -v podman >/dev/null 2>&1; then
        if ! podman network exists "$net_name" 2>/dev/null; then
            echo "🌐 Creando red de Podman/Docker '$net_name'..."
            podman network create "$net_name" 2>/dev/null || true
        fi
    elif command -v docker >/dev/null 2>&1; then
        if ! docker network inspect "$net_name" >/dev/null 2>&1; then
            echo "🌐 Creando red de Docker '$net_name'..."
            docker network create "$net_name" 2>/dev/null || true
        fi
    fi
}

# Helper function to check container status
is_container_running() {
    local container_name=$1
    if [ "$DOCKER_BIN" = "podman" ]; then
        podman ps --format "{{.Names}}" 2>/dev/null | grep -q "^${container_name}$"
    else
        docker ps --format "{{.Names}}" 2>/dev/null | grep -q "^${container_name}$"
    fi
}

# Helper function to run Django manage.py commands in Dev
run_django_cmd_dev() {
    local tty_flag=""
    if [ -t 0 ]; then
        tty_flag="-it"
    fi
    if is_container_running "nectar_backend"; then
        $DOCKER_BIN exec $tty_flag nectar_backend python manage.py "$@"
    elif $COMPOSE_BIN ps 2>/dev/null | grep -q "backend"; then
        $COMPOSE_BIN exec $tty_flag backend python manage.py "$@"
    else
        $COMPOSE_BIN run --rm $tty_flag -w /app backend python manage.py "$@"
    fi
}

# Helper function to run Django manage.py commands in Staging
run_django_cmd_staging() {
    local tty_flag=""
    if [ -t 0 ]; then
        tty_flag="-it"
    fi
    if is_container_running "nectar_backend_staging"; then
        $DOCKER_BIN exec $tty_flag nectar_backend_staging python manage.py "$@"
    elif $COMPOSE_BIN -f docker-compose.staging.yml ps 2>/dev/null | grep -q "backend-staging"; then
        $COMPOSE_BIN -f docker-compose.staging.yml exec $tty_flag backend-staging python manage.py "$@"
    else
        $COMPOSE_BIN -f docker-compose.staging.yml run --rm $tty_flag -w /app backend-staging python manage.py "$@"
    fi
}

# Helper function to run Django manage.py commands in Production
run_django_cmd_prod() {
    local tty_flag=""
    if [ -t 0 ]; then
        tty_flag="-it"
    fi
    if is_container_running "nectar_backend_prod" || is_container_running "nectar_backend"; then
        local c_name="nectar_backend"
        if is_container_running "nectar_backend_prod"; then c_name="nectar_backend_prod"; fi
        $DOCKER_BIN exec $tty_flag $c_name python manage.py "$@"
    elif $COMPOSE_BIN -f docker-compose.prod.yml ps 2>/dev/null | grep -q "backend"; then
        $COMPOSE_BIN -f docker-compose.prod.yml exec $tty_flag backend python manage.py "$@"
    else
        $COMPOSE_BIN -f docker-compose.prod.yml run --rm $tty_flag -w /app backend python manage.py "$@"
    fi
}

# Helper function to run npm commands in Dev frontend
run_npm_cmd_dev() {
    local tty_flag=""
    if [ -t 0 ]; then tty_flag="-it"; fi
    if is_container_running "nectar_frontend"; then
        $DOCKER_BIN exec $tty_flag nectar_frontend npm "$@"
    elif $COMPOSE_BIN ps 2>/dev/null | grep -q "frontend"; then
        $COMPOSE_BIN exec $tty_flag frontend npm "$@"
    elif [ -d "frontend" ] && command -v npm &> /dev/null; then
        (cd frontend && npm "$@")
    else
        $COMPOSE_BIN run --rm $tty_flag -w /app frontend npm "$@"
    fi
}

# Helper function to run npm commands in Staging frontend
run_npm_cmd_staging() {
    local tty_flag=""
    if [ -t 0 ]; then tty_flag="-it"; fi
    if is_container_running "nectar_frontend_staging"; then
        $DOCKER_BIN exec $tty_flag nectar_frontend_staging npm "$@"
    elif $COMPOSE_BIN -f docker-compose.staging.yml ps 2>/dev/null | grep -q "frontend-staging"; then
        $COMPOSE_BIN -f docker-compose.staging.yml exec $tty_flag frontend-staging npm "$@"
    else
        $COMPOSE_BIN -f docker-compose.staging.yml run --rm $tty_flag -w /app frontend-staging npm "$@"
    fi
}

# Helper function to run npm commands in Production frontend
run_npm_cmd_prod() {
    local tty_flag=""
    if [ -t 0 ]; then tty_flag="-it"; fi
    if is_container_running "nectar_frontend_prod"; then
        $DOCKER_BIN exec $tty_flag nectar_frontend_prod npm "$@"
    elif $COMPOSE_BIN -f docker-compose.prod.yml ps 2>/dev/null | grep -q "frontend"; then
        $COMPOSE_BIN -f docker-compose.prod.yml exec $tty_flag frontend npm "$@"
    else
        $COMPOSE_BIN -f docker-compose.prod.yml run --rm $tty_flag -w /app frontend npm "$@"
    fi
}

# Helper function to find and remove conflicting containers from other project namespaces
remove_conflicting_containers() {
    local container_names=("$@")
    for container in "${container_names[@]}"; do
        if $DOCKER_BIN ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^${container}$" || $DOCKER_BIN ps -a --format '{{.Name}}' 2>/dev/null | grep -q "^${container}$"; then
            echo "Warning: Container '${container}' already exists."
            echo "Removing existing container '${container}' to prevent naming conflicts..."
            $DOCKER_BIN rm -f "${container}" 2>/dev/null || true
        fi
    done
}

show_help() {
    echo "==========================================="
    echo "          Nectar Labs CLI v2.0             "
    echo "==========================================="
    echo ""
    echo "Usage: ./nectar.sh [command]"
    echo ""
    echo "=== DEVELOPMENT ENV (Local) ==="
    echo "  dev                      - Start development environment (Docker)"
    echo "  deploy / deploy-dev      - Build and start development environment"
    echo "  stop                     - Stop development containers"
    echo "  restart                  - Restart development containers"
    echo "  status                   - Show status of dev containers"
    echo "  logs                     - Show real-time dev logs"
    echo "  manage [args...]         - Run ANY Django manage.py command (Dev)"
    echo "  makemigrations           - Generate database migrations (Dev)"
    echo "  migrate                  - Run database migrations (Dev)"
    echo "  createsuperuser          - Create Django admin user (Dev)"
    echo "  shell                    - Open Django shell (Dev)"
    echo "  test                     - Run Django tests (Dev)"
    echo "  pycheck                  - Run Python syntax check (py_compile)"
    echo "  frontend                 - Run Next.js frontend locally (npm run dev)"
    echo "  test-frontend            - Run Frontend tests (Playwright / npm test)"
    echo "  install-playwright       - Download Playwright browser binaries"
    echo "  typecheck                - Run TypeScript typecheck (Dev frontend)"
    echo "  buildcheck               - Run Next.js buildcheck (Dev frontend)"
    echo "  seed-addons              - Seed addons table in Dev database"
    echo "  seed-plans               - Seed plans table in Dev database"
    echo "  backup-db                - Execute database backup script (Dev)"
    echo "  install-frontend         - Install npm packages in local Dev"
    echo ""
    echo "=== STAGING ENV ==="
    echo "  up-staging               - Start staging environment"
    echo "  deploy-staging           - Build and start staging environment"
    echo "  down-staging             - Stop staging environment"
    echo "  restart-staging          - Restart staging environment"
    echo "  build-staging            - Build staging Docker images"
    echo "  status-staging           - Show status of staging containers"
    echo "  logs-staging             - View staging logs in real-time"
    echo "  manage-staging [args...] - Run ANY Django manage.py command (Staging)"
    echo "  makemigrations-staging   - Generate database migrations (Staging)"
    echo "  migrate-staging          - Run database migrations (Staging)"
    echo "  createsuperuser-staging  - Create admin user (Staging)"
    echo "  shell-staging            - Open Django shell (Staging)"
    echo "  collectstatic-staging    - Run collectstatic (Staging)"
    echo "  test-staging             - Run Django tests (Staging)"
    echo "  pycheck-staging         - Run Python syntax check (Staging)"
    echo "  typecheck-staging        - Run TypeScript typecheck (Staging frontend)"
    echo "  buildcheck-staging       - Run Next.js buildcheck (Staging frontend)"
    echo "  seed-addons-staging      - Seed addons table in Staging database"
    echo "  seed-plans-staging       - Seed plans table in Staging database"
    echo "  install-frontend-staging - Install npm packages in Staging container"
    echo ""
    echo "=== PRODUCTION ENV (Prod) ==="
    echo "  up-prod                  - Start production environment"
    echo "  deploy-prod              - Build and start production environment"
    echo "  down-prod                - Stop production environment"
    echo "  restart-prod             - Restart production environment"
    echo "  status-prod              - Show status of production containers"
    echo "  logs-prod                - View production logs in real-time"
    echo "  build                    - Build production Docker images"
    echo "  manage-prod [args...]    - Run ANY Django manage.py command (Prod)"
    echo "  makemigrations-prod      - Generate database migrations (Prod)"
    echo "  migrate-prod             - Run database migrations (Prod)"
    echo "  createsuperuser-prod     - Create admin user (Prod)"
    echo "  shell-prod               - Open Django shell (Prod)"
    echo "  collectstatic            - Run collectstatic in backend (Prod)"
    echo "  pycheck-prod             - Run Python syntax check (Prod)"
    echo "  certbot                  - Request SSL certificate (Prod)"
    echo "  seed-addons-prod         - Seed addons table in Production database"
    echo "  seed-plans-prod          - Seed plans table in Production database"
    echo "  install-frontend-prod    - Install npm packages in Production container"
    echo ""
    echo "=== UTILITIES ==="
    echo "  clean [--all|-a]        - Safe Docker cleanup (cache, networks, volumes)"
    echo "  help                     - Show this help screen"
}

case $COMMAND in
    # ── DEVELOPMENT ENV ──
    dev)
        echo "Starting Nectar Labs Dev Environment..."
        ensure_network
        remove_conflicting_containers nectar_backend nectar_frontend nectar_nginx nectar_redis
        $COMPOSE_BIN up -d --build "$@"
        ;;
    deploy|deploy-dev)
        echo "Deploying Nectar Labs Dev Environment..."
        ensure_network
        remove_conflicting_containers nectar_backend nectar_frontend nectar_nginx nectar_redis
        $COMPOSE_BIN up -d --build "$@"
        ;;
    stop)
        echo "Stopping dev containers..."
        $COMPOSE_BIN down "$@"
        ;;
    restart)
        echo "Restarting dev containers..."
        $COMPOSE_BIN restart "$@"
        ;;
    status|status-dev)
        $COMPOSE_BIN ps "$@"
        ;;
    logs)
        if [ $# -eq 0 ]; then
            $COMPOSE_BIN logs -f --tail=100
        else
            $COMPOSE_BIN logs "$@"
        fi
        ;;
    manage|manage-dev)
        run_django_cmd_dev "$@"
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
    pycheck)
        echo "Running Python syntax check (py_compile)..."
        if is_container_running "nectar_backend"; then
            $DOCKER_BIN exec nectar_backend python -m py_compile config/settings.py apps/performance/views.py
        elif $COMPOSE_BIN ps 2>/dev/null | grep -q "backend"; then
            $COMPOSE_BIN exec backend python -m py_compile config/settings.py apps/performance/views.py
        elif command -v python3 &> /dev/null; then
            (cd backend && python3 -m py_compile config/settings.py apps/performance/views.py)
        else
            $COMPOSE_BIN run --rm -w /app backend python -m py_compile config/settings.py apps/performance/views.py
        fi
        ;;
    frontend)
        cd frontend && npm run dev "$@"
        ;;
    install-playwright)
        echo "Installing Playwright Chromium browser..."
        (cd frontend && npx playwright install chromium)
        ;;
    test-frontend)
        echo "Running Frontend tests (Playwright Chromium)..."
        (cd frontend && npx playwright test --project=chromium "$@")
        ;;
    typecheck)
        echo "Running TypeScript type-check in Dev frontend..."
        if is_container_running "nectar_frontend"; then
            $DOCKER_BIN exec nectar_frontend npx tsc --noEmit "$@"
        else
            $COMPOSE_BIN exec frontend npx tsc --noEmit "$@"
        fi
        ;;
    buildcheck)
        echo "Running Next.js build-check in Dev frontend..."
        if is_container_running "nectar_frontend"; then
            $DOCKER_BIN exec nectar_frontend npm run build "$@"
        else
            $COMPOSE_BIN exec frontend npm run build "$@"
        fi
        ;;
    seed-addons|seed-addons-dev)
        echo "Seeding addons in Local Dev..."
        if is_container_running "nectar_backend"; then
            $DOCKER_BIN exec nectar_backend python seed_addons.py "$@"
        else
            $COMPOSE_BIN run --rm backend python seed_addons.py "$@"
        fi
        ;;
    seed-plans|seed-plans-dev)
        echo "Seeding plans in Local Dev..."
        if is_container_running "nectar_backend"; then
            $DOCKER_BIN exec nectar_backend python seed_plans.py "$@"
        else
            $COMPOSE_BIN run --rm backend python seed_plans.py "$@"
        fi
        ;;
    backup-db)
        echo "Executing database backup script in Local Dev..."
        if is_container_running "nectar_backend"; then
            $DOCKER_BIN exec nectar_backend python backup_db.py "$@"
        else
            $COMPOSE_BIN run --rm backend python backup_db.py "$@"
        fi
        ;;
    install-frontend)
        echo "Installing frontend dependencies locally (via Docker Compose)..."
        run_npm_cmd_dev install "$@"
        ;;

    # ── STAGING ENV ──
    up-staging)
        echo "Starting Nectar Labs Staging Environment..."
        ensure_network
        remove_conflicting_containers nectar_backend_staging nectar_frontend_staging nectar_redis_staging nectar_realtime_staging
        $COMPOSE_BIN -f docker-compose.staging.yml up -d --build "$@"
        ;;
    deploy-staging)
        echo "Deploying Nectar Labs Staging Environment..."
        ensure_network
        remove_conflicting_containers nectar_backend_staging nectar_frontend_staging nectar_redis_staging nectar_realtime_staging
        $COMPOSE_BIN -f docker-compose.staging.yml up -d --build "$@"
        ;;
    down-staging|stop-staging)
        echo "Stopping Staging Environment..."
        $COMPOSE_BIN -f docker-compose.staging.yml down "$@"
        ;;
    restart-staging)
        echo "Restarting Staging Environment..."
        $COMPOSE_BIN -f docker-compose.staging.yml restart "$@"
        ;;
    build-staging)
        echo "Building Staging Images..."
        $COMPOSE_BIN -f docker-compose.staging.yml build "$@"
        ;;
    status-staging)
        $COMPOSE_BIN -f docker-compose.staging.yml ps "$@"
        ;;
    logs-staging)
        nginx_c=""
        if is_container_running "nectar_nginx_staging"; then
            nginx_c="nectar_nginx_staging"
        elif is_container_running "prod_nginx"; then
            nginx_c="prod_nginx"
        elif is_container_running "prod-nginx"; then
            nginx_c="prod-nginx"
        elif is_container_running "nectar_nginx"; then
            nginx_c="nectar_nginx"
        fi

        if [ $# -eq 0 ]; then
            if [ -n "$nginx_c" ]; then
                $DOCKER_BIN logs -f --tail=100 nectar_backend_staging nectar_frontend_staging nectar_realtime_staging "$nginx_c" 2>/dev/null || $COMPOSE_BIN -f docker-compose.staging.yml logs -f --tail=100
            else
                $COMPOSE_BIN -f docker-compose.staging.yml logs -f --tail=100
            fi
        else
            $COMPOSE_BIN -f docker-compose.staging.yml logs "$@"
        fi
        ;;
    manage-staging)
        run_django_cmd_staging "$@"
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
    pycheck-staging)
        echo "Running Python syntax check (py_compile) in Staging..."
        if is_container_running "nectar_backend_staging"; then
            $DOCKER_BIN exec nectar_backend_staging python -m py_compile config/settings.py apps/performance/views.py
        else
            $COMPOSE_BIN -f docker-compose.staging.yml run --rm -w /app backend-staging python -m py_compile config/settings.py apps/performance/views.py
        fi
        ;;
    typecheck-staging)
        echo "Running TypeScript type-check in Staging frontend..."
        $COMPOSE_BIN -f docker-compose.staging.yml exec frontend-staging npx tsc --noEmit "$@"
        ;;
    buildcheck-staging)
        echo "Running Next.js build-check in Staging frontend..."
        $COMPOSE_BIN -f docker-compose.staging.yml exec frontend-staging npm run build "$@"
        ;;
    seed-addons-staging)
        echo "Seeding addons in Staging..."
        if is_container_running "nectar_backend_staging"; then
            $DOCKER_BIN exec nectar_backend_staging python seed_addons.py "$@"
        else
            $COMPOSE_BIN -f docker-compose.staging.yml run --rm backend-staging python seed_addons.py "$@"
        fi
        ;;
    seed-plans-staging)
        echo "Seeding plans in Staging..."
        if is_container_running "nectar_backend_staging"; then
            $DOCKER_BIN exec nectar_backend_staging python seed_plans.py "$@"
        else
            $COMPOSE_BIN -f docker-compose.staging.yml run --rm backend-staging python seed_plans.py "$@"
        fi
        ;;
    install-frontend-staging)
        echo "Installing frontend dependencies in Staging (via Docker Compose)..."
        run_npm_cmd_staging install "$@"
        ;;

    # ── PRODUCTION ENV ──
    up-prod)
        echo "Starting Nectar Labs Production Environment..."
        ensure_network
        remove_conflicting_containers nectar_backend_prod nectar_backend nectar_frontend_prod nectar_frontend
        $COMPOSE_BIN --env-file .env.prod -f docker-compose.prod.yml up -d "$@"
        ;;
    deploy-prod)
        echo "Deploying Nectar Labs Production Environment..."
        ensure_network
        remove_conflicting_containers nectar_backend_prod nectar_backend nectar_frontend_prod nectar_frontend
        $COMPOSE_BIN --env-file .env.prod -f docker-compose.prod.yml up -d --build "$@"
        ;;
    down-prod|stop-prod)
        echo "Stopping Production Environment..."
        $COMPOSE_BIN --env-file .env.prod -f docker-compose.prod.yml down "$@"
        ;;
    restart-prod)
        echo "Restarting Production Environment..."
        $COMPOSE_BIN --env-file .env.prod -f docker-compose.prod.yml restart "$@"
        ;;
    status-prod)
        $COMPOSE_BIN --env-file .env.prod -f docker-compose.prod.yml ps "$@"
        ;;
    logs-prod)
        if [ $# -eq 0 ]; then
            $COMPOSE_BIN --env-file .env.prod -f docker-compose.prod.yml logs -f --tail=100
        else
            $COMPOSE_BIN --env-file .env.prod -f docker-compose.prod.yml logs "$@"
        fi
        ;;
    build)
        $COMPOSE_BIN --env-file .env.prod -f docker-compose.prod.yml build "$@"
        ;;
    manage-prod)
        run_django_cmd_prod "$@"
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
        echo "Running collectstatic in Production..."
        run_django_cmd_prod collectstatic --no-input "$@"
        ;;
    pycheck-prod)
        echo "Running Python syntax check (py_compile) in Production..."
        if is_container_running "nectar_backend_prod" || is_container_running "nectar_backend"; then
            c_name="nectar_backend"
            if is_container_running "nectar_backend_prod"; then c_name="nectar_backend_prod"; fi
            $DOCKER_BIN exec $c_name python -m py_compile config/settings.py apps/performance/views.py
        else
            $COMPOSE_BIN -f docker-compose.prod.yml run --rm -w /app backend python -m py_compile config/settings.py apps/performance/views.py
        fi
        ;;
    certbot)
        DOMAIN=$1
        if [ -z "$DOMAIN" ]; then
            echo "Usage: ./nectar.sh certbot example.com"
            exit 1
        fi
        $COMPOSE_BIN -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path=/var/www/certbot -d $DOMAIN -d www.$DOMAIN
        ;;
    seed-addons-prod)
        echo "Seeding addons in Production..."
        if is_container_running "nectar_backend_prod" || is_container_running "nectar_backend"; then
            c_name="nectar_backend"
            if is_container_running "nectar_backend_prod"; then c_name="nectar_backend_prod"; fi
            $DOCKER_BIN exec $c_name python seed_addons.py "$@"
        else
            $COMPOSE_BIN -f docker-compose.prod.yml run --rm backend python seed_addons.py "$@"
        fi
        ;;
    seed-plans-prod)
        echo "Seeding plans in Production..."
        if is_container_running "nectar_backend_prod" || is_container_running "nectar_backend"; then
            c_name="nectar_backend"
            if is_container_running "nectar_backend_prod"; then c_name="nectar_backend_prod"; fi
            $DOCKER_BIN exec $c_name python seed_plans.py "$@"
        else
            $COMPOSE_BIN -f docker-compose.prod.yml run --rm backend python seed_plans.py "$@"
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
        DEEP_PRUNING=false
        if [ "$1" = "--all" ] || [ "$1" = "-a" ]; then
            DEEP_PRUNING=true
        fi

        echo "1. Removing stopped containers..."
        $DOCKER_BIN container prune -f
        
        echo "2. Removing dangling networks..."
        $DOCKER_BIN network prune -f
        
        echo "3. Removing dangling volumes..."
        $DOCKER_BIN volume prune -f
        
        echo "4. Removing dangling/untagged images..."
        $DOCKER_BIN image prune -f
        
        echo "5. Removing Docker build cache..."
        $DOCKER_BIN builder prune -f 2>/dev/null || true
        
        if [ "$DEEP_PRUNING" = true ]; then
            echo "   Executing deep system prune..."
            $DOCKER_BIN system prune -a --volumes -f
        fi
        
        if command -v journalctl &> /dev/null; then
            echo "6. Vacuuming system logs (journald) to 100MB..."
            sudo journalctl --vacuum-size=100M 2>/dev/null || echo "   (Skip: sudo privileges required to vacuum logs)"
        fi
        
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
