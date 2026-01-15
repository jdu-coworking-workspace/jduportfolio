# Maintenance Mode Guide

This document explains how to enable and disable maintenance mode across all three layers of the application: Nginx, Backend (Express), and Frontend (React).

## Overview

The maintenance system operates at three levels to ensure users are informed when the system is unavailable:

1. **Nginx Level**: Serves a static maintenance page when Node.js is down (502/503/504 errors) or when a manual toggle file exists
2. **Backend Level**: Provides a `/api/maintenance` endpoint and middleware that short-circuits requests when enabled
3. **Frontend Level**: Checks maintenance status on app entry and displays a maintenance page if enabled or unreachable

## Architecture

### Backend Configuration

Maintenance state is stored in: `portfolio-server/src/config/maintenance.json`

```json
{
	"enabled": false,
	"message": "システムは現在メンテナンス中です。しばらくしてから再度お試しください。",
	"messageEn": "The system is currently under maintenance. Please try again later.",
	"messageUz": "Tizim hozirda texnik xizmat ko'rsatish rejimida. Iltimos, keyinroq qayta urinib ko'ring."
}
```

### Nginx Configuration

- **Maintenance toggle file**: `/var/www/maintenance.flag` (configurable in `nginx.conf`)
- **Static maintenance page**: `/var/www/portfolio-client/dist/maintenance.html`
- **Error pages**: Automatically serves maintenance page for 502, 503, 504 errors

## Enabling Maintenance Mode

### Method 1: Backend Configuration (Recommended)

This method enables maintenance mode through the backend API, which will be detected by both the backend middleware and frontend.

1. **Edit the maintenance config file**:

   ```bash
   cd portfolio-server
   nano src/config/maintenance.json
   ```

2. **Set `enabled` to `true`**:

   ```json
   {
   	"enabled": true,
   	"message": "システムは現在メンテナンス中です。しばらくしてから再度お試しください。",
   	"messageEn": "The system is currently under maintenance. Please try again later.",
   	"messageUz": "Tizim hozirda texnik xizmat ko'rsatish rejimida. Iltimos, keyinroq qayta urinib ko'ring."
   }
   ```

3. **Restart the backend server**:
   ```bash
   pm2 restart portfolio-server
   # or
   npm run dev  # for development
   ```

**What happens:**

- Backend middleware returns 503 for all requests (except `/api/maintenance`)
- Frontend detects maintenance mode and shows maintenance page
- API calls return maintenance messages

### Method 2: Nginx Toggle File (Quick Emergency)

This method works even if the Node.js backend is completely down.

1. **Create the maintenance flag file**:

   ```bash
   sudo touch /var/www/maintenance.flag
   ```

2. **Reload Nginx** (if needed):
   ```bash
   sudo nginx -t  # Test configuration
   sudo systemctl reload nginx
   ```

**What happens:**

- Nginx serves the static maintenance page for all requests
- Works even if Node.js backend is down
- Bypasses the backend entirely

### Method 3: Both Methods (Maximum Coverage)

For critical maintenance, use both methods:

1. Enable backend maintenance (Method 1)
2. Create Nginx toggle file (Method 2)

This ensures maintenance mode works even if:

- Backend crashes during maintenance
- Database is unavailable
- Any other backend failure occurs

## Disabling Maintenance Mode

### Disable Backend Maintenance

1. **Edit the maintenance config file**:

   ```bash
   cd portfolio-server
   nano src/config/maintenance.json
   ```

2. **Set `enabled` to `false`**:

   ```json
   {
     "enabled": false,
     ...
   }
   ```

3. **Restart the backend server**:
   ```bash
   pm2 restart portfolio-server
   ```

### Disable Nginx Toggle

1. **Remove the maintenance flag file**:

   ```bash
   sudo rm /var/www/maintenance.flag
   ```

2. **Reload Nginx** (if needed):
   ```bash
   sudo systemctl reload nginx
   ```

## Customizing Maintenance Messages

### Backend Messages

Edit `portfolio-server/src/config/maintenance.json`:

```json
{
	"enabled": true,
	"message": "Your custom Japanese message here",
	"messageEn": "Your custom English message here",
	"messageUz": "Your custom Uzbek message here"
}
```

### Static HTML Page

Edit `portfolio-client/public/maintenance.html` and rebuild:

```bash
cd portfolio-client
npm run build
```

The built file will be at `portfolio-client/dist/maintenance.html` and should be deployed to `/var/www/portfolio-client/dist/maintenance.html` on the server.

## Testing Maintenance Mode

### Test Backend Maintenance

1. Enable maintenance in `maintenance.json`
2. Restart backend
3. Visit the application - should show maintenance page
4. Check API: `curl http://localhost:4000/api/maintenance` should return `{"enabled": true, ...}`
5. Check other APIs: `curl http://localhost:4000/api/auth/login` should return 503

### Test Nginx Maintenance

1. Create toggle file: `sudo touch /var/www/maintenance.flag`
2. Visit the application - should show static maintenance page
3. Works even if backend is stopped

### Test Error Pages

1. Stop the backend: `pm2 stop portfolio-server`
2. Visit the application - Nginx should serve maintenance page for 502 errors

## API Endpoint

### GET /api/maintenance

Returns the current maintenance status.

**Response (Maintenance Enabled):**

```json
{
	"enabled": true,
	"message": "システムは現在メンテナンス中です。しばらくしてから再度お試しください。",
	"messageEn": "The system is currently under maintenance. Please try again later.",
	"messageUz": "Tizim hozirda texnik xizmat ko'rsatish rejimida. Iltimos, keyinroq qayta urinib ko'ring."
}
```

**Response (Maintenance Disabled):**

```json
{
	"enabled": false,
	"message": "...",
	"messageEn": "...",
	"messageUz": "..."
}
```

**Note:** This endpoint is always accessible, even when maintenance mode is enabled, to allow the frontend to check status.

## Frontend Behavior

The frontend automatically:

1. Checks `/api/maintenance` on app initialization
2. Shows maintenance page if `enabled: true`
3. Shows maintenance page if endpoint is unreachable (network error, 502, 503, 504)
4. Polls every 30 seconds to check if maintenance is disabled
5. Automatically resumes normal operation when maintenance is disabled

## Troubleshooting

### Maintenance page not showing

1. **Check backend config**: Verify `maintenance.json` has `enabled: true`
2. **Check Nginx toggle**: Verify `/var/www/maintenance.flag` exists (if using Method 2)
3. **Check file paths**: Ensure `maintenance.html` exists in dist folder
4. **Check Nginx config**: Verify error_page directives are correct
5. **Check backend logs**: Look for errors reading maintenance config

### Can't disable maintenance

1. **Backend method**: Ensure `enabled: false` in `maintenance.json` and restart
2. **Nginx method**: Remove `/var/www/maintenance.flag` file
3. **Clear browser cache**: Frontend may cache maintenance state

### Maintenance page shows but backend is up

1. Check if Nginx toggle file exists: `ls -la /var/www/maintenance.flag`
2. Remove it if not needed: `sudo rm /var/www/maintenance.flag`

## Best Practices

1. **Before major deployments**: Enable maintenance mode to prevent user actions during deployment
2. **Emergency situations**: Use Nginx toggle file for instant maintenance mode
3. **Scheduled maintenance**: Use backend config for planned maintenance with custom messages
4. **Always test**: Test maintenance mode in staging before using in production
5. **Monitor**: Check logs to ensure maintenance mode is working as expected
6. **Communication**: Update maintenance messages with expected downtime duration

## File Locations Summary

- **Backend config**: `portfolio-server/src/config/maintenance.json`
- **Backend route**: `portfolio-server/src/routes/maintenance-route.js`
- **Backend middleware**: `portfolio-server/src/middlewares/maintenance-middleware.js`
- **Frontend component**: `portfolio-client/src/pages/Maintenance/Maintenance.jsx`
- **Frontend check**: `portfolio-client/src/components/MaintenanceCheck.jsx`
- **Static HTML**: `portfolio-client/public/maintenance.html` (source)
- **Static HTML (built)**: `portfolio-client/dist/maintenance.html` (deployed)
- **Nginx config**: `nginx.conf` (root directory)
- **Nginx toggle**: `/var/www/maintenance.flag` (on server)

## Quick Reference

### Enable (Backend)

```bash
cd portfolio-server
sed -i 's/"enabled": false/"enabled": true/' src/config/maintenance.json
pm2 restart portfolio-server
```

### Disable (Backend)

```bash
cd portfolio-server
sed -i 's/"enabled": true/"enabled": false/' src/config/maintenance.json
pm2 restart portfolio-server
```

### Enable (Nginx)

```bash
sudo touch /var/www/maintenance.flag
```

### Disable (Nginx)

```bash
sudo rm /var/www/maintenance.flag
```
