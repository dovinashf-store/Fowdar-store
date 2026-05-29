---
name: update-supplier
description: Update the rules for a specific supplier in INVOICE_PROCESSING_PROMPT.md and regenerate the Word document. Use this when the user says something like "for [supplier], the column is...", "update [supplier] rules", "add a rule for [supplier]", or "the [supplier] invoice has...".
---

# Update Supplier Rules

The user wants to add or change rules for a specific supplier.

## What this skill does

1. Identifies which supplier needs updating from the user's message or by asking
2. Updates the correct supplier section in `INVOICE_PROCESSING_PROMPT.md`
3. Runs `python3 build_prompt_docx.py` to regenerate the Word document
4. Confirms exactly what changed

## Files involved

- **Source of truth:** `/Users/dovinashf/Desktop/fowdar store project/INVOICE_PROCESSING_PROMPT.md`
- **Word document:** `/Users/dovinashf/Desktop/fowdar store project/INVOICE_PROCESSING_PROMPT.docx` (auto-regenerated)
- **Build script:** `/Users/dovinashf/Desktop/fowdar store project/build_prompt_docx.py`

## Supplier sections in the .md file

Each supplier has a section starting with `### Supplier: [Name]`. Current suppliers:
- Quality Beverages Limited (QBL)
- VKS Company
- Edendale Distributors
- Innodis
- RR Rapid Service
- BrandActiv / IBL
- Lim How Brothers
- Cadi Fortune
- Panagora
- Kool Food
- Pillay R Frozen
- Li Wan Po
- International Distillers Ltd
- Tea Blenders
- Onsiong Brothers & Co. Ltd
- Grays
- Freelance Distributors

## Steps to follow

### Step 1 — Identify the supplier and what needs changing

If the user's message clearly states the supplier and the change, proceed directly.
If the supplier name is ambiguous, ask: *"Which supplier is this for?"*
If the change is unclear, ask: *"What exactly should I update — columns, VAT treatment, special rules, or gotchas?"*

### Step 2 — Read the current supplier section

Read `INVOICE_PROCESSING_PROMPT.md` and find the `### Supplier: [Name]` section.
Show the user the **current** version of the relevant part before changing it.

### Step 3 — Make the update

Apply the change to the correct sub-section:

| What the user describes | Sub-section to update |
|---|---|
| Column names, column order, field names | **Invoice columns table** and **colOrder** |
| VAT on specific products | **VAT treatment** bullets |
| How to calculate buyPlusVat | **Special rules** numbered list |
| Something to watch out for | **Gotchas** bullets |
| Supplier does not exist yet | Create a new `### Supplier:` section using the template below |

### Step 4 — Rebuild the Word document

After saving the .md file, run:
```
python3 build_prompt_docx.py
```
from the project directory. Confirm it prints `✓ Saved N supplier pages`.

### Step 5 — Confirm to the user

Tell the user:
- Which supplier was updated
- Which sub-section was changed
- What the new value is
- That the Word document has been regenerated

---

## Template for a brand new supplier

If the supplier doesn't exist yet, add this template at the end of the `## Supplier-Specific Rules` section:

```
---

### Supplier: [Supplier Name]

**Category:** [e.g. Snacks · Drinks / Butcher / Frozen / General Grocery]
**Supabase supplier_name:** `[exact name as stored in Supabase]`

**Invoice columns (left → right on paper):**

| Field | Invoice header | Notes |
|---|---|---|
| `description` | Description | Product name |
| *(add rows as confirmed)* | | |

**colOrder:** `[...]` *(complete when invoice is reviewed)*

**VAT treatment:**
- *(To be confirmed)*

**Special rules:**
1. *(To be confirmed)*

**Gotchas:**
- *(To be confirmed)*
```

---

## Important rules to never break

- Never change anything in the **general rules** section (above `## Supplier-Specific Rules`) unless the user explicitly asks
- Never remove an existing supplier section — only add to or modify it
- Always run the build script after every edit — the Word doc must stay in sync
- `buyPlusVat` and `recPrice` must never be listed as invoice columns in `colOrder`
- After editing, confirm the build script output shows the correct number of supplier pages
