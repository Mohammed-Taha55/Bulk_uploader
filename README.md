# Bulk Mailer POC

A module for managing **senders** and **recipients** in bulk via CSV / Excel file uploads.
Built as a POC before integration into Jobbie.

**Stack:** Node.js + Express + Supabase (backend) · React + Vite (frontend)

---

## Quick Start

### 1. Run the SQL Migration in Supabase

1. Go to your Supabase project → **SQL Editor** → **New Query**
2. Paste the contents of [`backend/migrations/001_initial.sql`](backend/migrations/001_initial.sql)
3. Click **Run**

### 2. Configure the Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **Where to find these:**  
> Supabase Dashboard → Project Settings → API → Project URL + service_role key

### 3. Install & Run the Backend

```bash
cd backend
npm install
npm run dev
# → API running at http://localhost:3001
# → Health check: http://localhost:3001/api/health
```

### 4. Install & Run the Frontend

```bash
cd frontend
npm install
npm run dev
# → App running at http://localhost:5173
```

---

## CSV / Excel Column Reference

### Senders
| Column (flexible aliases) | Required | Notes |
|---|---|---|
| `email` | ✅ | Also: `from`, `sender email`, `email address` |
| `name` | ✅ | Also: `sender name`, `display name`, `full name` |
| `reply_to` | ❌ | Also: `reply to`, `replyto` |

### Recipients
| Column (flexible aliases) | Required | Notes |
|---|---|---|
| `email` | ✅ | Also: `email address`, `e-mail` |
| `name` | ❌ | Also: `full name`, `recipient name` |
| `tags` | ❌ | Comma/semicolon-separated. Also: `segment`, `list`, `group` |
| *any other column* | ❌ | Stored in `metadata` jsonb field |

> Column matching is **case-insensitive** and trims whitespace.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | DB ping + uptime |
| `POST` | `/api/senders/upload` | Upload senders CSV/Excel (`multipart/form-data`, field: `file`) |
| `GET` | `/api/senders` | List senders (`?page=1&limit=50&status=active`) |
| `DELETE` | `/api/senders/:id` | Soft-delete (sets status → inactive) |
| `POST` | `/api/recipients/upload` | Upload recipients CSV/Excel |
| `GET` | `/api/recipients` | List recipients (`?page&limit&status&tag`) |
| `PATCH` | `/api/recipients/:id/status` | Update status (`{ "status": "unsubscribed" }`) |
| `GET` | `/api/upload-logs` | List all upload logs |
| `GET` | `/api/upload-logs/:id` | Get log with full error details |

### Upload Response Format

```json
{
  "success": true,
  "message": "Upload complete: 80 inserted, 15 updated, 5 error(s).",
  "summary": { "total": 100, "inserted": 80, "updated": 15, "skipped": 0, "errors": 5 },
  "errors": [
    { "row": 3, "email": "bad@", "reason": "Invalid email format: \"bad@\"" }
  ],
  "logId": "uuid"
}
```

---

## Error Handling

The backend collects errors at every level:

| Layer | Example | Behavior |
|---|---|---|
| File level | Wrong extension, empty file, >5 MB | `400` immediately, nothing saved |
| Parse level | Corrupted Excel, no header row | `400` immediately |
| Row level | Invalid email, name too long, intra-file duplicate | Row skipped, error recorded, rest imported |
| DB level | Constraint violation, network timeout | Row-by-row fallback, error recorded per row |

Errors never stop a valid partial import.

---

## Adding a Mail Provider (later)

Edit [`backend/src/services/mailService.js`](backend/src/services/mailService.js) — the `send()` method interface is already defined. No other files need changing.

---

## Project Structure

```
Bulk_uploader/
├── backend/
│   ├── migrations/001_initial.sql
│   ├── src/
│   │   ├── config/          supabase.js, constants.js
│   │   ├── utils/           ApiError, validators, columnMapper, chunker, logger
│   │   ├── middlewares/     errorHandler, rateLimiter, uploadMiddleware
│   │   ├── services/        fileParser, senderService, recipientService, uploadLogService, mailService
│   │   ├── controllers/     senderController, recipientController, uploadLogController
│   │   ├── routes/          index, senders, recipients, uploadLogs, health
│   │   └── app.js
│   └── server.js
└── frontend/
    └── src/
        ├── api/             client, senders, recipients, uploadLogs
        ├── components/      NavBar, FileUploader, UploadResult, StatusBadge, Pagination
        └── pages/           SendersPage, RecipientsPage, UploadLogsPage
```
