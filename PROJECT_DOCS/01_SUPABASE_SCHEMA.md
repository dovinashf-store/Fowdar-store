# Supabase Schema

Project ID: `daijpydvfndihttpawum`  
Region: `ap-southeast-1`

---

## Table: `fowdar_invoices`

The main data table. One row per supplier.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Row identifier (auto-generated) |
| `supplier_name` | text | Canonical supplier name — must match exactly across queries |
| `meta` | jsonb | Supplier metadata: `{supplier, recPriceRule, dozSize, ...}` |
| `invoices` | jsonb array | Array of invoice objects — see `02_INVOICE_FORMATS.md` |

### `meta` object structure

```json
{
  "supplier": "VKS Company",
  "recPriceRule": "per_unit_dozen",   // only for RR Rapid Service
  "dozSize": 12                        // only for RR Rapid Service
}
```

### How to query

```javascript
// Load all suppliers
fetch(SUPABASE_URL + "/rest/v1/fowdar_invoices?select=*", {
  headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
})

// Update invoices array for a supplier (append new invoice)
fetch(SUPABASE_URL + "/rest/v1/fowdar_invoices?supplier_name=eq.VKS+Company", {
  method: "PATCH",
  headers: {
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ invoices: [...existingInvoices, newInvoice] })
})
```

---

## Table: `price_amendments`

Stores which price-change cards the user has marked as "amended" (dealt with). Persists across page reloads.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Auto-generated primary key |
| `supplier_name` | text | NOT NULL — matches `fowdar_invoices.supplier_name` |
| `product_name` | text | NOT NULL — product description string |
| `invoice_id` | text | NOT NULL — invoice `id` field |
| `amended` | boolean | NOT NULL DEFAULT false |
| `amended_at` | timestamptz | Timestamp when user clicked "✓ Done" |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |

**Unique constraint**: `(supplier_name, product_name, invoice_id)` — ensures one row per price event.

### RLS Policy

```sql
ALTER TABLE price_amendments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON price_amendments FOR ALL TO anon USING (true) WITH CHECK (true);
```

Anon key has full read/write access. No authentication required.

### How to upsert (merge-duplicates)

```javascript
fetch(SUPABASE_URL + "/rest/v1/price_amendments", {
  method: "POST",
  headers: {
    "apikey": SUPABASE_KEY,
    "Authorization": "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"   // <-- critical header for upsert
  },
  body: JSON.stringify({
    supplier_name: sn,
    product_name: pn,
    invoice_id: invoiceId,
    amended: true,
    amended_at: "2026-05-28T10:00:00Z"
  })
})
```

---

## Creating new Supabase tables via Claude Code MCP

Claude Code has the `mcp__claude_ai_Supabase__apply_migration` tool available. Use it to run DDL SQL directly on the project. Always wrap in `IF NOT EXISTS` for safety.

Example:
```sql
CREATE TABLE IF NOT EXISTS my_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON my_table FOR ALL TO anon USING (true) WITH CHECK (true);
```

---

## Known suppliers in `fowdar_invoices`

| Supplier name | Special rules |
|---|---|
| VKS Company | Butcher — two formats (old cols/rows and new items) |
| Quality Beverages Limited (QBL) | Snacks/drinks — items format, pack sizes in descriptions |
| Edendale Distributors | Frozen chicken — zero-rated products |
| Innodis | Carton quantities (CT suffix), units-per-carton in product name |
| RR Rapid Service | Sold by dozen, `recPriceRule: "per_unit_dozen"` |
| BrandActiv / IBL | "Unit prc excl Vat" column, per-row VAT% |
| Lim How Brothers | "Price (Ex)" column |
| Cadi Fortune | Amounts already incl-VAT |
| Panagora | Some invoices vatRate=1.0 (amounts incl-VAT) |
| Kool Food | Mixed: some frozen/dairy only, some both |
| Pillay R Frozen | Frozen products — zero-rated |
| Li Wan Po | Grocery |
| Intl Distillers | Beverages |
| Tea Blenders | SHEET_REC (handwritten prices keyed by product name) |
