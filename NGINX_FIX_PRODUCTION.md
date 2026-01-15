# Fix Nginx Error Page on Production

The production server is showing the default Fedora nginx error page instead of the maintenance page. This means the nginx configuration needs to be updated.

## Quick Fix Steps

### Step 1: SSH into Production Server

```bash
ssh -i /path/to/your/key.pem user@ec2-13-231-145-159.ap-northeast-1.compute.amazonaws.com
```

**If SSH connection times out**, check:

- EC2 instance is running
- Security group allows SSH (port 22) from your IP
- Correct hostname/IP in your .env file

### Step 2: Find Your Nginx Config File

```bash
# Find the nginx config file for your site
sudo find /etc/nginx -name "*portfolio*" -o -name "*jdu*"

# Or check common locations:
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/
ls -la /etc/nginx/conf.d/

# Check main nginx config
cat /etc/nginx/nginx.conf | grep -A 5 "server_name portfolio.jdu.uz"
```

### Step 3: Backup Current Config

```bash
# Backup the current config (adjust path to your actual config file)
sudo cp /etc/nginx/sites-available/portfolio.jdu.uz /etc/nginx/sites-available/portfolio.jdu.uz.backup.$(date +%Y%m%d)

# Or if using main config:
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d)
```

### Step 4: Update Nginx Config

Edit your nginx config file and add the maintenance settings. Find your `server` block for `portfolio.jdu.uz` and add:

```nginx
server {
    listen 80;
    server_name portfolio.jdu.uz;

    # ... existing config ...

    # ADD THESE LINES:
    # Error pages for backend failures (502, 503, 504)
    error_page 502 503 504 /maintenance.html;

    # Maintenance toggle file path
    set $maintenance_flag "/var/www/maintenance.flag";

    # Check for maintenance toggle file before proxying
    if (-f $maintenance_flag) {
        return 503;
    }

    # Serve maintenance.html directly
    location = /maintenance.html {
        root /var/www/portfolio-client/dist;  # ADJUST THIS PATH TO YOUR ACTUAL DIST LOCATION
        internal;
    }

    location / {
        # ... existing proxy settings ...

        # ADD THIS LINE:
        proxy_intercept_errors on;
    }

    location /api/ {
        # ... existing proxy settings ...

        # ADD THIS LINE:
        proxy_intercept_errors on;
    }
}
```

**Important:** Adjust the `root` path in the `location = /maintenance.html` block to match where your frontend `dist` folder is actually deployed.

### Step 5: Find Your Actual Dist Path

```bash
# Find where your frontend dist folder is located
find /var/www -name "dist" -type d 2>/dev/null
find /home -name "dist" -type d 2>/dev/null
find /opt -name "dist" -type d 2>/dev/null

# Or check your deployment path from .env
# Look for EC2_PATH or similar variable
```

### Step 6: Verify maintenance.html Exists

```bash
# Check if maintenance.html exists in dist folder
# (Adjust path to your actual dist location)
ls -la /var/www/portfolio-client/dist/maintenance.html

# If it doesn't exist, you need to:
# 1. Rebuild frontend with maintenance.html
# 2. Or manually copy it from the repository
```

### Step 7: Test Nginx Configuration

```bash
# Test nginx config for syntax errors
sudo nginx -t

# Expected output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**If there are errors**, fix them before proceeding.

### Step 8: Reload Nginx

```bash
# Reload nginx to apply changes
sudo systemctl reload nginx

# Or if systemctl is not available:
sudo nginx -s reload

# Verify nginx is running
sudo systemctl status nginx
```

### Step 9: Test the Maintenance Page

```bash
# Test if maintenance.html is accessible (should return 404 from outside, but work internally)
curl -I http://localhost/maintenance.html

# Test the site
curl -I http://portfolio.jdu.uz/

# If backend is down, you should see maintenance page instead of default error page
```

## Alternative: Quick Fix Without SSH

If you can't SSH in right now, you can:

1. **Check if backend is running:**

   ```bash
   # From your local machine, test if backend is reachable
   curl http://portfolio.jdu.uz/api/maintenance
   ```

2. **If backend is down**, the nginx error page will show until you update the config.

3. **Temporary workaround**: Create a simple maintenance page at the default nginx error location:
   ```bash
   # On server (when you can SSH):
   sudo cp /var/www/portfolio-client/dist/maintenance.html /usr/share/nginx/html/50x.html
   ```

## Verify Maintenance.html is Deployed

The `maintenance.html` file should be in your frontend `dist` folder after deployment. If it's missing:

1. **Check if it's in the build:**

   ```bash
   # Locally, before deploying:
   cd portfolio-client
   npm run build
   ls -la dist/maintenance.html
   ```

2. **If missing**, verify it's in `public/` folder:

   ```bash
   ls -la portfolio-client/public/maintenance.html
   ```

3. **Vite automatically copies** files from `public/` to `dist/` during build, so it should be there.

## Common Issues

### Issue: "maintenance.html not found" in nginx logs

**Solution:** Adjust the `root` path in nginx config to match your actual deployment path.

```bash
# Find actual dist path
find /var/www -type d -name "dist" 2>/dev/null

# Update nginx config with correct path
```

### Issue: Still seeing default error page

**Solution:**

1. Verify `error_page 502 503 504 /maintenance.html;` is in your server block
2. Verify `proxy_intercept_errors on;` is in your location blocks
3. Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`

### Issue: Backend is running but showing error

**Solution:** Check backend logs:

```bash
pm2 logs portfolio-server
# or
journalctl -u portfolio-server -f
```

## Quick Reference

```bash
# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Check nginx status
sudo systemctl status nginx

# View nginx error logs
sudo tail -f /var/log/nginx/error.log

# View nginx access logs
sudo tail -f /var/log/nginx/access.log

# Find dist folder
find /var/www -name "dist" -type d

# Check if maintenance.html exists
ls -la /var/www/portfolio-client/dist/maintenance.html
```
