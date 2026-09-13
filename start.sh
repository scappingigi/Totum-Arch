#!/usr/bin/env bash
#
# Project ACE Architecture — Server Control Script
# Controls Dev servers (8011/8010) and Prod servers (8022/8020)
#
# Usage:
#   ./start.sh          # Auto-detects Dev vs Prod based on current directory
#   ./start.sh dev      # Starts Dev Master (8011) & Dev Mirror (8010)
#   ./start.sh prod     # Starts Prod Master (8022) & Prod Mirror (8020)
#   ./start.sh all      # Starts both Dev and Prod servers
#   ./start.sh stop     # Stops servers
#   ./start.sh status   # Shows current status of all servers
#   ./start.sh restart  # Restarts servers
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Resolve Prod and Dev root directories
if [[ "$SCRIPT_DIR" == */Dev ]]; then
  DEV_DIR="$SCRIPT_DIR"
  PROD_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
  DEFAULT_ENV="dev"
else
  PROD_DIR="$SCRIPT_DIR"
  DEV_DIR="$SCRIPT_DIR/Dev"
  DEFAULT_ENV="prod"
fi

kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "  → Stopping existing process on port $port (PID: $pids)..."
    kill $pids 2>/dev/null || true
    sleep 0.4
    kill -9 $pids 2>/dev/null || true
  fi
}

start_server() {
  local port=$1
  local mode=$2   # "Master" or "Mirror"
  local env=$3    # "Dev" or "Prod"
  local dir=$4

  mkdir -p "$dir/logs"
  local log_file="$dir/logs/${env,,}_${port}.log"

  kill_port "$port"
  echo "  → Launching $env $mode server on port $port..."
  (cd "$dir" && setsid -f python3 server.py "$port" > "$log_file" 2>&1 < /dev/null)
}

verify_port() {
  local port=$1
  local max_attempts=15
  local count=0
  while [ $count -lt $max_attempts ]; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/" 2>/dev/null | grep -q "200"; then
      return 0
    fi
    sleep 0.3
    count=$((count + 1))
  done
  return 1
}

start_dev() {
  echo ""
  echo "=========================================="
  echo "  Starting Project ACE (Development)"
  echo "=========================================="
  if [ ! -d "$DEV_DIR" ]; then
    echo "Error: Dev directory not found at $DEV_DIR"
    return 1
  fi
  start_server 8011 "Master" "Dev" "$DEV_DIR"
  start_server 8010 "Mirror" "Dev" "$DEV_DIR"

  echo "  → Verifying health endpoints..."
  if verify_port 8011 && verify_port 8010; then
    echo ""
    echo "  ✓ Dev Master: http://localhost:8011 (Controls & Editing)"
    echo "  ✓ Dev Mirror: http://localhost:8010 (Read-only / Presentation)"
    echo "=========================================="
  else
    echo "  ⚠ Warning: One or more dev servers did not respond on time. Check $DEV_DIR/logs/"
  fi
}

start_prod() {
  echo ""
  echo "=========================================="
  echo "  Starting Project ACE (Production)"
  echo "=========================================="
  if [ ! -d "$PROD_DIR" ]; then
    echo "Error: Prod directory not found at $PROD_DIR"
    return 1
  fi
  start_server 8022 "Master" "Prod" "$PROD_DIR"
  start_server 8020 "Mirror" "Prod" "$PROD_DIR"

  echo "  → Verifying health endpoints..."
  if verify_port 8022 && verify_port 8020; then
    echo ""
    echo "  ✓ Prod Master: http://localhost:8022 (Master / Live)"
    echo "  ✓ Prod Mirror: http://localhost:8020 (Presentation Mirror)"
    echo "=========================================="
  else
    echo "  ⚠ Warning: One or more prod servers did not respond on time. Check $PROD_DIR/logs/"
  fi
}

stop_servers() {
  local target=${1:-$DEFAULT_ENV}
  echo ""
  echo "=========================================="
  echo "  Stopping Project ACE Servers ($target)"
  echo "=========================================="
  if [ "$target" = "dev" ] || [ "$target" = "all" ]; then
    kill_port 8011
    kill_port 8010
    echo "  ✓ Stopped Dev servers (8011, 8010)"
  fi
  if [ "$target" = "prod" ] || [ "$target" = "all" ]; then
    kill_port 8022
    kill_port 8020
    echo "  ✓ Stopped Prod servers (8022, 8020)"
  fi
  echo "=========================================="
}

check_status() {
  echo ""
  echo "=========================================="
  echo "  Project ACE Server Status"
  echo "=========================================="
  for port in 8011 8010 8022 8020; do
    local pids
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    local desc=""
    case $port in
      8011) desc="Dev Master  " ;;
      8010) desc="Dev Mirror  " ;;
      8022) desc="Prod Master " ;;
      8020) desc="Prod Mirror " ;;
    esac

    if [ -n "$pids" ]; then
      local code
      code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/" 2>/dev/null || echo "ERR")
      echo "  ● Port $port ($desc): RUNNING (PID: $pids, HTTP $code) → http://localhost:$port"
    else
      echo "  ○ Port $port ($desc): STOPPED"
    fi
  done
  echo "=========================================="
}

ACTION="${1:-$DEFAULT_ENV}"

case "$ACTION" in
  dev)
    start_dev
    ;;
  prod)
    start_prod
    ;;
  all)
    start_dev
    start_prod
    ;;
  stop)
    stop_servers "${2:-$DEFAULT_ENV}"
    ;;
  stop-all)
    stop_servers "all"
    ;;
  status)
    check_status
    ;;
  restart)
    stop_servers "${2:-$DEFAULT_ENV}"
    sleep 0.5
    if [ "${2:-$DEFAULT_ENV}" = "dev" ]; then
      start_dev
    elif [ "${2:-$DEFAULT_ENV}" = "prod" ]; then
      start_prod
    else
      start_dev
      start_prod
    fi
    ;;
  *)
    echo "Usage: $0 [dev|prod|all|stop|status|restart]"
    exit 1
    ;;
esac
