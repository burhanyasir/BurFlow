#!/bin/bash
# ─── Certbot Deploy Hook — Reload Nginx After SSL Renewal ──────────
# Installed at: /etc/letsencrypt/renewal-hooks/deploy/ce-nginx-reload.sh
#
# Certbot runs this hook after every successful certificate renewal.
# It reloads Nginx so the new certificates are picked up without
# any manual intervention or downtime.
#
# Installation:
#   sudo cp renew-hook.sh /etc/letsencrypt/renewal-hooks/deploy/ce-nginx-reload.sh
#   sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/ce-nginx-reload.sh
#
# Test the hook:
#   sudo certbot renew --dry-run
#
# Verify renewal timer is active:
#   sudo systemctl status certbot.timer

set -euo pipefail

RELOAD_LOG="/var/log/ce-ssl-renew.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if command -v docker &>/dev/null && docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'ce-reverse-proxy\|conversation-engine'; then
    echo "${TIMESTAMP} Reloading Nginx via Docker..." >> "${RELOAD_LOG}"
    docker exec "$(docker ps --filter name=ce-reverse-proxy --filter name=conversation-engine-nginx -q | head -1)" nginx -s reload 2>/dev/null || \
    docker compose -f /opt/conversation-engine/docker/docker-compose.yml exec nginx nginx -s reload 2>/dev/null || \
    echo "${TIMESTAMP} WARNING: Could not reload Docker Nginx" >> "${RELOAD_LOG}"
elif command -v nginx &>/dev/null; then
    echo "${TIMESTAMP} Reloading Nginx directly..." >> "${RELOAD_LOG}"
    nginx -s reload || nginx -t && systemctl reload nginx
elif command -v systemctl &>/dev/null; then
    echo "${TIMESTAMP} Reloading Nginx via systemctl..." >> "${RELOAD_LOG}"
    systemctl reload nginx
fi

echo "${TIMESTAMP} SSL renewal complete. Nginx reloaded." >> "${RELOAD_LOG}"
