# Deployment Guide — AZH Monitoring

Production deployment on an **Azure VM (Ubuntu)** using **Docker** and **Traefik** as reverse proxy with automatic SSL via Let's Encrypt.

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| Azure VM | Ubuntu 22.04 LTS, minimum 2 vCPU / 4 GB RAM |
| Open ports | 80 (HTTP), 443 (HTTPS), 22 (SSH) via NSG inbound rules |
| Domain name | A/AAAA record pointing to the VM's public IP |
| SSH access | Key-based authentication to the VM |

---

## 1. Connect to the VM

```bash
ssh azureuser@<VM_PUBLIC_IP>
```

---

## 2. Install Docker

```bash
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Allow current user to run docker without sudo
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

---

## 3. Clone the Repository

```bash
git clone https://github.com/kimverperulatus/azh-monitoring.git
cd azh-monitoring
```

---

## 4. Configure Environment Variables

Create the `.env` file — **never commit this file to git**.

```bash
nano .env
```

Paste the following and fill in all values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic AI
ANTHROPIC_API_KEY=your-anthropic-api-key

# Traefik / Domain
DOMAIN=yourdomain.com
ACME_EMAIL=devops@yourdomain.com
```

Save with `Ctrl+O`, exit with `Ctrl+X`.

> **Where to get the keys:**
> - Supabase keys: Supabase Dashboard → Project Settings → API
> - Anthropic key: console.anthropic.com → API Keys
> - `DOMAIN`: the domain/subdomain pointing to this VM (e.g. `monitoring.carebox.com`)
> - `ACME_EMAIL`: email for Let's Encrypt expiry notifications

---

## 5. Verify DNS

Before deploying, confirm your domain resolves to the VM:

```bash
nslookup yourdomain.com
# Should return the VM's public IP
```

> Traefik will fail to obtain an SSL certificate if the domain doesn't point to the VM.

---

## 6. Build and Start

```bash
docker compose up -d --build
```

This will:
1. Build the Next.js app image (takes 3–5 minutes on first run)
2. Start Traefik (handles SSL and routing)
3. Start the app container
4. Automatically obtain a Let's Encrypt SSL certificate

Check that both containers are running:

```bash
docker compose ps
```

Expected output:
```
NAME       STATUS    PORTS
traefik    running   0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
app        running
```

---

## 7. Verify Deployment

Open your browser and navigate to:

```
https://yourdomain.com
```

You should see the login page with a valid SSL certificate.

---

## Updating the Application

When new code is pushed to the `main` branch:

```bash
cd ~/azh-monitoring
git pull
docker compose up -d --build
```

Docker will rebuild only the changed layers (subsequent builds are faster due to caching).

---

## Useful Commands

```bash
# View live logs from the app
docker compose logs -f app

# View Traefik logs
docker compose logs -f traefik

# Restart the app only
docker compose restart app

# Stop everything
docker compose down

# Stop and remove volumes (use with caution — removes SSL certs)
docker compose down -v

# Check container resource usage
docker stats
```

---

## Troubleshooting

### SSL certificate not issued
- Ensure ports 80 and 443 are open in Azure NSG
- Ensure the domain DNS is pointing to the VM IP
- Check Traefik logs: `docker compose logs traefik`

### App not starting
- Check build errors: `docker compose logs app`
- Verify all `.env` values are correct and not empty

### Container keeps restarting
```bash
docker compose logs app --tail=50
```
Look for missing environment variables or database connection errors.

### Rebuild from scratch
```bash
docker compose down
docker image rm azh-monitoring-app
docker compose up -d --build
```

---

## File Structure Reference

```
azh-monitoring/
├── Dockerfile           # Multi-stage Docker build
├── docker-compose.yml   # Traefik + App services
├── .dockerignore        # Files excluded from Docker build
├── .env                 # ⚠️ Secret env vars — never commit
└── DEPLOYMENT.md        # This file
```

---

## Security Notes

- The `.env` file is in `.gitignore` — never add it to git
- Traefik dashboard is disabled by default (`api.dashboard=false`)
- The app runs as a non-root user inside the container
- SSL certificates are automatically renewed by Traefik before expiry
