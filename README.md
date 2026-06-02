# Bulk Mailer POC (Mailing & Campaigns Module)

A production-ready Proof of Concept (POC) for managing bulk email delivery campaigns. It parses uploaded recipient files (CSV/Excel), verifies their formats, lets you compose HTML/plain-text emails, and coordinates sending using the **Resend API**. It also logs full campaign history and provides individual and bulk deletion options.

**Stack:** Node.js + Express + Supabase (backend) · React + Vite + Vanilla CSS (frontend) · Resend SDK (email delivery)

---

## Features

1. **Recipients File Parsing**: Upload `.csv`, `.xlsx`, or `.xls` files. It automatically maps fields case-insensitively (e.g. `email`, `name`, `first name`).
2. **Interactive Preview**: Preview parsed valid recipient addresses and errors (e.g. invalid formats, duplicate rows) in real-time before sending.
3. **Fixed Sender**: Utilizes a locked, secure sender profile pulled from the environment configuration to prevent sender spoofing.
4. **Rich Compose**: Supports writing Subject, HTML content, and a custom `Reply-To` address.
5. **Rate-limited Batching**: Sends emails in self-throttled, rate-limited batches with intelligent delay and automatic retry fallback on `429 Too Many Requests` status to comply with Resend's free tier policy.
6. **Campaign Analytics & History**: Logs all sent campaigns in a Supabase Postgres table (`mail_logs`), showcasing delivery success metrics (total sent, failed, per-recipient message ID, error logs).
7. **Clean Management**: Provides a UI modal confirmation to delete single campaigns or clean the entire history.

---

## Quick Start (Local Setup)

### 1. Database Setup (Supabase)

1. Log in to your **Supabase Dashboard** and open your project.
2. Go to **SQL Editor** → **New Query**.
3. Copy and run the initial migration: [`backend/migrations/001_initial.sql`](backend/migrations/001_initial.sql).
4. Create a second new query, copy and run the mailing migration: [`backend/migrations/002_mail_logs.sql`](backend/migrations/002_mail_logs.sql).

### 2. Configure Backend Environment

Copy the environment example and create a `.env` file in the `backend` folder:

```bash
cd backend
cp .env.example .env
```

Edit your `backend/.env` file and supply your credentials:

```ini
PORT=3001
NODE_ENV=development

# Supabase Credentials (from Project Settings -> API)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Resend API configuration (from resend.com)
RESEND_API_KEY=re_your_api_key_here

# Verified Sender Identity (Must be verified in Resend dashboard)
MAIL_FROM_NAME="Mohammed Taha"
MAIL_FROM_EMAIL="hello@yourverifieddomain.online"
```

### 3. Run the Backend Server

```bash
cd backend
npm install
npm run dev
# Running at http://localhost:3001
# Health endpoint: http://localhost:3001/api/health
```

### 4. Run the Frontend Client

Open a new terminal session:

```bash
cd frontend
npm install
npm run dev
# Running at http://localhost:5173
```

Visit `http://localhost:5173` in your browser.

---

## CSV / Excel Column Reference

The mailing list supports flexible column header mapping:

| Target Column | Required | Allowed Header Names (Case-Insensitive) |
|---|---|---|
| **email** | ✅ | `email`, `e-mail`, `email address`, `recipient email` |
| **name** | ❌ | `name`, `full name`, `first name`, `recipient name` |

---

## Production Deployment

This project is optimized and ready for production deployment using **Render** (backend) and **Vercel** (frontend).

### Deploying the Backend to Render
A [`render.yaml`](render.yaml) file is included in the project root.
1. Connect your repository to Render.
2. Select **Blueprints** and create an instance.
3. Fill in the environment variables when prompted (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`).
4. Set `CORS_ORIGIN` to your Vercel frontend URL once deployed to authorize API requests.

### Deploying the Frontend to Vercel
A [`vercel.json`](frontend/vercel.json) is included in the `frontend` folder to handle SPA routing correctly.
1. Deploy the `frontend` subfolder to Vercel.
2. Set the environment variable:
   - `VITE_API_BASE_URL` = `https://your-backend-render-domain.onrender.com/api`
3. Vercel will build and host your web application.

---

## Project Structure

```
Bulk_uploader/
├── backend/
│   ├── migrations/
│   │   ├── 001_initial.sql
│   │   └── 002_mail_logs.sql
│   ├── src/
│   │   ├── config/          supabase.js, constants.js
│   │   ├── controllers/     mailingController.js
│   │   ├── middlewares/     errorHandler, rateLimiter, uploadMiddleware
│   │   ├── routes/          index.js, mailing.js, health.js
│   │   ├── services/        fileParser.js, mailService.js
│   │   └── utils/           ApiError.js, validators.js, columnMapper.js, logger.js
│   ├── server.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/             client.js, mailing.js
    │   ├── components/      NavBar.jsx, FileUploader.jsx, Pagination.jsx
    │   ├── pages/           MailingPage.jsx, CampaignsPage.jsx
    │   ├── index.css
    │   ├── App.jsx
    │   └── main.jsx
    ├── vercel.json
    ├── vite.config.js
    └── package.json
```
