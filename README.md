# AZH Monitoring

Internal dashboard for monitoring Carebox operations — EKV records, AI-powered scan letter processing, role-based access control, and activity logs.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Server Components) |
| Language | TypeScript |
| Auth & Database | Supabase (PostgreSQL + Storage) |
| AI / PDF Extraction | Anthropic Claude API (`pdf-parse`) |
| Styling | Tailwind CSS |
| UI Components | Radix UI, Lucide React |
| Charts | Recharts |
| Data Import | PapaParse, xlsx |
| Date Formatting | date-fns |
| Deployment | Docker + Traefik (Azure VM) |

---

## Features

### Dashboard Overview
- Monthly chart (EKV + Letters) with year selector
- Role-based quick navigation buttons
- Recent activity feed (last 10 actions)

### EKV Module (`/dashboard/ekv`)
- Paginated table with search, status filter, and date filter
- Single record view with field editor
- Prev/Next navigation between records
- CSV/Excel import
- Carebox status sync audit page
- Activity logging on every save

### Scan Letters Module (`/dashboard/letter`)
- **All Scan Letters** — full table with filters (date, status, category, type, provider, search)
- **Upload Scan Letters** — drag-and-drop multi-PDF upload with AI extraction
- AI auto-extracts: patient name, insurance number, category, type, approval ID, address, dates, and more
- PDF preview in record detail view
- "Process to CRM" — downloads the renamed PDF and clears it from storage
- Renamed file name auto-generated from record fields (copy to clipboard)
- Uploader name and upload date tracked per record
- Admin-only delete (also removes PDF from storage)
- Activity logging on every AI scan

### Role-Based Access Control
| Role | Access |
|------|--------|
| `admin` | Full access — all pages, delete, user management, permissions |
| `support` | EKV, All Letters, Logs |
| `scanner` | Upload Letters only — own records, no Process to CRM |
| `custom` | Admin configures per-page access individually |

### Admin Tools
- **Users** (`/dashboard/admin/users`) — create, edit role, delete users
- **Permissions** (`/dashboard/admin/permissions`) — toggle page access per role (toggle matrix)

### Logs (`/dashboard/logs`)
- Full activity log with module, action, record ID, and timestamp
- Total AI Scan count stat card

---

## Project Structure

```
azh-monitoring/
├── app/
│   ├── login/page.tsx                  # Split-panel login page
│   └── dashboard/
│       ├── layout.tsx                  # Auth guard + Navbar
│       ├── page.tsx                    # Overview
│       ├── ekv/
│       │   ├── page.tsx                # EKV records table
│       │   ├── [id]/page.tsx           # EKV single record view
│       │   └── audit/page.tsx          # Carebox status audit
│       ├── letter/
│       │   ├── page.tsx                # Redirects → /letter/all
│       │   ├── all/page.tsx            # All Scan Letters table
│       │   ├── upload/page.tsx         # Upload + My Uploads
│       │   └── [id]/page.tsx           # Letter single record view
│       ├── logs/page.tsx               # Activity logs
│       └── admin/
│           ├── users/page.tsx          # User management
│           └── permissions/page.tsx    # Role permissions matrix
├── components/
│   ├── layout/
│   │   └── Navbar.tsx                  # Top nav with role-filtered links
│   ├── ui/
│   │   └── BackButton.tsx              # router.back() or fixed href
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   ├── ActivityFeed.tsx
│   │   └── MonthlyChart.tsx
│   ├── ekv/
│   │   ├── EkvTable.tsx                # EKV records table
│   │   ├── EkvRecordEditor.tsx         # Inline field editor
│   │   ├── NoteEditor.tsx
│   │   └── ImportModal.tsx
│   ├── letter/
│   │   ├── LetterTable.tsx             # All Letters table
│   │   ├── LetterRecordEditor.tsx      # Letter field editor + PDF preview
│   │   ├── PdfUploadInline.tsx         # Multi-PDF upload with AI scan
│   │   └── UploadDateFilter.tsx
│   └── admin/
│       ├── UserManager.tsx             # User CRUD client component
│       └── PermissionMatrix.tsx        # Role × page toggle matrix
├── app/api/
│   ├── letter/
│   │   ├── analyze-pdf/route.ts        # Claude AI PDF extraction
│   │   ├── upload-storage/route.ts     # Supabase storage upload
│   │   ├── delete-storage/route.ts     # Storage cleanup on process
│   │   ├── rename-storage/route.ts     # Rename PDF on record edit
│   │   └── delete/route.ts             # Delete records + storage (admin)
│   ├── ekv/
│   │   └── export/route.ts             # CSV export
│   └── admin/
│       ├── users/route.ts
│       ├── users/[id]/route.ts
│       └── permissions/route.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # Browser Supabase client
│   │   ├── server.ts                   # Server Supabase client + admin client
│   │   └── middleware.ts
│   └── auth/
│       └── role.ts                     # getUserRole, getUserPageAccess, requireAdmin
├── supabase/
│   ├── schema.sql
│   ├── migrate-v2.sql                  # scanner/custom roles + role_permissions + uploaded_by
│   └── migrate-letter-uploader.sql     # uploader_name + uploaded_at columns
├── Dockerfile                          # Multi-stage Docker build
├── docker-compose.yml                  # Traefik + App
├── .dockerignore
└── DEPLOYMENT.md                       # Full deployment guide
```

---

## Database Tables

| Table | Description |
|-------|-------------|
| `ekv_records` | EKV (Elektronische Krankenversicherung) application records |
| `letter_records` | AI-scanned letter records with all extracted fields |
| `activity_logs` | Audit log of all user actions |
| `profiles` | User profiles with role assignment |
| `role_permissions` | Per-role page access configuration |
| `app_settings` | Key-value settings (Zoho status map, API config) |

### Letter Record Fields (key)

| Field | Description |
|-------|-------------|
| `category` | Carebox / Reusable Pads / Invoice / Other |
| `type` | Approved / Reject / Terminations |
| `scan_status` | `success` or `error` |
| `pdf_url` | Supabase storage URL (cleared after Process to CRM) |
| `process_status` | `Process Completed` or null |
| `uploaded_by` | UUID of uploader |
| `uploader_name` | Email of uploader (stored at upload time) |
| `uploaded_at` | Timestamp of upload |

---

## Local Development

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key

### Setup

```bash
git clone https://github.com/kimverperulatus/azh-monitoring.git
cd azh-monitoring
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-...
```

Run database migrations in Supabase SQL Editor (in order):
1. `supabase/schema.sql`
2. `supabase/migrate-v2.sql`
3. `supabase/migrate-letter-uploader.sql`

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Production Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the full step-by-step guide.

**Quick summary:**
1. Azure Ubuntu VM with ports 80, 443, 22 open
2. Install Docker on the VM
3. Clone the repo and create `.env`
4. `docker compose up -d --build`
5. Traefik handles SSL automatically via Let's Encrypt

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Known Issues

- Browser password manager extensions (1Password, Bitwarden, etc.) inject `fdprocessedid` attributes on inputs/buttons causing React hydration warnings. Suppressed with `suppressHydrationWarning` — not a functional bug.
