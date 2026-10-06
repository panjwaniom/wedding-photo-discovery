# Hosting the stack on a private server — migration runbook

Goal: run Immich + wedding-photo-discovery 24/7 on your own server
(for example an Oracle Cloud Always-Free VM) so no home PC needs to stay on.

## 0. What moves

| Data | Typical size | How it moves |
|------|--------------|--------------|
| Photo library (`library/`) | several GB | `scp` / `rsync` to the server |
| Database dump (`immich-db-dump.sql`) | a few hundred MB | `scp`, then `psql` restore |
| Project code (this repo) | a few MB | `scp` / `git` |

```text
server tree (~/wedding-photo-discovery/deploy/)
├── immich/                 # Immich compose + .env (copy of your setup)
│   ├── docker-compose.yml
│   ├── .env
│   └── library/            # ← uploaded photo library goes here
├── wedding/
│   ├── docker-compose.yml
│   └── .env
├── immich-db-dump.sql      # ← database dump goes here
├── migrate-export.ps1      # STEP 1: dump the DB on the current machine
└── migrate-import.sh       # STEP 5: restore + start everything on the server
```

## 1. Server prerequisites

- Ubuntu 22.04+ with Docker Engine + Compose plugin
  (`curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh`)
- The `immich_default` Docker network is created automatically by the
  `deploy/immich` project — bring Immich up **before** the wedding app.
- Outbound HTTPS (for model downloads, certificates, tunnels).

## 2. Dump the database (current machine)

```powershell
.\deploy\migrate-export.ps1
```

This writes `deploy/immich-db-dump.sql` using byte-safe redirection
(PowerShell's own `>` redirect corrupts `pg_dump` output — the script
already handles this via `cmd.exe`).

## 3. Upload everything to the server

```bash
# project code (includes this deploy pack)
scp -r wedding-photo-discovery <user>@<server>:~/
# photo library (large — leave it running)
scp -r /path/to/immich/library <user>@<server>:~/wedding-photo-discovery/deploy/immich/library
# database dump
scp deploy/immich-db-dump.sql <user>@<server>:~/wedding-photo-discovery/deploy/
```

## 4. Sanity checks (on the server)

```bash
cd ~/wedding-photo-discovery/deploy
du -sh immich/library immich-db-dump.sql
docker compose -f immich/docker-compose.yml config   # validates OK
docker compose -f wedding/docker-compose.yml config  # validates OK
```

## 5. Restore + start everything (on the server)

```bash
cd ~/wedding-photo-discovery/deploy
bash migrate-import.sh
```

This starts PostgreSQL + Redis, restores the dump, then starts Immich
(first boot downloads ~2 GB of ML models — be patient) and the wedding app.

## 6. ARM servers (e.g. Oracle Ampere)

If `immich_machine_learning` crash-loops with `exec format error`,
switch the ML image variant in `deploy/immich/.env`:

```bash
# set IMMICH_ML_SUFFIX=-armnn, then:
cd ~/wedding-photo-discovery/deploy/immich
docker compose up -d immich-machine-learning
```

## 7. Public HTTPS access

Any reverse proxy works. One free option is Caddy with automatic
Let's Encrypt certificates (needs ports 80/443 reachable):

```bash
sudo apt-get install -y caddy
printf 'photos.example.com {\n\treverse_proxy localhost:3000\n}\n' \
  | sudo tee /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

A free dynamic-DNS name (e.g. DuckDNS) plus a 5-minute IP-updater cron
job keeps the domain pointed at the server if its IP ever changes.

## 8. Verify

- `https://<your-domain>` → landing page
- `https://<your-domain>/?view=unassigned` → unassigned-photo counts
- Upload a selfie → identity confirm → photos + download work
