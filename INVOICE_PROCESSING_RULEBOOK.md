# Invoice Processing Rulebook — Fowdar Store
# Paste this entire file into a fresh Claude chat before uploading any invoice.
# ─────────────────────────────────────────────────────────────────────────────

## COMPLETENESS MANDATE — Read before anything else

This is a full invoice digitisation task. Your output must be an exact digital copy of the invoice table.

### Never do this
- Extract only description, quantity, price, and total — that is not enough
- Skip rows because they look like subtotals, free-goods lines, or are hard to read
- Ignore columns because they seem unimportant or have an unfamiliar name
- Assume the invoice has a fixed structure

### Always do this
- Capture **every column** on the invoice table — regardless of name
- Capture **every row** — no row may be skipped or merged
- Unreadable cell → set value to `null` and add `"reviewNote": "Unreadable cell"` to that item
- Uncertain row → keep it, set `"divisionConfidence": "low"` and `"reviewNote": "Row needs review"`
- Add `"extractedRowCount"` to the invoice object: count of product rows on the invoice
- Add `"extractedColumnCount"` to the invoice object: count of columns in the invoice table

**If the invoice has 9 columns → 9 fields per item. If it has 12 rows → 12 items. No exceptions.**

### Columns that may appear (not exhaustive — include whatever is on this invoice)
Item code · Barcode · Batch number · Expiry date · Description · Pack size · Qty · Free qty · Unit price excl. VAT · Discount % · Discount amount · VAT % · VAT amount · Line total excl. VAT · Line total incl. VAT · RSP · Supplier reference · Any other column present

---

## Context

You are helping process supplier invoices for **Veer Bisham Fowdar Trading Co. Ltd.**, a supermarket in Mauritius. Output is JSON that gets stored in a Supabase database and displayed in the store's invoice viewer app.

**Currency:** MUR (Mauritian Rupee). **VAT:** 15% standard. Some products are zero-rated — never apply VAT to them (see below).

---

## Required JSON output structure

```json
{
  "id": "<invoice number — if blank, generate as supplier-DDMMYYYY>",
  "date": "<TODAY'S date as YYYY-MM-DD — the upload/processing date, NOT the date printed on the document>",
  "supplierInvoiceDate": "<date printed on the document as YYYY-MM-DD — omit if same as today>",
  "receivedAt": "<today's ISO datetime e.g. 2026-05-26T10:30:00Z>",
  "extractedRowCount": "<number — count of product rows on the invoice>",
  "extractedColumnCount": "<number — count of columns in the invoice table>",
  "items": [
    {
      "description": "<product name exactly as on invoice>",
      "qty": "<number>",
      "unitPrice": "<number>",
      "<every other column on the invoice>": "<value>",
      "buyPlusVat": "<number — incl-VAT cost per sellable unit, see rules>",
      "recPrice": "<number — buyPlusVat × 1.2>",
      "packDivisionApplied": "<bool>",
      "sellableUnitCost": "<number — final per-unit incl-VAT cost>",
      "divisionConfidence": "<'high' | 'medium' | 'low' | 'manual'>",
      "reviewNote": "<null or warning string>"
    }
  ],
  "totals": { "<key>": "<value>" },
  "colOrder": ["<invoice columns left-to-right — do NOT include buyPlusVat, recPrice, or the four audit fields>"]
}
```

---

## VAT Rules — read before calculating anything

### Rule 1: Check whether the line amount already includes VAT

- **Amount column is incl-VAT** → use directly, do NOT multiply by 1.15 again.
- **Amount column is excl-VAT** → multiply by 1.15.

**How to verify:** Does `lineTotal ≈ qty × unitPrice`?
- YES → incl-VAT already. Do NOT multiply.
- NO, but `lineTotal ≈ qty × unitPrice × 1.15`? → excl-VAT. Multiply.

Applying 1.15 to an already-incl-VAT amount inflates the price by ~32%. This is the #1 error.

### Rule 2: Zero-rated products — NEVER multiply by 1.15

| Zero-rated category | Examples |
|---|---|
| Frozen chicken & poultry | Sadia, Edendale, nuggets, wings, thighs |
| Fresh/frozen fish & seafood | Any fish |
| Dairy | Milk, cheese, butter, yoghurt |
| Basic food staples | Rice, flour, bread |
| Invoice-marked exempt | "Exempt" or "0% VAT" on the invoice |

For these: `buyPlusVat = lineTotal / qty` (no multiplication at all).

---

## Case Pack vs Unit Price — NEVER blindly divide

When a product description contains a pack pattern (e.g. `70GX24`, `12×1L`, `200ML×18`), **decide per-product** whether the invoice price covers the whole pack or a single unit.

### Decision matrix

| Signal | Decision |
|---|---|
| `qty = 1` AND description has pack pattern (`70GX24`, `12X1L`) | **DIVIDE** — price is for the box |
| `qty × unitPrice ≈ lineTotal` | **DO NOT DIVIDE** — unit-level math checks out |
| `qty > 1` (multiple individual units, not packs) | **DO NOT DIVIDE** — qty already counts individual units |
| Description uses individual notation (`"Milk 1L"`, not `"Milk 12×1L"`) | **DO NOT DIVIDE** |
| Supplier sells by carton/dozen (Innodis, RR Rapid) | **DIVIDE** — see supplier rule |
| Unit price is realistic without division | **DO NOT DIVIDE** |

### Pack pattern detection

| Pattern | Example | Pack count |
|---|---|---|
| Weight × N (unit letter before ×) | `70GX24`, `3LTX6` | Number after × = **24, 6** |
| N × weight (unit letter after ×) | `20 X 45g`, `12X330ml` | Number before × = **20, 12** |
| Large × small (pure numbers) | `300X30`, `2500X12` | **Smaller** number = **30, 12** |

### Carton-style UOM column — pack count lives in the UNIT column, not the description

Some suppliers write "1 carton of N pieces" in the UOM/Unit column while the
description has no pack pattern at all. QTY then counts **cartons**, and the
unit price / line amount are at **carton** level:

| UOM value | Meaning | Seen at |
|---|---|---|
| `CAR12 PCS`, `CAR 24PCS` | carton of 12 / 24 pieces | Vaulbert (HVC) |
| `CTN 40U`, `CTN 12U` | carton of 40 / 12 units | Dywada |
| `CTN12`, `BTE18`, `BTE24` | carton/boîte of N | Tenfa Marketing |
| `CTN X 12`, `12 PCS/CTN`, `BOX12` | carton of 12 | generic variants |

**Rule:** store `buyPlusVat` at the **carton level as billed** (discount applied,
VAT added only where the row is taxable) — the app reads the UOM notation and
divides by N itself. Copy the unit-price and line-amount columns exactly as
printed. Exception: **Tenfa Marketing** stores per-piece (historical consistency —
see its supplier section).

NOT carton notation: plain `Piece`/`Unit`, bare `CT` (Innodis rule), and Lim How's
`C30`-style unit codes (their Price (Ex) is already per piece).

### Calculating buyPlusVat

**If dividing (price is for the whole pack):**
```
buyPlusVat = lineTotal_inclVat / qty / packCount
```

**If NOT dividing (price is already per unit):**
```
buyPlusVat = lineTotal_inclVat / qty
```

---

## Absurd Price Protection

After calculating `sellableUnitCost`, check realism:

| Product type | Flag if below |
|---|---|
| Snacks, biscuits, chips | Rs 2 |
| Soft drinks | Rs 3 |
| Household items | Rs 1 |
| Confectionery / candy | Rs 1 |
| Frozen chicken (per kg) | Rs 50 |
| Meat/protein (per kg) | Rs 100 |

**If flagged:**
- Set `divisionConfidence: "low"`
- Set `reviewNote: "Needs review — possible incorrect pack division"`
- Output both the result AND the warning. Do not finalize — let the user decide.

---

## Recommended Selling Price

Default: `recPrice = buyPlusVat × 1.2` (20% margin).

**Exception — Grays:** use the printed `RSP` column directly. Do not compute as `× 1.2`.

---

## Required fields on every item

| Field | Type | Meaning |
|---|---|---|
| `packDivisionApplied` | bool | `true` = divided by pack count, `false` = already unit price |
| `sellableUnitCost` | number | final per-unit incl-VAT cost |
| `divisionConfidence` | string | `"high"` / `"medium"` / `"low"` / `"manual"` |
| `reviewNote` | string\|null | null if fine, warning message if suspect |

Always include all four fields, even when `packDivisionApplied = false`.

---

## Totals keys to use

| What it represents | Key |
|---|---|
| Total before VAT | `exclVat` |
| Discount | `discount` |
| VAT 15% | `vat15` |
| PET / environmental tax | `petTax` |
| Total incl. VAT | `inclVat` |
| Total exempted items | `totalExempted` |
| Total taxable items | `totalTaxable` |
| Grand total | `grossTotal` |
| Net total (after discount) | `netTotal` |

---

## Column field names

| Invoice column | Field name |
|---|---|
| Description / Product | `description` |
| Quantity | `qty` |
| Qty in kg | `qtyKg` |
| Unit Price | `unitPrice` |
| Unit Price Excl. VAT | `unitPriceExcl` |
| Exempted amount | `exempted` |
| Taxable amount | `taxable` |
| VAT type | `vatType` |
| VAT amount per line | `vatAmt` |
| VAT % | `vatPct` |
| Discount % | `disc` |
| Discount amount | `discount` |
| PET Tax | `petTax` |
| Line total excl. VAT | `totalExcl` |
| Line total incl. VAT | `total` |
| Code / SKU | `code` |
| RSP (recommended selling price) | `rsp` |

---

## Supplier-Specific Rules

### Quality Beverages Limited (QBL)
- **colOrder:** `["description","code","qty","disc","price","vat","petTax","total"]`
- `total` column = **incl-VAT** — do NOT ×1.15
- `buyPlusVat = total / qty`
- Pack sizes in descriptions: `70GX24` = 24, `300MLX24` = 24, `1.5LTX6` = 6
- Sadia / Edendale products are zero-rated even when appearing on this invoice

### VKS Company (butcher)
- **colOrder:** `["description","qtyKg","unitPrice","exempted","taxable"]`
- Qty column is in **kg** → field name `qtyKg`
- Taxable items (mutton, beef, pork): `buyPlusVat = (taxable / qtyKg) × 1.15`
- Exempt items (Sadia, Edendale, any frozen chicken): `buyPlusVat = exempted / qtyKg`
- Set `vatType: "Taxable"` or `"Exempt"` on every row
- Totals: `totalExempted`, `totalTaxable`, `vat15`, `grossTotal`

### Edendale Distributors
- **ALL products zero-rated** (VAT Code Z)
- `buyPlusVat = unitPrice` (the "Price U" column — use it directly, no multiplication)
- `recPrice = buyPlusVat × 1.2`
- Even if the invoice prints a VAT line, ignore it — zero-rated by law

### Innodis
- Qty uses carton notation: `"2CT"` = 2 cartons
- Product names contain units per carton: `"Biscuit ×36"` = 36 per carton
- `buyPlusVat = lineTotal / (cartons × unitsPerCarton) × vatRate`
  - e.g. lineTotal=720, qty="2CT", name="Biscuit ×36" → `720 / (2×36) × 1.15 = 11.50`
- Extract carton count: drop "CT" from qty. Extract units per carton: find `×N` or `xN` in description
- Check each product individually for zero-rating (frozen items are exempt)

### RR Rapid Service
- Items sold **by the dozen** — divide by 12 after qty
- `buyPlusVat = (lineTotal / qty / 12) × 1.15`
- The invoice qty = number of dozens, NOT individual units

### BrandActiv / IBL
- VAT % is **per row** (some 0%, some 15%) — never use a single invoice-level vatRate
- Use `"Unit prc excl Vat"` column for buyPlusVat
- If `"Unit disc prc excl Vat"` is present and non-zero, use that instead (discounted price)
- `buyPlusVat = unitExclPrice × (1 + vatPct / 100)`
- Do NOT use the "Rec.Cons" / "RRP" column — that is the supplier's suggested retail price

### Lim How Brothers
- Use `"Price (Ex)"` column (excl-VAT unit price)
- `buyPlusVat = priceEx × 1.15`

### Cadi Fortune
- Line totals **already include VAT** — do NOT ×1.15
- `buyPlusVat = lineTotal / qty`

### Panagora
- Line totals **already include VAT** — do NOT ×1.15
- `buyPlusVat = lineTotal / qty`

### Kool Food
- Mixed invoices — check each product individually:
  - Exempt item: `buyPlusVat = exempted / qty` (no ×1.15)
  - Taxable item: `buyPlusVat = taxable / qty × 1.15`
- Some invoices have only `exempted` column; some have both `exempted` + `taxable`

### Pillay R Frozen
- **ALL products zero-rated** — never apply 15% VAT
- `buyPlusVat = lineTotal / qty`

### Li Wan Po
- Line totals **already include VAT** — do NOT ×1.15
- `buyPlusVat = lineTotal / qty`

### International Distillers Ltd
- **colOrder:** `["description","qty","price","vat","total"]`
- `price` column = **excl-VAT**; `total` = incl-VAT
- `buyPlusVat = price × 1.15` (or equivalently `total / qty`)

### Grays
- **colOrder:** `["qty","description","unitPriceExcl","discount","vatPct","totalUnitPrice","netVat","netAmount","rsp"]`
- `netAmount` = **incl-VAT** line total — do NOT ×1.15
- `buyPlusVat = netAmount / qty`
- `recPrice` = use printed `RSP` column directly — do NOT compute as `× 1.2`

### Freelance Distributors
- **colOrder:** `["rsp","item","description","ctns","units","unitPrice","vatPct","discPct","total"]`
- `rsp` is the **first** column
- `unitPrice` and `total` are **incl-VAT** — do NOT ×1.15
- `buyPlusVat = total / units` (divide by `units` column, not `ctns`)
- `vatPct` varies per row (15% or 0%) — check each line
- `recPrice = buyPlusVat × 1.2` (the printed `rsp` is supplier's suggested retail price, for reference only)
- Totals keys: `totalBeforeVat`, `subTotalInclLineDisc`, `totalVatAmount`, `totalIncVat`

### Vaulbert (HVC Ltd)
- **colOrder:** `["gtin","description","no","qty","uom","unitPriceExclVat","disc","lineAmountExclVat","vatId"]`
- UOM `CAR12 PCS` / `CAR 24PCS` = **1 carton of 12 / 24 pieces**; `qty` counts cartons
- `Unit Price Excl. VAT` and `Line Amount` are at **CARTON** level for CAR-style rows
- `vatId`: `Z` = zero-rated (pilchards/canned fish, no ×1.15) · `S` = standard (×1.15)
- `buyPlusVat` = **carton price as billed** (discount applied, ×1.15 only if S) — store at carton level, the app divides by the UOM pack count
- Rows with UOM `Piece` are ordinary per-piece lines — no division

### Dywada (Dywada Worldwide Co Ltd)
- **colOrder:** `["code","description","qty","uom","totalUnits","unitPriceExcl","pricePerCtn","totalExcl","vatPct","totalInclVat","pricePerUnit"]`
- UOM `CTN 40U` = carton of 40 units; `qty` counts cartons; `Total Qty` = pieces
- `Price/Unit` (last column) = **per piece, INCL-VAT** → `buyPlusVat = pricePerUnit` directly
- `Unit Price (Excl.)` is per PIECE; `Price per CTN` is per carton — don't mix them up
- Per-row `VAT` percent: noodles mostly 0, household 15

### Tenfa Marketing Ltd
- **colOrder:** `["qty","uom","description","unitPrice","vatPct","amount"]`
- UOM `BTE18`/`BTE24`/`BTE12` (boîte of N) and `CTN12` = box of N; `unitPrice`/`amount` are per BOX
- When UOM = `Unit`, the pack count is the parenthetical number in the description: `"GUMMY POP (20)"` → 20
- **Exception to the carton rule:** store `buyPlusVat` **PER PIECE** (box price ÷ N) — existing invoices did, stay consistent; set `packDivisionApplied = true`
- `"(6*18)"` in a description = 6 inner packs × 18; the box count is the UOM number (BTE18 → 18)

---

## Checklist before submitting

- [ ] `id` is the invoice number (or generated if blank)
- [ ] `date` is **today's upload/processing date** (YYYY-MM-DD) — not the printed invoice date
- [ ] `supplierInvoiceDate` is included if the printed date differs from today
- [ ] `receivedAt` is today's ISO datetime
- [ ] `extractedRowCount` matches the row count on the invoice
- [ ] `extractedColumnCount` matches the column count on the invoice
- [ ] **Every column** is present as a field — not just description/qty/price/total
- [ ] **No rows skipped** — unclear rows have `reviewNote` set, not deleted
- [ ] Every column from the invoice is included as a field
- [ ] For each item: decided pack-level vs unit-level (not blindly divided)
- [ ] `packDivisionApplied`, `sellableUnitCost`, `divisionConfidence`, `reviewNote` all set
- [ ] Zero-rated products have no ×1.15 applied
- [ ] `buyPlusVat` and `recPrice` are the correct level (unit cost, incl-VAT)
- [ ] `recPrice = buyPlusVat × 1.2` (except Grays: use RSP column)
- [ ] `totals` uses descriptive keys from the preferred list
- [ ] `colOrder` lists every printed invoice column left-to-right (excludes `buyPlusVat`, `recPrice`, and the four audit fields)
- [ ] Absurd prices flagged with `reviewNote` and `divisionConfidence: "low"`
