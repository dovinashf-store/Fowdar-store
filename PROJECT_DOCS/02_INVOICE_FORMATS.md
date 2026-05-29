# Invoice Formats

Two formats coexist in `fowdar_invoices.invoices`. Both are handled by `normalizeInv()`.

---

## Format 1 — Old / cols-rows format

Used for: manually keyed invoices, older Claude-processed invoices, VKS Company old invoices.

```json
{
  "id": "59757",
  "date": "22/05/2026",
  "receivedAt": "2026-05-22T10:00:00Z",
  "cols": ["Description", "Qty/kg", "Unit Price", "Exempted", "Taxable"],
  "rows": [
    ["Boneless Mutton", 10, 285, 0, 2850],
    ["Sadia Chicken Wings 1KGX10", 10, 130, 1300, 0]
  ],
  "qtyCol": 1,
  "amountCol": 4,
  "packCol": null,
  "vatRate": 1.15,
  "totals": [
    ["Total Exempted", 1300],
    ["Total Taxable", 2850],
    ["VAT 15%", 427.5],
    ["Gross Total", 4577.5]
  ]
}
```

### Key fields

| Field | Meaning |
|---|---|
| `cols` | Array of column header strings |
| `rows` | 2D array — each row is an array of values in col order |
| `qtyCol` | Index into `cols`/row for the quantity column |
| `amountCol` | Index into `cols`/row for the line-total/amount column |
| `packCol` | Index into `cols`/row for pack size (null if not present) |
| `vatRate` | `1.0` = amount already incl-VAT; `1.15` = excl-VAT, multiply to get incl |
| `totals` | Either `[[label, value], ...]` OR object `{key: value}` — both handled |

### `SHEET_REC` field (Tea Blenders and similar)

When prices are handwritten and can't be computed from columns:

```json
{
  "SHEET_REC": {
    "Lipton Yellow Label 100s": 285.50,
    "Brooke Bond 250g": 142.00
  }
}
```

`calcRec()` rule 1 checks `SHEET_REC` first, keyed by product code (col 0), row index, or product name (col 1).

---

## Format 2 — New / items format

Used for: all AI-processed invoices going forward. Claude AI generates this format using `INVOICE_PROCESSING_PROMPT.md`.

```json
{
  "id": "PSI26/00128452",
  "date": "2026-05-25",
  "receivedAt": "2026-05-25T09:00:00Z",
  "items": [
    {
      "description": "Doritos BBQ 70GX24",
      "code": "D-BBQ-70",
      "qty": 1,
      "disc": 0,
      "price": 1273,
      "vat": 190.95,
      "petTax": 0,
      "total": 1463.95,
      "buyPlusVat": 1463.95,
      "recPrice": 1756.74
    },
    {
      "description": "Sadia Frozen Chicken Wings 1KGX10",
      "qtyKg": 10,
      "unitPrice": 130,
      "exempted": 1300,
      "taxable": 0,
      "vatType": "Exempt",
      "buyPlusVat": 130,
      "recPrice": 156
    }
  ],
  "colOrder": ["description", "code", "qty", "disc", "price", "vat", "petTax", "total"],
  "totals": {
    "exclVat": 1273,
    "vat": 190.95,
    "inclVat": 1463.95
  }
}
```

### Key fields

| Field | Meaning |
|---|---|
| `items` | Array of item objects — each item has all invoice columns as fields |
| `buyPlusVat` | **Pre-computed incl-VAT cost at full-pack level** — excluded from column display |
| `recPrice` | `buyPlusVat × 1.2` at pack level — excluded from column display |
| `colOrder` | Optional (but recommended) array of field names in paper-invoice left-to-right order |
| `vatType` | `"Taxable"`, `"Exempt"`, or `"Zero Rated"` |
| `totals` | Object with descriptive keys — handled by `normalizeTotals()` |

### `buyPlusVat` is ALWAYS at pack level

If the product is `"Doritos BBQ 70GX24"` (24 units per pack) and the line total is MUR 1463.95:
- `buyPlusVat = 1463.95` ← the full pack cost
- The app calls `detectPackSize("Doritos BBQ 70GX24")` → 24
- Displays: `1463.95 / 24 = MUR 60.99` per unit

**Do NOT pre-divide by pack count when generating JSON.** The app does it.

---

## `normalizeInv(inv)` — converts both formats to unified structure

After `normalizeInv()`, every invoice has:
- `cols` — array of column headers
- `rows` — 2D value array
- `qtyCol`, `amountCol`, `packCol` — column indices
- `vatRate` — 1.0 or 1.15
- `totals` — `[[label, value], ...]` pairs
- `_precomputed` — `{[rowIndex]: {buyPlusVat, recPrice}}` (only for items format)

### Column ordering in items format

1. If `inv.colOrder` is present → sort `displayFields` to match that exact order
2. Fallback → sort by `ITEM_FIELD_ORDER` heuristic (canonical left-to-right)
3. Unknown fields (not in `ITEM_FIELD_ORDER`) → sort to end, still displayed

---

## Date formats

| Format | Example | Where found |
|---|---|---|
| ISO `YYYY-MM-DD` | `"2026-05-25"` | New items-format invoices |
| DD/MM/YYYY | `"22/05/2026"` | Old cols/rows invoices |
| ISO datetime | `"2026-05-25T09:00:00Z"` | `receivedAt` field |

**Always use `toISODate(str)` before sorting or comparing dates.**  
**Always use `fmtDD(str)` to display dates to the user.**  
Never compare raw date strings — `"22/05/2026" > "2026-05-18"` is wrong.

---

## Invoice processing workflow

1. User takes photo of paper invoice
2. Opens a **separate Claude chat** (not Claude Code)
3. Pastes `INVOICE_PROCESSING_PROMPT.md` contents + attaches invoice photo
4. Claude AI generates JSON invoice object
5. JSON is pasted into Supabase `fowdar_invoices.invoices` array for that supplier
6. App reads from Supabase and displays it

The `INVOICE_PROCESSING_PROMPT.md` file in the project root contains all instructions for the AI including `buyPlusVat` rules, zero-rated products, pack size rules, `colOrder` instructions, and a comprehensive checklist.
