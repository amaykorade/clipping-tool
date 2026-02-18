# Clipflow Deployment Guide

A step-by-step explanation of how we deployed Clipflow and **why** each piece exists.

---

## The Big Picture

```
Internet (User's browser)
        │
        │  http://your-ip (port 80)
        ▼
┌───────────────────────────────────────┐
│  NGINX (Reverse Proxy)                │  ← Listens on port 80
│  - Receives all incoming web traffic  │
│  - Forwards to Next.js                │
└───────────────────────────────────────┘
        │
        │  proxy_pass to 127.0.0.1:3000
        ▼
┌───────────────────────────────────────┐
│  Next.js App (Node.js)                │  ← Runs on port 3000
│  - Serves your React pages            │
│  - Handles API routes                 │
└───────────────────────────────────────┘
        │
        ├──────────────────┬──────────────────┐
        ▼                  ▼                  ▼
   PostgreSQL           Redis            Storage (S3/local)
   (Database)        (Job queue)         (Videos, clips)

   + Worker process (npm run worker) - processes transcription & rendering jobs
```

---

## 1. Why Nginx? (Reverse Proxy)

**What it does:** Sits in front of your Next.js app. Users hit Nginx on port 80; Nginx forwards requests to your app on port 3000.

**Why we use it:**

| Reason | Explanation |
|--------|-------------|
| **Port 80** | Web traffic uses port 80 (HTTP) by default. Browsers assume `http://yoursite.com` = port 80. Next.js defaults to 3000, so we need something on 80. |
| **Production standard** | Nginx is battle-tested for handling many connections, static files, and SSL termination. |
| **Single entry point** | Later you can add SSL, multiple apps, load balancing—all through one Nginx config. |
| **Security** | Hides your app from direct internet access. Only Nginx is exposed; the app talks to localhost. |

**Without Nginx:** Users would need `http://your-ip:3000`, and you'd expose the app directly.

---

## 2. Nginx Config Structure

```
/etc/nginx/
├── sites-available/    ← All configs live here (enabled or not)
│   └── clipflow       ← Our config file
└── sites-enabled/     ← Symlinks to configs that are ACTIVE
    └── clipflow -> ../sites-available/clipflow
```

**Why this split?**
- `sites-available`: Store configs without enabling them.
- `sites-enabled`: Only symlinked configs are loaded. Easy to enable/disable a site:
  ```bash
  sudo ln -s /etc/nginx/sites-available/clipflow /etc/nginx/sites-enabled/   # enable
  sudo rm /etc/nginx/sites-enabled/clipflow                                   # disable
  ```

**`sudo rm /etc/nginx/sites-enabled/default`**
- The default Nginx site shows a placeholder page and listens on port 80.
- If we keep it, it could catch traffic meant for Clipflow. Removing it ensures port 80 goes only to our app.

---

## 3. The Nginx Config Itself

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Key parts:**

| Line | Purpose |
|------|---------|
| `listen 80` | Accept HTTP traffic on port 80 |
| `server_name _` | Match any hostname (use your domain later) |
| `proxy_pass http://127.0.0.1:3000` | Send requests to Next.js |
| `proxy_set_header Host $host` | Preserve the original host (needed for NextAuth, etc.) |
| `X-Real-IP`, `X-Forwarded-For` | So your app sees the real client IP, not Nginx's |
| `X-Forwarded-Proto` | Tells the app if the original request was HTTP or HTTPS (needed for redirects) |

---

## 4. Why Two Firewalls? (UFW + AWS Security Group)

**UFW (Unfirewall)** – On the server itself
- Controls which ports the OS accepts.
- `ufw allow 80` = allow inbound traffic on port 80.
- Without it, the OS may block traffic even if Nginx is running.

**AWS Security Group** – On the cloud/network
- Acts as a firewall before traffic reaches your instance.
- Must allow inbound TCP 80 (and 443 for HTTPS) from the internet.
- If this is closed, traffic never reaches your server.

**Both must allow port 80** for the site to be reachable.

---

## 5. Why Build Before Start?

```bash
npm run build    # Compiles Next.js for production
npm run start    # Serves the built app
```

| Step | What it does |
|------|--------------|
| `build` | Compiles TypeScript, bundles React, generates static pages, runs `prisma generate`. Output goes to `.next/`. |
| `start` | Serves the pre-built app from `.next/`. Fast, optimized, no dev tooling. |

`npm run dev` compiles on-the-fly and is only for local development. Production uses `build` + `start`.

---

## 6. Why PM2? (Process Manager)

**Without PM2:** When you close the terminal or SSH session, `npm run start` stops and the site goes down.

**With PM2:**
- Keeps the app running in the background.
- Restarts it if it crashes.
- `pm2 startup` makes it survive server reboots.
- `pm2 logs` for debugging.

```bash
pm2 start npm --name "clipflow" -- start
pm2 save
pm2 startup
```

---

## 7. Why the Worker? (Background Jobs)

Clipflow uses **BullMQ + Redis** for:
- Video transcription (AssemblyAI)
- Clip generation
- Rendering clips to video files

| Process | Role |
|---------|------|
| **Next.js** | Web UI + API. When you upload a video, it adds a job to the Redis queue. |
| **Worker** (`npm run worker`) | Picks jobs from the queue, runs transcription, generates clips, renders. |

**Both must run.** If the worker isn't running, uploads succeed but videos stay stuck in "Transcribing" or "Processing."

```bash
# Run worker in a separate terminal or via PM2
pm2 start npm --name "clipflow-worker" -- run worker
```

---

## 8. Environment Variables (.env)

On the server, you need the same `.env` as locally:
- `DATABASE_URL` – PostgreSQL connection
- `REDIS_URL` – Redis connection (or default `redis://127.0.0.1:6379`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – NextAuth (use production callback URL)
- `NEXTAUTH_URL` – Must be `http://your-server-ip` or your domain
- `ASSEMBLYAI_API_KEY`, storage keys, etc.

**NEXTAUTH_URL** must match how users reach your site (IP or domain). Wrong value = login redirects break.

---

## 9. Quick Reference: Full Deployment Checklist

| Step | Command / Action |
|------|------------------|
| 1. Build | `npm run build` |
| 2. Start app | `npm run start` or `pm2 start npm --name "clipflow" -- start` |
| 3. Start worker | `npm run worker` or `pm2 start npm --name "clipflow-worker" -- run worker` |
| 4. Nginx config | `/etc/nginx/sites-available/clipflow` with `proxy_pass http://127.0.0.1:3000` |
| 5. Enable site | `sudo ln -s /etc/nginx/sites-available/clipflow /etc/nginx/sites-enabled/` |
| 6. Remove default | `sudo rm /etc/nginx/sites-enabled/default` |
| 7. Test Nginx | `sudo nginx -t` |
| 8. Reload Nginx | `sudo systemctl reload nginx` |
| 9. UFW | `sudo ufw allow 80` then `sudo ufw reload` |
| 10. AWS | Security group inbound: TCP 80 from 0.0.0.0/0 |

---

## 10. Next Steps (Optional)

- **Domain + HTTPS:** Point a domain to your IP, then use **Certbot** for free SSL.
- **PM2 startup:** Run `pm2 startup` and follow instructions so both app and worker restart on reboot.
