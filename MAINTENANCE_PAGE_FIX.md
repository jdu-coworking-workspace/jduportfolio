# Maintenance Page Fix - Context Provider Issue

## 🔴 Problem

When stopping the backend (Ctrl+C) or when maintenance mode is enabled, the frontend showed this error:

```
Uncaught TypeError: Cannot destructure property 'language' of 'useLanguage(...)' as it is undefined.
at Maintenance (Maintenance.jsx:9:10)
```

## 🔍 Root Cause

### Component Hierarchy Issue:

```javascript
// main.jsx structure:
<ThemeProvider>
	<MaintenanceCheck>
		{' '}
		// ← Outside providers!
		<AlertProvider>
			<UserProvider>
				<LanguageProvider>
					{' '}
					// ← Providers are here
					<AppRoutes />
				</LanguageProvider>
			</UserProvider>
		</AlertProvider>
	</MaintenanceCheck>
</ThemeProvider>
```

When `MaintenanceCheck` detected maintenance mode, it rendered `<Maintenance />` component, which tried to use:

- `useLanguage()` from `LanguageContext`
- `useAlert()` from `AlertContext`

**Problem:** These providers were **BELOW** `MaintenanceCheck` in the component tree, so they weren't available!

### Additional Issue: Wrong Component

The `Maintenance.jsx` component was an **admin page** for managing maintenance announcements (with forms, settings, etc.), not a **public maintenance page** to show users when the backend is down.

## ✅ Solution

### Created Two Separate Components:

#### 1. PublicMaintenancePage (NEW) - Public Facing

**File:** `portfolio-client/src/components/PublicMaintenancePage.jsx`

**Purpose:**

- Show to users when backend is down or maintenance is enabled
- Doesn't use any context providers (standalone component)
- Multilingual support using browser language detection
- Displays default message or custom message from `maintenance.json`

**Features:**

- ✅ Works without LanguageContext (uses browser language)
- ✅ Works without AlertContext (no alerts needed)
- ✅ Beautiful UI with animations
- ✅ Supports Japanese, English, and Uzbek
- ✅ Shows custom developer message if configured
- ✅ Status indicator with blinking animation

**Usage:**

```javascript
// MaintenanceCheck.jsx
if (isMaintenance) {
	return <PublicMaintenancePage /> // ✅ No contexts needed
}
```

#### 2. Maintenance.jsx (EXISTING) - Admin Page

**File:** `portfolio-client/src/pages/Maintenance/Maintenance.jsx`

**Purpose:**

- Admin page for managing maintenance announcements
- Accessible at `/maintenance` route (admin only)
- Uses LanguageContext and AlertContext (works inside providers)

**Usage:**

```javascript
// routes.jsx
<Route path='/maintenance' element={<ProtectedLayout allowedRoles={['Admin']} />}>
	<Route index element={<Maintenance />} /> // ✅ Inside providers
</Route>
```

## 🎯 How Maintenance Works Now

### Scenario 1: Developer Enables Maintenance Mode

**File:** `portfolio-server/src/config/maintenance.json`

```json
{
	"enabled": true,
	"message": "システムメンテナンス中です。\n2026年1月16日 18:00 - 19:00\n\nご不便をおかけして申し訳ございません。",
	"title": "定期メンテナンス",
	"developerMessage": "Database migration in progress. ETA: 1 hour"
}
```

**Flow:**

1. Frontend calls `/api/maintenance`
2. Backend returns `{ enabled: true, message: "...", ... }`
3. `MaintenanceCheck` sees `enabled: true`
4. Shows `PublicMaintenancePage` with custom message
5. ✅ Users see custom maintenance message

### Scenario 2: Backend is Down (Ctrl+C in dev, or server crash in production)

**Flow:**

1. Frontend calls `/api/maintenance`
2. Request fails with `ERR_NETWORK` or `ECONNREFUSED`
3. `MaintenanceCheck` catches error
4. Shows `PublicMaintenancePage` with default message
5. ✅ Users see "System under maintenance" message

### Scenario 3: Normal Operation

**File:** `maintenance.json`

```json
{
	"enabled": false,
	"message": "",
	"title": "",
	"developerMessage": ""
}
```

**Flow:**

1. Frontend calls `/api/maintenance`
2. Backend returns `{ enabled: false }`
3. `MaintenanceCheck` renders `children`
4. ✅ App works normally

## 📊 Comparison

### Before Fix:

| Scenario            | Result   | Error                           |
| ------------------- | -------- | ------------------------------- |
| Backend down        | ❌ Crash | "Cannot destructure 'language'" |
| Maintenance enabled | ❌ Crash | "Cannot destructure 'language'" |
| Normal operation    | ✅ Works | None                            |

### After Fix:

| Scenario            | Result   | Display                                 |
| ------------------- | -------- | --------------------------------------- |
| Backend down        | ✅ Works | PublicMaintenancePage (default message) |
| Maintenance enabled | ✅ Works | PublicMaintenancePage (custom message)  |
| Normal operation    | ✅ Works | App routes normally                     |

## 🎨 PublicMaintenancePage Features

### 1. Multilingual Support (No Context Needed)

```javascript
const getBrowserLanguage = () => {
	const lang = navigator.language || navigator.userLanguage || 'ja'
	if (lang.startsWith('en')) return 'en'
	if (lang.startsWith('uz')) return 'uz'
	return 'ja' // Default to Japanese
}
```

### 2. Default Messages

- **Japanese**: メンテナンス中 (Under Maintenance)
- **English**: Under Maintenance
- **Uzbek**: Texnik xizmat

### 3. Custom Messages from maintenance.json

- Developer can set custom title
- Developer can set custom message (supports line breaks)
- Developer can add technical details in developerMessage

### 4. Beautiful UI

- Gradient background
- Glassmorphism effect
- Pulsing build icon animation
- Status indicator with blinking dot
- Responsive design (mobile, tablet, desktop)

## 🧪 Testing

### Test 1: Backend Down (Local Development)

```bash
# Terminal 1: Start frontend
cd portfolio-client
npm run dev

# Terminal 2: DON'T start backend (or stop it with Ctrl+C)

# Browser: Navigate to http://localhost:5173
# ✅ Should see PublicMaintenancePage with default message
```

### Test 2: Maintenance Mode Enabled

```bash
# 1. Edit portfolio-server/src/config/maintenance.json:
{
  "enabled": true,
  "message": "Scheduled maintenance\nJanuary 16, 2026\n18:00 - 19:00",
  "title": "Maintenance Notice",
  "developerMessage": "Database migration in progress"
}

# 2. Start backend
cd portfolio-server
npm run dev

# 3. Browser: Navigate to http://localhost:5173
# ✅ Should see PublicMaintenancePage with custom message
```

### Test 3: Admin Maintenance Page

```bash
# 1. Set maintenance.json enabled: false
# 2. Start both frontend and backend
# 3. Login as Admin
# 4. Navigate to /maintenance
# ✅ Should see Admin maintenance management page (Maintenance.jsx)
```

## 📝 Files Modified

### 1. Created: PublicMaintenancePage.jsx

**Path:** `portfolio-client/src/components/PublicMaintenancePage.jsx`

- New standalone maintenance page
- No context dependencies
- Multilingual support
- Beautiful UI with animations

### 2. Updated: MaintenanceCheck.jsx

**Path:** `portfolio-client/src/components/MaintenanceCheck.jsx`

- Changed import from `Maintenance` to `PublicMaintenancePage`
- Updated comments for clarity
- No logic changes

### 3. Existing: Maintenance.jsx (No Changes)

**Path:** `portfolio-client/src/pages/Maintenance/Maintenance.jsx`

- Remains as admin page
- Still uses LanguageContext and AlertContext
- Accessible at `/maintenance` route

## 🎯 Summary

### Issue:

Maintenance page crashed because it tried to use context providers that weren't available.

### Solution:

- Created `PublicMaintenancePage` - standalone component without context dependencies
- Kept `Maintenance.jsx` as admin page (inside providers, accessible via routes)
- `MaintenanceCheck` now uses `PublicMaintenancePage`

### Benefits:

- ✅ No crashes when backend is down
- ✅ Beautiful maintenance page with animations
- ✅ Multilingual support (browser-based)
- ✅ Custom messages via maintenance.json
- ✅ Admin can still manage announcements via /maintenance route
- ✅ Separation of concerns (public vs admin pages)

---

**Issue Date**: January 16, 2026  
**Issue**: Context provider error on maintenance page  
**Root Cause**: Component rendered outside provider tree  
**Solution**: Created standalone PublicMaintenancePage  
**Status**: ✅ FIXED
