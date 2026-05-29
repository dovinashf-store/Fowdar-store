# Fowdar Store — Master Rules for Codex

## Project Overview
Single-file React 18 SPA (`index_1.html`) for Veer Bisham Fowdar Trading Co. Ltd., Mauritius.
Modules: **Invoices** (supplier invoice viewer + Buy+VAT / Rec Price columns), **Payments**, **Orders** (catalogue, history, suppliers).
All invoice data lives in **Supabase** — the HTML file contains only front-end logic.

---

## Tech Stack
- React 18 via CDN + Babel standalone — JSX in `<script type="text/babel">` inside `index_1.html`
- **No build step** — edit `index_1.html` directly; reload browser to see changes
- Supabase project ID: `daijpydvfndihttpawum`, region: `ap-southeast-1`
- Table: `fowdar_invoices` — columns: `id`, `supplier_name`, `meta` (JSONB), `invoices` (JSONB array)
- Currency: MUR (Mauritian Rupee). VAT: 15% standard rate. Some products are zero-rated (frozen chicken, dairy — never apply 15% to these).

---

## Supabase Schema

### `fowdar_invoices`
| column | type | notes |
|---|---|---|
| `id` | uuid | row id |
| `supplier_name` | text | canonical supplier name |
| `meta` | jsonb | `{supplier, recPriceRule, dozSize, ...}` |
| `invoices` | jsonb array | array of invoice objects (see formats below) |

### Invoice object — two formats exist

**Old / cols-rows format** (manually keyed or Codex-processed older invoices):
```json
{
  "id": "INV-123",
  "date": "22/05/2026",
  "receivedAt": "2026-05-22T10:00:00Z",
  "cols": ["Product", "Qty/kg", "Unit Price", "Exempted", "Taxable"],
  "rows": [["Boneless Mutton", 10, 285, 2850, 0]],
  "qtyCol": 1,
  "amountCol": 4,
  "packCol": null,
  "vatRate": 1.15,
  "totals": [["Total Exempted", 5550], ["Total Taxable", 15662.5], ["Gross Total", 21212.6]]
}
```

**New / items format** (Codex AI processes PDFs and outputs this):
```json
{
  "id": "59757",
  "date": "2026-05-26",
  "receivedAt": "2026-05-26T00:00:00Z",
  "items": [
    {
      "description": "Boneless Mutton",
      "qtyKg": 27.2,
      "unitPrice": 525,
      "exempted": 0,
      "taxable": 14280,
      "vatType": "Taxable",
      "buyPlusVat": 603.75,
      "recPrice": 724.50
    }
  ],
  "totals": {"totalExempted": 0, "totalTaxable": 25416, "vat15": 0, "grossTotal": 25416}
}
```
`buyPlusVat` and `recPrice` are **meta fields** — excluded from column display, used for Buy+VAT and Rec Price columns.

---

## Invoice Display Pipeline

### `normalizeInv(inv)` — converts both formats to a unified cols/rows structure
- **Old format**: passes through, calls `normalizeTotals` on totals
- **New items format**: reads ALL keys from `items[0]`, excludes `ITEM_META_FIELDS` (`buyPlusVat`, `recPrice`), sorts by `ITEM_FIELD_ORDER`, maps to human labels via `ITEM_FIELD_LABELS`, auto-formats unknown keys as-is
- Sets `_precomputed[ri] = {buyPlusVat, recPrice}` for each row
- `vatRate` defaults to `1.0` for items-format (pre-computed values already include VAT)

### `amountCol` detection in `normalizeInv` (items format only)
Order of precedence:
1. First match in `AMT_KEYS`: `["total","amountExcl","itemAmt","totalPayable","totalRs","totalExcl","totalExclVat","totalInclVat","taxable","itemTotal","lineTotal","netTotal","amount","totalInclDisc"]`
2. Regex fallback — scan column names for `/total$|amount$|amt$|rs$/`
3. Default: last column

### `qtyCol` detection in `normalizeInv` (items format only)
`QTY_KEYS = ["qty","quantity","totalUnits","noOfCtns","qtyKg","qtykg","units","pieces","pcs"]` — first match wins.

---

## vatRate Rules — CRITICAL

`vatRate` stored on each invoice object tells the Buy+VAT calculator how to treat the `amountCol` value:

| vatRate | meaning |
|---|---|
| `1.0` | Amount column values already **include** VAT — do NOT multiply again |
| `1.15` | Amount column values are **excl. VAT** — multiply by 1.15 to get incl-VAT price |
| `null` | Items format — `buyPlusVat` pre-computed; vatRate defaults to 1.0 |

**Rule: NEVER assume vatRate=1.15. Always verify by checking if `amountCol_total ≈ qty × unit_price × 1.15` (excl) or `≈ qty × unit_price` (incl).** The most common error is setting vatRate=1.15 when the amount column already includes VAT — this causes double-VAT and inflates prices by ~32%.

**Safety net in `calcRec` rule 8**: if `amountCol` column name contains `incl.vat / total incl / inc vat / amount incl`, override vatRate → 1.0 regardless of stored value.

### Known zero-rated products (VAT = 0%, vatRate must be 1.0 or the amount col already has no VAT)
- Frozen chicken (Sadia, Edendale, all frozen poultry)
- Dairy products
- Basic food staples as defined by Mauritius Revenue Authority

---

## Buy+VAT Calculation — `calcRec(inv, ri, row, supMeta)`

Returns **incl-VAT cost per unit** (no margin). Rules applied in this exact order:

1. **Pre-computed** — if `inv._precomputed[ri].buyPlusVat != null`, use it (÷ pack size from description). This is the gold standard for AI-processed invoices.
2. **SHEET_REC** — handwritten price override keyed by product code/index/name
3. **RR Rapid Service** (`recPriceRule = "per_unit_dozen"`) — `(amt / qty / dozSize) × vatRate`
4. **BrandActiv / IBL** — use "Unit prc excl Vat" column (prefer "Unit disc prc excl Vat" if discounted) × per-row VAT%
5. **Lim How Brothers** — use "Price (Ex)" column × vatRate
6. **Cadi Fortune** — `amt / qty` (amounts already incl-VAT, vatRate=1.0)
7. **Innodis CT quantities** — extract `xN` units-per-carton from product name, `(amt / (ctQty × N)) × vatRate`
8. **Standard column detection** — try "Unit Price", "UCP", "Price/Unit", "Price (Ex)", "Unit prc excl vat" × vatRate
9. **Fallback** — `(amt / qty / pack) × effectiveVat`, then ÷ pack size from description

**Rec Price** = `buyPlusVat × 1.2` (20% margin). For items-format: use `_precomputed[ri].recPrice` directly (÷ pack size from description).

---

## Price Tracker — `extractPriceTrackerValue(inv, ri, row, supMeta)`

Used **only** in `buildPriceHistory`. Returns the canonical incl-VAT unit price for price-change comparison. Same logic as `calcRec` but without the rec-price-only overrides (SHEET_REC excluded). Priority:

1. Pre-computed `buyPlusVat` ÷ pack size
2. Explicit excl-VAT unit price column × vatRate (BrandActiv, Lim How style)
3. Supplier-specific qty adjustments (RR Rapid per-dozen, Innodis CT)
4. Fallback: `(amt / qty / pack) × effectiveVat`

Pack size from description is applied at every level via `detectPackSize()`.

**Consistency rule**: always compare the SAME metric for the same supplier across invoices. Use incl-VAT prices. When a new invoice arrives, the price tracker detects changes by comparing the stored incl-VAT unit price against the new one.

---

## Pack Size Detection — `detectPackSize(desc)`

Extracts units-per-pack from product description. Applied in `calcRec`, `extractPriceTrackerValue`, and the invoice display rec-price column. Three patterns in precedence order:

| Pattern | Example | Result |
|---|---|---|
| A — `WEIGHTxN` (unit letter before X) | `"70GX24"`, `"3LTX6"`, `"150GX72"` | N after X = **24, 6, 72** |
| B — `NxWEIGHT` (unit letter after X) | `"20 X 45g"`, `"12X330ml"` | N before X = **20, 12** |
| C — pure numeric `LARGExSMALL` | `"300X30"`, `"2500X12"` | smaller number = **30, 12** |

**Rule from user**: "Always use this logic" — when a description has a pack pattern, divide the line total by the pack count to get the per-unit price. Product weight (grams/ml/kg) is always larger than pack count in practice, which is why Pattern C works.

---

## Totals Normalization — `normalizeTotals(t)`

**Rule: always call `normalizeTotals` on every invoice's totals before display.** Never read totals keys directly.

- **Array input** `[[label, value], ...]` — returned as-is (already labelled)
- **Object input** — emitted in KEY_ORDER, duplicate labels suppressed, zeros skipped (except `taxable/exempted/zeroRated` which are meaningful zeros)
- **Unknown keys** (future invoices) — auto-formatted from camelCase → "Title Words" and displayed

### Key → label mapping (comprehensive, covers all suppliers seen):
```
totalExempted → Total Exempted    totalTaxable → Total Taxable
exempted → Exempted               taxable → Taxable
exclVat/exclAmt/totalExcl/totalBeforeVat/totalExclVat → Excl. VAT
subtotalExVat → Subtotal Excl. VAT    subTotal → Sub Total
discount/discountTotal → Discount
vat/vatTotal/vatAmt/vatAmount → VAT   vat15/totalVatAmt → VAT 15%
petTax → PET Tax
net/netTotal/totalNet → Net Total
inclVat/totalIncl/totalInclVat → Total Incl. VAT
totalPayable/invoiceTotal → Total Payable
gross/grossTotal → Gross Total    grandTotal → Grand Total    total → Total
```

**Adding a new key**: add one line to `TOTAL_LABELS` and one entry in `KEY_ORDER` at the correct position — no other changes needed.

---

## Date Rules

- **Storage**: always ISO `YYYY-MM-DD` in Supabase — never change stored dates
- **Sorting**: always use `toISODate(str)` before comparing or sorting — handles both `"22/05/2026"` (DD/MM/YYYY) and `"2026-05-22"` formats
- **Display**: always use `fmtDD(str)` → produces `DD/MM/YYYY` — never display raw ISO to user
- **Group key** for invoice date grouping: use `toISODate(inv.date)` not `inv.date.split(" ")[0]` — prevents same-day invoices appearing in two groups when format is mixed
- **Invoice array sort** (in `loadSuppliers`): always sort with `toISODate(b.receivedAt||b.date)` vs `toISODate(a.receivedAt||a.date)` — raw string compare breaks when old invoices use DD/MM/YYYY and new ones use YYYY-MM-DD (e.g. `"22/..."` > `"2026-..."` as strings, making May 22 sort before May 27)

---

## Column Display Rules

### `ITEM_FIELD_LABELS` — key → header mapping
Add new field labels here when a new invoice format introduces unknown column keys. Fallback is the raw key name so display never breaks.

### `ITEM_FIELD_ORDER` — canonical left-to-right column order
```
Identification → Qty → Pack info → Prices → Exempt/Taxable/VAT Type →
Discounts/Taxes per line → Line totals
```
Unknown fields (not in this list) sort to the end — they still display, just after known fields.

### `ITEM_META_FIELDS` — fields excluded from column display
Currently: `{buyPlusVat: 1, recPrice: 1}`. These appear in the separate **Buy+VAT** and **Rec Price** columns, not in the main invoice table.

---

## Supplier-Specific Rules

### RR Rapid Service
- `meta.recPriceRule = "per_unit_dozen"`, `meta.dozSize = 12`
- Items sold by the dozen — `(amt / qty / 12) × vatRate` for per-unit price

### BrandActiv / IBL
- Use "Unit prc excl Vat" column × per-row VAT% (from "VAT %" column)
- Prefer "Unit disc prc excl Vat" when discounted

### Lim How Brothers
- Use "Price (Ex)" column × vatRate

### Cadi Fortune
- `amt / qty` directly — amounts already incl-VAT

### Innodis
- When qty contains "CT" (carton): extract `xN` from product name for units-per-carton
- `(amt / (cartons × N)) × vatRate`

### VKS Company (butcher)
- Invoice columns: Description, Qty/kg, Unit Price, Exempted, Taxable
- `amountCol` = "Taxable" (index 4 in old format)
- `vatRate = 1.15` for old format (taxable column is excl-VAT line total)
- Items format: `qtyKg` field is the quantity, `taxable`/`exempted` are line totals
- Totals format: `{totalExempted, totalTaxable, vat15, grossTotal, discount}`

### Panagora
- `vatRate = 1.0` on invoices `ARCINV002297601` and `ARCINV002298901` — amounts already incl-VAT

### Kool Food
- Mixed invoices: some have Exempted column only (frozen/dairy), some have both Exempted + Taxable
- `amountCol` varies by invoice — check column names

---

## VAT Audit Results (completed)

All invoices with `vatRate=1.15` were audited. These were corrected to `vatRate=1.0` in Supabase because their amount column already includes VAT:

| Supplier | Invoice ID(s) |
|---|---|
| Quality Beverages Limited | PSI26/00128447, PSI26/00128451 |
| Edendale Distributors | edendale-MV0110012414, MV0210010629 |
| Innodis | MDPDIX10002334 |
| Intl Distillers | I060000949 |
| RR Rapid Service | rr-rapid-607501, 608676 |
| Panagora | ARCINV002297601, ARCINV002298901 |
| Li Wan Po | LWP-A056208 |
| Pillay R Frozen | CN/2026/3397 |
| Kool Food | invoice 15674 (amountCol fixed 3→4) |

---

## Rules for Processing New Invoices (AI Prompt Rules)

When Codex AI processes a new supplier PDF and generates the `items` array:

1. **Always include `buyPlusVat` and `recPrice`** as fields on every item — these are the pre-computed prices the app relies on
2. **`buyPlusVat` = incl-VAT cost per the PACK (not per individual unit)** — the app divides by `detectPackSize(description)` for per-unit price. Do NOT pre-divide by pack size.
3. **`recPrice` = `buyPlusVat × 1.2`** (20% margin) — also at pack level
4. **Never add `buyPlusVat` or `recPrice` to `ITEM_META_FIELDS`** — they must stay excluded from column display
5. **Pack size from description**: when description contains patterns like `"70GX24"` or `"20X45g"`, the pack count (24, 20) is used to divide the buying price to get per-unit cost
6. **`vatType` field**: use `"Taxable"`, `"Exempt"`, or `"Zero Rated"` — standard Mauritius VAT classification
7. **Totals object**: store as a plain object with the most descriptive key names possible. The `normalizeTotals` function handles any key. Prefer explicit keys like `totalExempted`, `totalTaxable`, `vat15`, `grossTotal` over generic `total` when breakdown is known.
8. **`receivedAt`**: always store as ISO datetime `"2026-05-26T10:30:00Z"` — used for chronological ordering in price tracker

---

## Common Mistakes to Avoid

| Mistake | Correct Approach |
|---|---|
| Setting `vatRate=1.15` when amount column is incl-VAT | Check: `row_total ≈ qty × unit_price` (not × 1.15) means already incl-VAT → `vatRate=1.0` |
| Hardcoding columns like `item.qty` or `item.price` in `normalizeInv` | Read ALL keys from `items[0]` dynamically |
| Storing a totals key that `normalizeTotals` doesn't handle | The function handles unknowns via camelCase auto-formatting — just use descriptive key names |
| Displaying raw ISO dates | Always use `fmtDD(str)` for display |
| Comparing dates as strings without `toISODate()` | `"22/05/2026" > "2026-05-18"` is incorrect — always normalize first |
| Calculating per-unit price without checking `detectPackSize` | `"70GX24"` means 24 units — price ÷ 24 |
| Adding new totals key variants to the app code | Just add to `TOTAL_LABELS` + `KEY_ORDER` in `normalizeTotals` |
| Applying 15% VAT to frozen chicken / dairy | These are zero-rated in Mauritius — `vatRate=1.0`, no ×1.15 |
