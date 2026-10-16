#!/bin/sh
set -e

# If host SSH directory is mounted, copy and fix ownership/permissions for root
if [ -d "/root/.ssh-host" ]; then
    mkdir -p /root/.ssh
    cp -r /root/.ssh-host/. /root/.ssh/ 2>/dev/null || true
    chown -R root:root /root/.ssh
    chmod 700 /root/.ssh
    chmod 600 /root/.ssh/* 2>/dev/null || true
fi

exec "$@"
