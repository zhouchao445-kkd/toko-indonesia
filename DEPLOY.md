# Toko Indonesia - Deployment Guide

This guide walks you through deploying the Toko Indonesia e-commerce platform to production using Supabase (database), Render (backend), and Vercel (frontend).

## Prerequisites

- GitHub account with access to this repository
- Supabase account (https://supabase.com)
- Render account (https://render.com) - **No credit card required**
- Vercel account (https://vercel.com)
- Node.js 18+ and pnpm installed locally (for initial setup)

## Architecture Overview

```
┌─────────────┐
│   Vercel    │  Frontend (Next.js)
│  (Port 3000)│
└──────┬──────┘
       │
       │ HTTP API
       │
┌──────▼──────┐
│   Render    │  Backend (Express.js)
│  (Port 4000)│
└──────┬──────┘
       │
       │ PostgreSQL
       │
┌──────▼──────┐
│  Supabase   │  Database + Auth + Storage
│             │
└─────────────┘
```

## Step 1: Supabase Setup (Database)

### 1.1 Create a New Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - **Name**: `toko-indonesia` (or your preferred name)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users (e.g., Southeast Asia)
4. Click "Create new project"
5. Wait 2-3 minutes for provisioning

### 1.2 Get Connection Details

1. Go to **Project Settings** → **Database**
2. Under "Connection string", select **URI** tab
3. Copy the connection string (looks like):
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
   ```
4. Replace `[PASSWORD]` with your database password
5. This is your `DATABASE_URL`

### 1.3 Get API Keys

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://[PROJECT_REF].supabase.co`
   - **service_role key**: (secret key, keep safe!)
   - **anon key**: (public key for frontend)

### 1.4 Run Database Setup

1. Go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the entire content of `backend/prisma/setup.sql` and paste it
4. Click **Run** (or Ctrl+Enter)
5. Wait for completion - you should see `✅ Database setup complete!`

This will create:
- 28 database tables (roles, permissions, users, products, orders, etc.)
- All indexes and constraints
- Seed data (admin accounts, test products, categories, bank accounts)

## Step 2: Render Setup (Backend)

### 2.1 Create a New Web Service

1. Go to https://dashboard.render.com/
2. Click **New +** → **Web Service**
3. Select **Build and deploy from a Git repository** → **Next**
4. **Connect GitHub** → Authorize your GitHub account
5. Search for `toko-indonesia` → Click **Connect**

### 2.2 Configure the Service

Fill in the following settings:

| Setting | Value |
|---------|-------|
| **Name** | `toko-indonesia-backend` |
| **Region** | `Singapore` (closest to Indonesia) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npx prisma generate && npm run build` |
| **Start Command** | `npm run start:prod` |
| **Instance Type** | `Free` |

### 2.3 Configure Environment Variables

Scroll to **Environment Variables** section, click **Add Environment Variable**, and add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres` |
| `JWT_SECRET` | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `PORT` | `4000` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://toko-indonesia.vercel.app` (update after Vercel deploy) |
| `SUPABASE_URL` | `https://[PROJECT_REF].supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service_role key from Supabase |
| `BACKEND_PUBLIC_URL` | `https://toko-indonesia.onrender.com` (update after deploy) |

### 2.4 Deploy

1. Click **Create Web Service**
2. Wait 3-5 minutes for build and deploy
3. Once deployed, copy the URL from the top (e.g., `https://toko-indonesia-backend-xxxx.onrender.com`)
4. This is your `NEXT_PUBLIC_API_URL`

**Note**: First visit may take 30 seconds (cold start on free tier).

### 2.5 Verify Backend

Visit: `https://toko-indonesia-backend-xxxx.onrender.com/health`

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-XXTXX:XX:XX.XXXZ"
}
```

## Step 3: Vercel Setup (Frontend)

### 3.1 Import Project

1. Go to https://vercel.com/new
2. Import your GitHub repository: `toko-indonesia`
3. Vercel will auto-detect Next.js

### 3.2 Configure Project

| Setting | Value |
|---------|-------|
| **Project Name** | `toko-indonesia-frontend` |
| **Framework Preset** | `Next.js` (auto-detected) |
| **Root Directory** | `./` (leave as default, frontend is at root) |
| **Build Command** | `next build` (default) |
| **Output Directory** | `.next` (default) |

### 3.3 Configure Environment Variables

Click **Environment Variables** and add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://toko-indonesia-backend-xxxx.onrender.com` (from Step 2.4) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[PROJECT_REF].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key from Supabase |
| `NEXT_PUBLIC_SITE_NAME` | `Toko Indonesia` |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `id` |

### 3.4 Deploy

1. Click **Deploy**
2. Wait 2-3 minutes
3. Copy the URL (e.g., `https://toko-indonesia.vercel.app`)

### 3.5 Update Backend CORS

1. Go back to Render Dashboard → `toko-indonesia-backend` service
2. Go to **Environment** tab
3. Update `CORS_ORIGIN` to your Vercel URL:
   ```
   CORS_ORIGIN=https://toko-indonesia.vercel.app
   ```
4. Click **Save Changes**
5. Render will auto-redeploy (30 seconds)

## Step 4: Post-Deployment Verification

### 4.1 Check Backend Health

Visit: `https://toko-indonesia-backend-xxxx.onrender.com/health`

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-XXTXX:XX:XX.XXXZ"
}
```

### 4.2 Check Frontend

Visit: `https://toko-indonesia.vercel.app`

You should see the homepage with:
- Navigation bar
- Banner carousel
- Product categories
- Featured products

### 4.3 Test Admin Panel

1. Go to: `https://toko-indonesia.vercel.app/admin/login`
2. Login with seed admin account:
   - Username: `admin`
   - Password: `admin123`
3. You should see the admin dashboard

### 4.4 Test Member Features

1. Register a new account
2. Test:
   - Browse products
   - Add to cart
   - View order history

## Step 5: Custom Domain (Optional)

### 5.1 Vercel Custom Domain

1. Go to Vercel project → **Settings** → **Domains**
2. Add your domain (e.g., `toko.com`)
3. Follow DNS configuration instructions
4. Wait for DNS propagation (up to 24 hours)

### 5.2 Render Custom Domain

1. Go to Render service → **Settings** → **Custom Domains**
2. Click **Add Custom Domain**
3. Follow DNS configuration instructions

## Troubleshooting

### Backend Issues

**Problem**: Backend returns 500 errors
- Check Render logs for error details
- Verify DATABASE_URL is correct
- Ensure migrations ran successfully

**Problem**: CORS errors in browser console
- Update CORS_ORIGIN in Render to match your Vercel URL
- Redeploy backend after updating

**Problem**: Database connection failed
- Verify DATABASE_URL format is correct
- Check Supabase project is active
- Ensure database password is correct

### Frontend Issues

**Problem**: API calls fail
- Verify NEXT_PUBLIC_API_URL is correct (no trailing slash)
- Check backend is running and accessible
- Check browser console for CORS errors

**Problem**: Images not loading
- Check file upload configuration
- Verify UPLOAD_DIR exists and is writable
- Check file permissions

### Database Issues

**Problem**: Tables don't exist
- Run setup.sql again in Supabase SQL Editor
- Check DATABASE_URL is pointing to correct database

**Problem**: Seed data missing
- Run setup.sql again (it uses IF NOT EXISTS)
- Check seed section completed without errors

## Environment Variables Reference

### Backend (Render)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| DATABASE_URL | Yes | PostgreSQL connection string | `postgresql://postgres:...` |
| JWT_SECRET | Yes | JWT signing secret (32+ chars) | `node -e "..."` |
| PORT | No | Server port (default: 4000) | `4000` |
| NODE_ENV | No | Environment (default: production) | `production` |
| CORS_ORIGIN | Yes | Frontend URL for CORS | `https://toko.vercel.app` |
| SUPABASE_URL | Yes | Supabase project URL | `https://xxx.supabase.co` |
| SUPABASE_SERVICE_ROLE_KEY | Yes | Supabase service role key | `eyJhbGc...` |
| BACKEND_PUBLIC_URL | No | Backend public URL | `https://xxx.onrender.com` |

### Frontend (Vercel)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| NEXT_PUBLIC_API_URL | Yes | Backend API URL | `https://xxx.onrender.com` |
| NEXT_PUBLIC_SUPABASE_URL | Yes | Supabase project URL | `https://xxx.supabase.co` |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Yes | Supabase anon key | `eyJhbGc...` |
| NEXT_PUBLIC_SITE_NAME | No | Site name (default: Toko Indonesia) | `Toko Indonesia` |
| NEXT_PUBLIC_DEFAULT_LOCALE | No | Default locale (default: id) | `id` |

## Security Checklist

- [ ] JWT_SECRET is at least 32 characters and randomly generated
- [ ] Database password is strong and unique
- [ ] service_role key is kept secret (never expose in frontend)
- [ ] CORS_ORIGIN is set to your actual frontend URL
- [ ] Environment variables are not committed to git
- [ ] .env files are in .gitignore
- [ ] HTTPS is enabled (automatic on Vercel/Render)

## Maintenance

### Database Backups

Supabase automatically backs up your database daily. To manually backup:
1. Go to Supabase Dashboard → **Database** → **Backups**
2. Click "Download backup"

### Monitoring

- **Render**: Check logs and metrics in Render dashboard
- **Vercel**: Check deployment logs and analytics in Vercel dashboard
- **Supabase**: Check query performance and storage usage in Supabase dashboard

### Updates

Both Render and Vercel auto-deploy when you push to the `main` branch.

## Default Admin Accounts

After running setup.sql, these accounts are available:

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Super Admin |
| `finance` | `finance123` | Finance Super Admin |

**Important**: Change these passwords after first login!
