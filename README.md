# Hudgi Dispatch Dashboard

A web-based order dispatch management system for The S.W.A.D.E.S Style.
Built with Next.js 14, Supabase, and Vercel.

---

## What this does

| Step | How |
|------|-----|
| Import Shopify orders | Upload CSV in the dashboard → parsed & saved to Supabase |
| Assign barcodes | Scan India Post sticker once → saved everywhere |
| View all orders | Filter by date, search by name/order/city |
| Export India Post XLSX | One click → downloads the official format, ready to email |
| Print shipping labels | One click → browser print dialog |

No Google Sheets needed for daily operations. Everything is in the database.

---

## One-time Setup (≈ 20 minutes)

### Step 1 — Create Supabase project

1. Go to https://supabase.com → New project
2. Name: `hudgi-dispatch` (or anything)
3. Set a strong database password (save it somewhere)
4. Region: **South Asia (Mumbai)** — closest to Bengaluru
5. Wait ~2 minutes for project to spin up

### Step 2 — Run the database schema

1. In Supabase → SQL editor → New query
2. Paste the entire contents of `supabase_schema.sql`
3. Click Run

### Step 3 — Get your Supabase keys

Go to Supabase → Settings → API:
- **Project URL** → copy (looks like `https://xxxx.supabase.co`)
- **anon / public key** → copy
- **service_role / secret key** → copy (keep this private)

### Step 4 — Fork/clone this repo to GitHub

```bash
# On your machine
git init
git add .
git commit -m "initial commit"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/hudgi-dispatch.git
git push -u origin main
```

### Step 5 — Deploy to Vercel

1. Go to https://vercel.com → Add New Project
2. Import from GitHub → select `hudgi-dispatch`
3. Framework: **Next.js** (auto-detected)
4. Click **Environment Variables** and add ALL of these:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `DASHBOARD_PASSWORD` | A strong shared password for your team |
| `SESSION_SECRET` | Any random 40+ character string (e.g. paste from https://randomkeygen.com) |

5. Click **Deploy**
6. Wait ~2 minutes → you'll get a URL like `hudgi-dispatch.vercel.app`

### Step 6 — Test it

1. Open the Vercel URL
2. Enter the `DASHBOARD_PASSWORD` you set
3. Go to **Import CSV** → upload a Shopify orders export
4. Go to **Scan** → scan or type a barcode
5. Go to **Export** → download the India Post XLSX

---

## Daily Workflow (for any team member)

```
1. Download orders CSV from Shopify admin
   (Orders → Export → Current page → Export orders)

2. Open the dashboard URL in any browser
   (bookmark it on every team computer)

3. Import tab → drop the CSV file → click Import

4. Scan tab → pick first order → scan the India Post
   barcode sticker that's on the packet → moves to next order

5. Export tab → click "Download XLSX" → opens India Post file
   → attach to email → send to post office

6. Export tab → click "Print labels" → print page opens
   → Ctrl+P → print
```

---

## Project structure

```
dispatch-app/
├── app/
│   ├── api/
│   │   ├── login/route.ts          ← password auth
│   │   ├── import-csv/route.ts     ← Shopify CSV parser
│   │   ├── orders/route.ts         ← fetch orders + dispatch status
│   │   ├── save-barcode/route.ts   ← scan once, save to DB
│   │   └── export-indiapost/route.ts ← data for XLSX download
│   ├── login/page.tsx              ← login screen
│   ├── dashboard/page.tsx          ← main dashboard (all tabs)
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   └── supabase.ts                 ← Supabase client
├── middleware.ts                   ← session auth on all routes
├── supabase_schema.sql             ← run once in Supabase SQL editor
├── .env.example                    ← copy to .env.local for local dev
└── README.md
```

---

## Local development

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env.local
# edit .env.local with your Supabase keys and passwords

# Run dev server
npm run dev
# Open http://localhost:3000
```

---

## Updating the password

Change `DASHBOARD_PASSWORD` in Vercel → Settings → Environment Variables → redeploy.
All existing sessions are invalidated automatically (they use `SESSION_SECRET` which you don't change).

## Adding a new team member

Just share the Vercel URL and the team password. No accounts to create.

## Changing sender address on labels

Update in Supabase → Table editor → settings table → edit the rows:
- `sender_name`
- `sender_address`
- `sender_phone`
- `sender_gstin`

---

## India Post XLSX format

The exported file follows the exact format India Post expects:

| Column | Description |
|--------|-------------|
| SERIAL NUMBER | Sequential 1, 2, 3… |
| BARCODE NO | India Post EK… barcode (scanned) |
| PHYSICAL WEIGHT GMS | Set during scan (default 250g) |
| RECEIVER CITY | From Shopify order |
| RECEIVER PINCODE | From Shopify order |
| RECEIVER NAME | From Shopify order |
| PHONE | From Shopify order |
| CODR/COD | Set during scan if applicable |
| VALUE FOR CoD Rs. | COD amount if applicable |
| LENGTH cm | Default 27 (editable in settings) |
| BREADTH cm | Default 18 (editable in settings) |
| HEIGHT cm | Default 2 (editable in settings) |

Each date gets its own sheet tab, named `dd-MMM` (e.g. `20-Apr`).

---

## Troubleshooting

**"No orders found" after import**
→ Make sure you're filtering by today's date in the Orders tab.

**Barcode scan doesn't save**
→ Check that an order is selected (highlighted in orange) in the Scan tab before scanning.

**India Post XLSX downloads but is empty**
→ Make sure at least one order has a barcode scanned for the selected date.

**"Could not connect to database" error**
→ Check your Supabase environment variables in Vercel. Make sure there are no trailing spaces.

**Vercel deployment fails**
→ Check build logs in Vercel dashboard. Most common cause: missing environment variables.
