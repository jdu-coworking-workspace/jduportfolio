# Maintenance Mode Usage Guide

## 📋 Overview

The maintenance system has **two modes**:

1. **Default Mode** - Shown when backend is DOWN (not responding)
2. **Custom Mode** - Shown when developer sets `enabled: true` in `maintenance.json`

---

## 🎯 Mode 1: Default Message (Backend Down)

### When It Shows:

- Backend server is stopped (Ctrl+C in development)
- Backend crashes or fails to respond
- Network error (ECONNREFUSED, ERR_NETWORK)
- 500, 502, 503, 504 errors

### What Users See:

**Japanese Browser:**

```
メンテナンス中
ご不便をおかけして申し訳ございません

システムは現在メンテナンス中です。しばらくしてから再度お試しください。
```

**English Browser:**

```
Under Maintenance
We apologize for any inconvenience

System is currently under maintenance. Please try again later.
```

**Uzbek Browser:**

```
Texnik xizmat
Noqulaylik uchun uzr so'raymiz

Tizim texnik xizmat jarayonida. Iltimos, keyinroq urinib ko'ring.
```

### Configuration:

**No configuration needed!** This is automatic.

**File:** `maintenance.json`

```json
{
	"enabled": false
}
```

When `enabled: false` or backend is down → Default message shows automatically

---

## 🎯 Mode 2: Custom Message (Developer Maintenance)

### When It Shows:

- Developer sets `enabled: true` in `maintenance.json`
- Backend is running and responds successfully
- Used for scheduled maintenance or custom announcements

### How to Enable:

**File:** `portfolio-server/src/config/maintenance.json`

```json
{
	"enabled": true,
	"message": "システムは現在メンテナンス中です。しばらくしてから再度お試しください。",
	"messageEn": "The system is currently under maintenance. Please try again later.",
	"messageUz": "Tizim hozirda texnik xizmat ko'rsatish rejimida. Iltimos, keyinroq qayta urinib ko'ring.",
	"developerMessage": "Database migration in progress. ETA: 2 hours"
}
```

### What Users See:

**Page Structure:**

```
メンテナンス中                    ← Fixed title (from default)
ご不便をおかけして申し訳ございません  ← Fixed subtitle (from default)

[Your custom message here]        ← From maintenance.json
                                     (message, messageEn, or messageUz)

[Developer message if provided]    ← Optional technical details
```

### Message Fields:

| Field              | Language | Required       | Description                                                              |
| ------------------ | -------- | -------------- | ------------------------------------------------------------------------ |
| `enabled`          | -        | ✅ Yes         | `true` to show custom message, `false` for normal                        |
| `message`          | Japanese | ✅ Yes         | Message shown to Japanese users                                          |
| `messageEn`        | English  | ⭐ Recommended | Message shown to English users (falls back to `message` if not provided) |
| `messageUz`        | Uzbek    | ⭐ Recommended | Message shown to Uzbek users (falls back to `message` if not provided)   |
| `developerMessage` | Any      | ❌ Optional    | Technical details shown to all users                                     |

---

## 📝 Example Scenarios

### Example 1: Scheduled Maintenance

**Use Case:** Database maintenance on January 16, 18:00-19:00

**File:** `maintenance.json`

```json
{
	"enabled": true,
	"message": "【定期メンテナンスのお知らせ】\n\n2026年1月16日 18:00 - 19:00\nデータベースメンテナンスを実施いたします。\n\nご迷惑をおかけして申し訳ございません。",
	"messageEn": "【Scheduled Maintenance Notice】\n\nDate: January 16, 2026\nTime: 18:00 - 19:00 JST\nDatabase maintenance will be performed.\n\nWe apologize for any inconvenience.",
	"messageUz": "【Rejalashtirilgan texnik xizmat】\n\nSana: 2026 yil 16 yanvar\nVaqt: 18:00 - 19:00 JST\nMa'lumotlar bazasi texnik xizmati amalga oshiriladi.\n\nNoqulaylik uchun uzr so'raymiz.",
	"developerMessage": "Database migration and index optimization. Expected duration: 1 hour."
}
```

**Result:** Users see your scheduled maintenance notice in their language

---

### Example 2: Emergency Maintenance

**Use Case:** Urgent security patch being applied

**File:** `maintenance.json`

```json
{
	"enabled": true,
	"message": "【緊急メンテナンス】\n\nセキュリティアップデートを適用中です。\n30分以内に完了予定です。",
	"messageEn": "【Emergency Maintenance】\n\nApplying security updates.\nExpected completion: within 30 minutes.",
	"messageUz": "【Favqulodda texnik xizmat】\n\nXavfsizlik yangilanishlari o'rnatilmoqda.\nTugash vaqti: 30 daqiqa ichida.",
	"developerMessage": "CVE-2026-12345 security patch deployment in progress"
}
```

**Result:** Users see urgent maintenance notice with technical details

---

### Example 3: Backend Crash (Automatic)

**Use Case:** Backend server crashed unexpectedly

**File:** `maintenance.json` (any state - doesn't matter)

```json
{
	"enabled": false
}
```

**Result:** Users automatically see default maintenance message (backend can't respond)

---

## 🔄 Workflow

### Activating Maintenance Mode:

```bash
# 1. Edit maintenance.json
cd portfolio-server/src/config
nano maintenance.json  # or your editor

# 2. Set enabled to true and add your message
{
  "enabled": true,
  "message": "Your message here..."
}

# 3. Save and commit (or just save for temporary)
git add maintenance.json
git commit -m "Enable maintenance mode for database migration"

# 4. Deploy or restart backend
npm run dev  # development
# or
pm2 restart portfolio-server  # production
```

### Deactivating Maintenance Mode:

```bash
# 1. Edit maintenance.json
cd portfolio-server/src/config
nano maintenance.json

# 2. Set enabled to false
{
  "enabled": false
}

# 3. Save and deploy
git add maintenance.json
git commit -m "Disable maintenance mode - system restored"

# 4. Users can access the system normally
```

---

## ✅ Testing

### Test 1: Default Message (Backend Down)

```bash
# Stop backend
cd portfolio-server
# Press Ctrl+C to stop backend

# Open browser
http://localhost:5173

# ✅ Should see: メンテナンス中 (default message)
```

### Test 2: Custom Message

```bash
# Edit maintenance.json
{
  "enabled": true,
  "message": "テストメッセージ"
}

# Start backend
npm run dev

# Open browser
http://localhost:5173

# ✅ Should see: メンテナンス中
#              ご不便をおかけして申し訳ございません
#              テストメッセージ ← Your custom message
```

### Test 3: Normal Operation

```bash
# Edit maintenance.json
{
  "enabled": false
}

# Backend running
npm run dev

# Open browser
http://localhost:5173

# ✅ Should see: Normal login page
```

---

## 🎨 Message Formatting

### Line Breaks:

Use `\n` in JSON for line breaks:

```json
{
	"message": "First line\n\nSecond line\n\nThird line"
}
```

**Result:**

```
First line

Second line

Third line
```

### Sections:

Use brackets and line breaks for organized messages:

```json
{
	"message": "【タイトル】\n\n説明文1\n説明文2\n\n【詳細】\n詳細内容"
}
```

**Result:**

```
【タイトル】

説明文1
説明文2

【詳細】
詳細内容
```

---

## 📊 Comparison

| Scenario                 | enabled value | Backend Status | Message Shown               |
| ------------------------ | ------------- | -------------- | --------------------------- |
| Normal operation         | `false`       | ✅ Running     | Login page                  |
| Scheduled maintenance    | `true`        | ✅ Running     | Custom message from JSON    |
| Backend crash            | any           | ❌ Down        | Default message (automatic) |
| Backend stopped (Ctrl+C) | any           | ❌ Down        | Default message (automatic) |

---

## 🔑 Key Points

1. **Default message** = Automatic when backend is down

   - No configuration needed
   - Shows in user's browser language
   - Can't be customized (it's a fallback)

2. **Custom message** = Manual when developer enables it

   - Requires `enabled: true` in `maintenance.json`
   - Fully customizable (message, messageEn, messageUz)
   - Optional developer message for technical details

3. **Title and subtitle** = Always the same

   - "メンテナンス中" / "Under Maintenance" / "Texnik xizmat"
   - "ご不便をおかけして申し訳ございません" / "We apologize..." / "Noqulaylik uchun..."
   - Based on browser language

4. **Message content** = Variable
   - Default: Built-in generic message
   - Custom: Your message from `maintenance.json`

---

**Created**: January 16, 2026  
**Purpose**: Guide for using maintenance mode system  
**Files**: `maintenance.json`, `PublicMaintenancePage.jsx`, `MaintenanceCheck.jsx`
