#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh  —  DSA Tracker deploy helper
# Usage:
#   ./deploy.sh           → build & start with Docker Compose
#   ./deploy.sh local     → run locally with Node (no Docker)
#   ./deploy.sh stop      → stop Docker container
#   ./deploy.sh logs      → tail container logs
# ─────────────────────────────────────────────────────────────────────────────
set -e

MODE=${1:-docker}

case "$MODE" in

  local)
    echo "▶ Starting locally on http://localhost:3000"
    npm install
    node server.js
    ;;

  stop)
    echo "■ Stopping container..."
    docker compose down
    ;;

  logs)
    docker compose logs -f
    ;;

  docker|*)
    echo "▶ Building & starting with Docker Compose..."
    docker compose up --build -d
    echo ""
    echo "✓ Running at http://localhost:3000"
    echo ""
    echo "Useful commands:"
    echo "  ./deploy.sh logs   — tail logs"
    echo "  ./deploy.sh stop   — stop container"
    ;;
esac
