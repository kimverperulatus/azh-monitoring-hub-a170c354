# AZH Monitoring

A Next.js dashboard for monitoring Carebox operations, including EKV records, letter processing, and activity logs. Built with Supabase for authentication and data storage.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Auth & Database:** Supabase
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI, Lucide React
- **Charts:** Recharts
- **CSV/Excel parsing:** PapaParse, xlsx
- **Date formatting:** date-fns

## Project Structure

```
azh-monitoring/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Root redirect
│   ├── login/
│   │   └── page.tsx            # Login page (Supabase auth)
│   └── dashboard/
│       ├── layout.tsx          # Dashboard layout with Sidebar
│       ├── page.tsx            # Overview — stats + activity feed
│       ├── ekv/
│       │   └── page.tsx        # EKV records page
│       ├── letter/
│       │   └── page.tsx        # Letter records page
│       └── logs/
│           └── page.tsx        # Activity logs page
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx         # Navigation sidebar with sign-out
│   ├── dashboard/
│   │   ├── StatsCard.tsx       # Stat summary card
│   │   └── ActivityFeed.tsx    # Recent activity list
│   ├── ekv/
│   │   ├── EkvTable.tsx        # EKV records table with search/filter/pagination
│   │   └── ImportModal.tsx     # CSV/Excel import modal
│   └── records/
│       ├── RecordsTable.tsx    # Generic records table
│       └── RecordActions.tsx   # Per-row action buttons (approve, reject, etc.)
├── lib/
│   └── supabase/
│       ├── client.ts           # Supabase browser client
│       ├── server.ts           # Supabase server client (RSC)
│       └── middleware.ts       # Supabase session refresh middleware
├── supabase/
│   ├── schema.sql              # Database schema
│   ├── migrate-ekv-columns.sql # EKV column migration
│   └── migrate-status.sql      # Status field migration
└── middleware.ts               # Next.js middleware (auth guard)
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kimverperulatus/azh-monitoring.git
   cd azh-monitoring
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Apply the database schema in your Supabase project:
   - Run `supabase/schema.sql` first
   - Then run migration files as needed

5. Start the development server:
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Tables

| Table | Description |
|-------|-------------|
| `ekv_records` | EKV (Elektronische Krankenversicherung) records |
| `letter_records` | Letter processing records |
| `activity_logs` | Audit log of all actions taken in the system |

### EKV Record Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `kv_angelegt` | timestamp | Date KV was created |
| `kv_entschieden` | timestamp | Date KV was decided |
| `kvnr_noventi` | text | KVNR from NOVENTI system |
| `kvnr_le` | text | KVNR from LE system |
| `le_ik` | text | LE institution key |
| `le_kdnr` | text | LE customer number |
| `versichertenvorname` | text | Insured person first name |
| `versichertennachname` | text | Insured person last name |
| `versicherten_nr` | text | Insured person number |
| `kassen_ik` | text | Health insurance institution key |
| `kassenname` | text | Health insurance name |
| `status` | text | Record status (see below) |
| `reasons` | text | Reason for decision |

### Status Values

| Status | Meaning |
|--------|---------|
| `Pending` | Awaiting decision |
| `Approved` | Record approved |
| `Rejected` | Record rejected |
| `Error` | Processing error |
| `Closed Lost` | Closed without resolution |

## Features

### Dashboard Overview
- Status breakdown cards for EKV and Letter modules
- Recent activity feed showing the last 10 actions

### EKV Module
- Paginated table of EKV records (20 per page)
- Search by name, Versicherten-Nr, KVNr, or Kasse
- Filter by status
- Per-row actions (approve, reject, etc.)
- CSV/Excel import via modal

### Letter Module
- Records table for letter processing workflows

### Logs
- Full activity log with timestamps

### Authentication
- Supabase email/password authentication
- Protected routes via Next.js middleware
- Session managed server-side with `@supabase/ssr`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Deployment

This app can be deployed to [Vercel](https://vercel.com) with zero configuration:

1. Push to GitHub (already done)
2. Import the repo in Vercel
3. Add the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Deploy

## Known Issues

- Password manager browser extensions (1Password, LastPass, Bitwarden, etc.) inject `fdprocessedid` attributes into form inputs and buttons, causing React hydration warnings. This is suppressed with `suppressHydrationWarning` on affected elements and is not a functional bug.
