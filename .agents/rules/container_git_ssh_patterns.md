# Containerized Git & SSH Credentials Invariants

When designing, configuring, or debugging Docker containers that run Git operations using host credentials:

1. **SSH Staging Mount Pattern:**
   - Never mount host `~/.ssh` directly to `/root/.ssh:ro` in containers running as root. This causes OpenSSH `Bad owner or permissions on /root/.ssh/config` due to host non-root UID (1000) vs container root UID (0) mismatch.
   - Mount to a staging directory: `- ${DOCKGE_SSH_DIR:-~/.ssh}:/root/.ssh-host:ro`.
   - In container entrypoint, sync to `/root/.ssh`:
     ```sh
     if [ -d "/root/.ssh-host" ]; then
         mkdir -p /root/.ssh
         cp -r /root/.ssh-host/. /root/.ssh/ 2>/dev/null || true
         chown -R root:root /root/.ssh
         chmod 700 /root/.ssh
         chmod 600 /root/.ssh/* 2>/dev/null || true
     fi
     ```

2. **Git Safe Directory:**
   - Containers executing Git against host-mounted volumes must trust all paths to prevent `fatal: detected dubious ownership in repository`:
     ```sh
     git config --system --add safe.directory '*'
     ```

3. **Passphrase-less Deploy Keys:**
   - Automated/UI-driven Git processes have no TTY to prompt for SSH key passphrases. Keys mounted into containers must have empty passphrases (`ssh-keygen -N ""`).

4. **Image Prerequisites:**
   - Minimal base images (like `node:*-slim` or `alpine`) omit `git` and `openssh-client`. Explicitly install `git` and `openssh-client` in the Dockerfile base stage if container executes Git over SSH.
