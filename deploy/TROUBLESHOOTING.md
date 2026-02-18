# Clipflow Deployment Troubleshooting

## "Site can't be reached" Checklist

### 1. Use HTTP first, not HTTPS
You likely don't have SSL configured yet. Try:
- **http://16.16.68.255** (not https)
- Browsers may warn about insecure connection — that's expected without a cert

### 2. Is the Next.js app running?
Nginx proxies to your app. If the app isn't running, you get nothing.

```bash
cd ~/clipping-tool
npm run build   # if not already built
npm run start   # runs on port 3000
```

Or use PM2 to keep it running:
```bash
npm install -g pm2
pm2 start npm --name "clipflow" -- start
pm2 save
pm2 startup   # enable on reboot
```

### 3. Firewall / Security Group
- **UFW (local firewall):** `sudo ufw allow 80` then `sudo ufw reload`
- **AWS Security Group:** Ensure inbound rules allow TCP port 80 (and 443 if using HTTPS) from 0.0.0.0/0 or your IP

### 4. Verify Nginx config
Your `/etc/nginx/sites-available/clipflow` should proxy to port 3000:
```nginx
proxy_pass http://127.0.0.1:3000;
```

Test: `sudo nginx -t`

### 5. Quick diagnostics on the server
```bash
# Is Nginx listening on 80?
sudo ss -tlnp | grep :80

# Is Next.js running on 3000?
curl -I http://127.0.0.1:3000

# Check Nginx error log
sudo tail -20 /var/log/nginx/error.log
```
