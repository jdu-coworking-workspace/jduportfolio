# Post-Deployment Setup Guide - Maintenance Mode

This guide walks you through the steps needed after merging the maintenance mode code and deploying via CI/CD.

## Prerequisites

- SSH access to your production server
- Sudo/root access for nginx configuration
- Your EC2 deployment path (usually set in `.env` as `EC2_PATH`)

## Step-by-Step Post-Deployment Instructions

### Step 1: Verify Deployment Completed

First, verify that the CI/CD deployment completed successfully:

```bash
# Check your CI/CD pipeline status (GitHub Actions, GitLab CI, etc.)
# Ensure both frontend and backend deployments succeeded
```

### Step 2: SSH into Your Production Server

```bash
# Connect to your server (adjust based on your setup)
ssh -i /path/to/your/key.pem user@your-server-ip
# or
ssh user@your-server-ip
```

### Step 3: Verify Frontend Files Are Deployed

Check that `maintenance.html` is in the dist folder:

```bash
# Navigate to your frontend deployment path
# (Adjust EC2_PATH based on your .env configuration)
cd /path/to/portfolio-client/dist

# Verify maintenance.html exists
ls -la maintenance.html

# If it doesn't exist, check the dist folder structure
ls -la

# Expected output should show maintenance.html
```

**If `maintenance.html` is missing:**

```bash
# The file should be automatically included from public/ folder during build
# If missing, you may need to rebuild and redeploy the frontend
cd /path/to/portfolio-client
npm run build
# Then redeploy or manually copy maintenance.html to dist/
```

### Step 4: Verify Backend Maintenance Config Exists

Check that the maintenance config file is present:

```bash
# Navigate to your backend deployment path
cd /path/to/portfolio-server

# Verify maintenance.json exists
ls -la src/config/maintenance.json

# Check its contents
cat src/config/maintenance.json

# Expected output:
# {
#   "enabled": false,
#   "message": "システムは現在メンテナンス中です。しばらくしてから再度お試しください。",
#   "messageEn": "The system is currently under maintenance. Please try again later.",
#   "messageUz": "Tizim hozirda texnik xizmat korsatish rejimida. Iltimos, keyinroq qayta urinib koring."
# }
```

**If the file is missing:**

```bash
# Create it manually
mkdir -p src/config
cat > src/config/maintenance.json << 'EOF'
{
  "enabled": false,
  "message": "システムは現在メンテナンス中です。しばらくしてから再度お試しください。",
  "messageEn": "The system is currently under maintenance. Please try again later.",
  "messageUz": "Tizim hozirda texnik xizmat korsatish rejimida. Iltimos, keyinroq qayta urinib koring."
}
EOF
```

### Step 5: Update Nginx Configuration

The `nginx.conf` file in the repository needs to be applied to your server's nginx configuration.

#### Option A: If you have a site-specific config file

```bash
# Find your nginx site configuration
# Usually located at:
# /etc/nginx/sites-available/portfolio.jdu.uz
# or
# /etc/nginx/sites-enabled/portfolio.jdu.uz

# Backup current config
sudo cp /etc/nginx/sites-available/portfolio.jdu.uz /etc/nginx/sites-available/portfolio.jdu.uz.backup

# Edit the config file
sudo nano /etc/nginx/sites-available/portfolio.jdu.uz
# or
sudo nano /etc/nginx/sites-enabled/portfolio.jdu.uz
```

**Add the following to your server blocks (both HTTP and HTTPS):**

```nginx
# Error pages for backend failures (502, 503, 504)
error_page 502 503 504 /maintenance.html;

# Maintenance toggle file path
# Adjust the path to match your actual deployment structure
set $maintenance_flag "/var/www/maintenance.flag";

# Check for maintenance toggle file before proxying
if (-f $maintenance_flag) {
    return 503;
}

# Serve maintenance.html directly
location = /maintenance.html {
    root /path/to/portfolio-client/dist;  # Adjust to your actual dist path
    internal;
}

# In your existing location / block, add:
proxy_intercept_errors on;

# In your existing location /api/ block, add:
proxy_intercept_errors on;
```

#### Option B: If nginx.conf is in the main nginx config

```bash
# Backup main nginx config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Edit main config
sudo nano /etc/nginx/nginx.conf
```

Add the maintenance configuration to your server blocks as shown in Option A.

#### Option C: Copy from repository (if you have the repo on server)

```bash
# If you have the repository cloned on the server
cd /path/to/jduportfolio

# Copy nginx config to a temporary location for review
cp nginx.conf /tmp/nginx-maintenance.conf

# Review and manually merge the maintenance sections into your actual nginx config
cat /tmp/nginx-maintenance.conf
```

**Important:** Adjust the paths in the nginx config:

- `root /var/www/portfolio-client/dist;` → Change to your actual frontend dist path
- `set $maintenance_flag "/var/www/maintenance.flag";` → Change to your preferred location

### Step 6: Test Nginx Configuration

```bash
# Test nginx configuration for syntax errors
sudo nginx -t

# Expected output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**If there are errors:**

- Fix the syntax errors in your nginx config
- Run `sudo nginx -t` again until it passes

### Step 7: Reload Nginx

```bash
# Reload nginx to apply changes
sudo systemctl reload nginx

# Or if systemctl is not available:
sudo nginx -s reload

# Verify nginx is running
sudo systemctl status nginx
```

### Step 8: Create Maintenance Flag Directory (Optional)

If you want to use the Nginx toggle file method, ensure the directory exists:

```bash
# Create the directory for maintenance flag (adjust path as needed)
sudo mkdir -p /var/www

# Set appropriate permissions
sudo chown www-data:www-data /var/www  # Adjust user/group as needed
sudo chmod 755 /var/www
```

**Note:** Adjust the path in nginx config (`set $maintenance_flag`) to match where you create this directory.

### Step 9: Restart Backend Service

Restart the backend to ensure the new maintenance middleware is loaded:

```bash
# Navigate to backend directory
cd /path/to/portfolio-server

# Restart PM2 service
pm2 restart portfolio-server

# Or if using a different service name:
pm2 restart <your-service-name>

# Verify it's running
pm2 status

# Check logs for any errors
pm2 logs portfolio-server --lines 20
```

### Step 10: Test Maintenance Mode

#### Test 1: Backend Maintenance Endpoint

```bash
# Test the maintenance endpoint
curl http://localhost:4000/api/maintenance

# Expected output (when disabled):
# {"enabled":false,"message":"システムは現在メンテナンス中です。...","messageEn":"...","messageUz":"..."}

# Test from external URL (if accessible)
curl https://portfolio.jdu.uz/api/maintenance
```

#### Test 2: Enable Backend Maintenance

```bash
# Navigate to backend
cd /path/to/portfolio-server

# Enable maintenance mode
sed -i 's/"enabled": false/"enabled": true/' src/config/maintenance.json

# Restart backend
pm2 restart portfolio-server

# Test API endpoint (should return 503)
curl -v http://localhost:4000/api/auth/login

# Test maintenance endpoint (should still work)
curl http://localhost:4000/api/maintenance
```

**Expected behavior:**

- `/api/maintenance` should return `{"enabled": true, ...}`
- Other API endpoints should return 503 with maintenance message
- Frontend should show maintenance page

#### Test 3: Disable Backend Maintenance

```bash
# Disable maintenance mode
sed -i 's/"enabled": true/"enabled": false/' src/config/maintenance.json

# Restart backend
pm2 restart portfolio-server

# Verify it's disabled
curl http://localhost:4000/api/maintenance
```

#### Test 4: Nginx Toggle File (Emergency Method)

```bash
# Enable via Nginx toggle
sudo touch /var/www/maintenance.flag

# Test by visiting the site - should show maintenance page
# Works even if backend is down

# Disable
sudo rm /var/www/maintenance.flag
```

#### Test 5: Backend Down Scenario

```bash
# Stop backend
pm2 stop portfolio-server

# Visit the site - Nginx should serve maintenance page for 502 errors
# Test with curl
curl -v https://portfolio.jdu.uz/

# Should return maintenance page or 502/503 error page
```

### Step 11: Verify Frontend Maintenance Check

1. Open your browser and visit `https://portfolio.jdu.uz`
2. Open browser DevTools (F12) → Network tab
3. Look for a request to `/api/maintenance`
4. The frontend should check this endpoint on load

**To test maintenance mode:**

1. Enable maintenance in backend (Step 10, Test 2)
2. Refresh the page
3. You should see the maintenance page
4. The page should auto-refresh every 30 seconds to check if maintenance is disabled

### Step 12: Final Verification Checklist

- [ ] `maintenance.html` exists in frontend dist folder
- [ ] `maintenance.json` exists in backend config folder
- [ ] Nginx configuration updated with maintenance settings
- [ ] Nginx config test passes (`nginx -t`)
- [ ] Nginx reloaded successfully
- [ ] Backend restarted and running
- [ ] `/api/maintenance` endpoint returns correct JSON
- [ ] Frontend shows maintenance page when enabled
- [ ] Nginx serves maintenance page when backend is down
- [ ] Maintenance can be enabled/disabled via backend config
- [ ] Maintenance can be enabled/disabled via Nginx toggle file

## Troubleshooting

### Issue: maintenance.html not found

```bash
# Check if file exists
ls -la /path/to/portfolio-client/dist/maintenance.html

# If missing, rebuild frontend
cd /path/to/portfolio-client
npm run build

# Verify it's included
ls -la dist/maintenance.html
```

### Issue: Nginx 404 on /maintenance.html

```bash
# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify the root path in nginx config matches actual dist location
# Check the location = /maintenance.html block
```

### Issue: Backend maintenance endpoint not working

```bash
# Check backend logs
pm2 logs portfolio-server

# Verify maintenance.json exists and is valid JSON
cat /path/to/portfolio-server/src/config/maintenance.json | python -m json.tool

# Check if route is registered
grep -r "maintenance" /path/to/portfolio-server/src/routes.js
```

### Issue: Frontend not detecting maintenance

```bash
# Check browser console for errors
# Verify MaintenanceCheck component is in main.jsx
# Check network tab for /api/maintenance request
# Verify CORS is not blocking the request
```

## Quick Reference Commands

### Enable Maintenance (Backend)

```bash
cd /path/to/portfolio-server
sed -i 's/"enabled": false/"enabled": true/' src/config/maintenance.json
pm2 restart portfolio-server
```

### Disable Maintenance (Backend)

```bash
cd /path/to/portfolio-server
sed -i 's/"enabled": true/"enabled": false/' src/config/maintenance.json
pm2 restart portfolio-server
```

### Enable Maintenance (Nginx - Emergency)

```bash
sudo touch /var/www/maintenance.flag
```

### Disable Maintenance (Nginx)

```bash
sudo rm /var/www/maintenance.flag
```

### Check Maintenance Status

```bash
curl http://localhost:4000/api/maintenance
```

### View Backend Logs

```bash
pm2 logs portfolio-server
```

### View Nginx Logs

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Next Steps

After completing these steps, your maintenance mode system should be fully operational. You can now:

1. Use backend config for planned maintenance
2. Use Nginx toggle file for emergency maintenance
3. Monitor maintenance status via the API endpoint
4. Customize maintenance messages as needed

For more details, see `MAINTENANCE_GUIDE.md`.
