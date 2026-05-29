---
name: new-supplier
description: Add a brand new supplier to the system. Use when the user says "add a new supplier", "we have a new supplier called...", or "create a supplier for...".
---

# Add a New Supplier

Adds a new supplier to all parts of the system: Supabase, the invoice prompt, and the Word document.

## What this skill does

1. Gathers supplier details from the user
2. Creates the Supabase row in `fowdar_invoices`
3. Adds a supplier section to `INVOICE_PROCESSING_PROMPT.md`
4. Regenerates the Word document

## Step 1 — Gather information

Ask the user for the following (ask only for what they haven't already provided):

- **Supplier name** — exact name as it will appear in Supabase
- **Category** — what they sell (e.g. Frozen, Snacks, Butcher, General Grocery)
- **Invoice columns** — what columns appear on the paper invoice, left to right
- **VAT treatment** — are products standard-rated (15%), zero-rated, or mixed?
- **Any special rules** — e.g. sold by dozen, carton quantities, amounts already incl-VAT
- **Supabase meta** — does this supplier need `recPriceRule` or `dozSize`? (usually no)

It is fine to proceed with partial information and mark unknown sections as "To be confirmed".

## Step 2 — Create Supabase row

Use the `mcp__claude_ai_Supabase__execute_sql` tool to insert a row:

```sql
INSERT INTO fowdar_invoices (supplier_name, meta, invoices)
VALUES (
  '[supplier_name]',
  '{"supplier": "[supplier_name]"}'::jsonb,
  '[]'::jsonb
)
ON CONFLICT DO NOTHING;
```

Confirm the row was created.

## Step 3 — Add supplier section to INVOICE_PROCESSING_PROMPT.md

Append a new `### Supplier: [Name]` section at the end of the `## Supplier-Specific Rules` block using all information gathered. Use the standard template with all known fields filled in and unknown fields marked as "*(To be confirmed)*".

## Step 4 — Rebuild Word document

Run:
```
python3 build_prompt_docx.py
```

Confirm the supplier count increased by one.

## Step 5 — Confirm to user

Tell the user:
- Supplier was added to Supabase ✓
- Supplier page added to the Word document ✓
- What still needs to be confirmed (columns, VAT, etc.)
- Reminder: to add actual invoices, use the Claude chat + `INVOICE_PROCESSING_PROMPT.md` workflow

## Key rules

- The `supplier_name` in Supabase must match **exactly** what will be used in invoice JSON
- Never guess VAT treatment — if unsure, default to standard 15% and note it as unconfirmed
- `buyPlusVat` and `recPrice` must never appear in `colOrder`
