# GV Union Bank — Full Stack Setup & Hosting Guide

## What's Included
| Part | Technology | Purpose |
|------|-----------|---------|
| `backend/` | Python FastAPI | API, OTP, auth, admin |
| `frontend/` | React + Tailwind | Web app (PWA) |
| `mobile/` | React Native / Expo | iOS & Android app |

---

## STEP 1 — Get Your API Keys (Free)

### SendGrid (Real Email OTP)
1. Go to https://sendgrid.com → Sign up free
2. Settings → API Keys → Create API Key (Full Access)
3. Copy the key (starts with `SG.`)
4. Go to Settings → Sender Authentication → verify your email/domain

### Twilio (Real SMS OTP)
1. Go to https://twilio.com → Sign up free (get $15 trial credit)
2. Dashboard → Account SID and Auth Token (copy both)
3. Phone Numbers → Buy a number (free with trial)
4. Copy the phone number (format: +15551234567)

---

## STEP 2 — Run the Backend Locally

```bash
cd backend

# Copy and fill in your API keys
cp .env.example .env
# Edit .env with your SendGrid + Twilio keys

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Seed the database with admin + demo users
python seed.py

# Start the server
uvicorn app.main:app --reload --port 8000
```

Backend is live at: http://localhost:8000
API docs at: http://localhost:8000/docs

---

## STEP 3 — Run the Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

Web app at: http://localhost:5173

### Login credentials
| Role | Email | Password |
|------|-------|----------|
| Customer | john.doe@email.com | password123 |
| Customer | alex.morgan@email.com | password123 |
| Customer | priya.p@email.com | password123 |
| **Admin** | admin@gvunionbank.com | Admin@GVBank2026! |

---

## STEP 4 — Run the Mobile App

```bash
cd mobile
npm install

# Install Expo CLI globally
npm install -g expo-cli

# IMPORTANT: Update the backend URL in src/services/api.ts
# Change BASE_URL to your deployed backend URL (Step 5)

# Start the app
expo start
```

- Press `i` for iOS simulator (Mac only)
- Press `a` for Android emulator
- Scan the QR code with **Expo Go** app on your real phone

---

## STEP 5 — Deploy to the Internet (Make it Your Website)

### Deploy Backend → Railway.app (Free)

1. Go to https://railway.app → Sign up with GitHub
2. New Project → Deploy from GitHub repo → Select your repo
3. Add service → select the `backend/` folder
4. Set environment variables in Railway dashboard:
   ```
   SENDGRID_API_KEY=SG.your-key
   FROM_EMAIL=noreply@gvunionbank.com
   TWILIO_ACCOUNT_SID=ACxxxxxxxx
   TWILIO_AUTH_TOKEN=your-token
   TWILIO_PHONE_NUMBER=+15551234567
   SECRET_KEY=any-long-random-string
   ADMIN_EMAIL=admin@gvunionbank.com
   ADMIN_PASSWORD=YourSecurePassword!
   ```
5. Railway gives you a URL like: `https://gvbank-backend.railway.app`
6. Run seed: in Railway → backend service → Shell → `python seed.py`

### Deploy Frontend → Netlify (Free)

1. Go to https://netlify.com → Sign up
2. In `frontend/src/services/api.ts`, change baseURL to your Railway URL:
   ```ts
   const api = axios.create({ baseURL: 'https://gvbank-backend.railway.app/api' })
   ```
3. Build the frontend: `npm run build` (creates `dist/` folder)
4. On Netlify: drag and drop the `dist/` folder
5. Your site is live at: `gvunionbank.netlify.app`

### Custom Domain (Optional, ~$12/year)

1. Buy domain at https://namecheap.com (e.g. `gvunionbank.com`)
2. In Netlify → Domain Settings → Add custom domain
3. Follow Netlify's DNS instructions (takes ~10 minutes)
4. Netlify gives free HTTPS automatically

---

## STEP 6 — Install as Mobile App (PWA)

The frontend is already a Progressive Web App. Users can install it:

**iPhone:**
1. Open site in Safari
2. Tap the Share button (box with arrow)
3. Scroll down → "Add to Home Screen"
4. Done — it works like a real app!

**Android:**
1. Open site in Chrome
2. Tap ⋮ menu → "Add to Home Screen" or "Install App"
3. Done!

---

## STEP 7 — Publish Mobile App to App Stores

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure
eas build:configure

# Build for Android (APK)
eas build --platform android --profile preview

# Build for iOS (requires Apple Developer account $99/yr)
eas build --platform ios
```

For Android: Share the APK directly or upload to Google Play Store ($25 one-time fee)
For iOS: Upload to App Store ($99/year Apple Developer Program)

---

## Architecture Summary

```
User Phone/Browser
       │
       ▼
   Netlify CDN
  (React PWA)
       │ HTTPS API calls
       ▼
  Railway Backend
   (FastAPI + SQLite)
       │
       ├──► SendGrid ──► User Email (OTP)
       └──► Twilio   ──► User Phone (SMS OTP)
```

---

## How OTP Works

1. User enters email + password
2. Backend validates credentials
3. Backend generates 6-digit code, saves to DB with 10-min expiry
4. Backend sends code via **SendGrid** (email) AND **Twilio** (SMS) simultaneously
5. User enters code in app
6. Backend verifies — if correct, issues JWT token
7. All transfers also require a separate OTP before execution

Admin accounts skip OTP (they use only email+password).
