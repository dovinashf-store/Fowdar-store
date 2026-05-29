# Fowdar Store — Master Project Reference

> **Read this file first in every new session.**
> It links to all detailed docs in this folder and summarises the critical decisions.

---

## What this app is

**Veer Bisham Fowdar Trading Co. Ltd.** — a small grocery/trading store in Mauritius.

A single-file React 18 SPA (`index_1.html`) that lets the owner:
- View supplier invoices with automatic Buy+VAT and Rec Price columns
- Track price changes across invoices from each supplier
- Manage orders and payments

**Currency**: MUR (Mauritian Rupee). **VAT**: 15% standard rate (some products zero-rated).

---

## File locations

| File | Purpose |
|---|---|
| `index_1.html` | **The entire app** — 4113 lines, React 18 + Babel CDN, no build step |
| `CLAUDE.md` | Project rules loaded automatically by Claude Code |
| `INVOICE_PROCESSING_PROMPT.md` | Prompt to paste into Claude chat when processing a paper invoice photo |
| `PROJECT_DOCS/` | This folder — detailed reference docs for new Claude Code sessions |

---

## Tech stack (no build step)

- React 18 via CDN (`unpkg.com`)
- Babel standalone — JSX lives in `<script type="text/babel">` inside `index_1.html`
- **Edit `index_1.html` directly; reload browser to see changes**
- Supabase REST API (plain `fetch`) — no Supabase JS client library
- Deployed on Netlify (drag-and-drop or git push)

---

## Supabase credentials

| Field | Value |
|---|---|
| Project ID | `daijpydvfndihttpawum` |
| Region | `ap-southeast-1` |
| URL | `https://daijpydvfndihttpawum.supabase.co` |
| Anon key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhaWpweWR2Zm5kaWh0dHBhd3VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NTgzMzcsImV4cCI6MjA5NDQzNDMzN30.nyaybR2b3CoXvWBMSB-CKq8GAVmy08SQ-qoO6XKmE0U` |

---

## Detailed docs in this folder

| Doc | What it covers |
|---|---|
| `01_SUPABASE_SCHEMA.md` | All tables, columns, RLS, sample rows |
| `02_INVOICE_FORMATS.md` | Old cols/rows format vs new items format, with examples |
| `03_KEY_FUNCTIONS.md` | Every major function — signature, inputs, what it returns |
| `04_FEATURES_BUILT.md` | Everything built in Claude Code sessions (with line refs) |
| `05_RULES_AND_GOTCHAS.md` | Critical rules, common mistakes, gotchas to avoid |
| `06_DEPLOYMENT.md` | How to deploy to Netlify |
| `07_SUPPLIER_SPECIFICS.md` | Per-supplier invoice quirks and calculation rules |

---

## The golden rules (memorise these)

1. **Never double-VAT**: `vatRate=1.0` means amount already includes VAT. `vatRate=1.15` means add 15%. The most common catastrophic mistake is setting 1.15 when the column is already incl-VAT — prices inflate by ~32%.

2. **Zero-rated products**: frozen chicken, dairy, basic food staples — NEVER apply 15% VAT.

3. **Pack size always divides**: `"70GX24"` means 24 units per pack. `buyPlusVat` is always stored at full-pack level; `detectPackSize()` divides to per-unit.

4. **`buyPlusVat` is pack-level**: when AI generates invoice JSON, `buyPlusVat = line_total_incl_vat / qty`. The app divides by pack count automatically.

5. **Date handling**: always `toISODate()` before sorting/comparing. Always `fmtDD()` for display. Never use raw date strings.

6. **`normalizeTotals()`**: always call on totals before display. Handles both array `[[label,val]]` and object `{key:val}` formats.
