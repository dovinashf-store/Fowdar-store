# Key Functions Reference

Line numbers reference `index_1.html`. These are stable landmark functions — if lines shift, search by function name.

---

## Configuration constants (lines ~1529–1571)

### `ITEM_FIELD_LABELS` (line 1529)
Maps field names → human-readable column headers.  
Example: `qtyKg → "Qty/kg"`, `vatType → "VAT Type"`, `disc → "Disc%"`

**To add a new label**: add one entry `fieldName: "Display Label"`.

### `ITEM_META_FIELDS` (line 1554)
Fields excluded from column display: `{buyPlusVat: 1, recPrice: 1}`  
These appear in the separate Buy+VAT and Rec Price columns, NOT in the main table.  
**Never remove `buyPlusVat` or `recPrice` from this object.**

### `ITEM_FIELD_ORDER` (line 1556)
Canonical left-to-right column order for items-format invoices when no `colOrder` is present.  
Order: Identification → Qty → Pack info → Prices → Exempt/Taxable/VAT type → Discounts/Taxes → Line totals

---

## `detectPackSize(desc)` — line 1469

Extracts units-per-pack from a product description string.

```
detectPackSize("Doritos BBQ 70GX24")  → 24
detectPackSize("20 X 45g")            → 20
detectPackSize("300X30")              → 30
detectPackSize("Boneless Mutton")     → null
```

### Three patterns (in precedence order)

| Pattern | Example | What it matches | Result |
|---|---|---|---|
| A — WEIGHTxN | `"70GX24"`, `"3LTX6"`, `"2.5KGX12"` | Unit letter before X → count after X | 24, 6, 12 |
| B — NxWEIGHT | `"20 X 45g"`, `"12X330ml"`, `"6X1L"` | Unit letter after X → count before X | 20, 12, 6 |
| C — pure numeric | `"300X30"`, `"2500X12"` | Two numbers × each other → smaller is pack count | 30, 12 |

Pattern C works because product weight (g/ml) is always larger than pack count.

**Applied in**: `calcRec()`, `extractPriceTrackerValue()`, invoice rec-price column display.

---

## `detectVatRate(inv)` — line 1500

Only called for old-format invoices with NO stored `vatRate`. Returns `1.0` or `1.15`.

Rules (checked in order):
1. Amount column name contains "excl"/"ex vat"/"net" → `1.15`
2. Amount column name contains "incl vat" → `1.0`
3. Any column named exactly "price (ex)" or "unit price excl vat" → `1.15`
4. Any column contains "incl.vat" → `1.0`
5. Default: `1.0` (safest — avoids double-VAT)

---

## `normalizeInv(inv)` — line 1576

Converts both invoice formats to a unified `{cols, rows, qtyCol, amountCol, vatRate, totals, _precomputed}` structure.

**Old format path**: passes through, calls `normalizeTotals` on totals, uses stored `vatRate`.

**New items format path**:
1. Reads ALL keys from `items[0]`, filters out `ITEM_META_FIELDS`
2. Sorts columns: if `inv.colOrder` present → use that order; else → `ITEM_FIELD_ORDER` heuristic
3. Builds `cols` array using `ITEM_FIELD_LABELS` for headers
4. Builds `rows` 2D array from items
5. Sets `_precomputed[ri] = {buyPlusVat, recPrice}` for each row
6. Detects `qtyCol` using `QTY_KEYS`, `amountCol` using `AMT_KEYS`
7. Sets `vatRate = 1.0` (pre-computed values already include VAT)

### `AMT_KEYS` — amount column detection priority
```
["total","amountExcl","itemAmt","totalPayable","totalRs","totalExcl",
 "totalExclVat","totalInclVat","taxable","itemTotal","lineTotal",
 "netTotal","amount","totalInclDisc"]
```

### `QTY_KEYS` — qty column detection priority
```
["qty","quantity","totalUnits","noOfCtns","qtyKg","qtykg","units","pieces","pcs"]
```

---

## `calcRec(inv, ri, row, supMeta)` — line 1703

Returns **incl-VAT cost per unit** (buying price, no margin). Used for the Buy+VAT column.

Rules in exact execution order:

1. **Pre-computed** (`_precomputed[ri].buyPlusVat`) → divide by `detectPackSize(description)` → return
2. **SHEET_REC** (`inv.SHEET_REC`) → keyed by col-0 code, row index, or product name
3. **RR Rapid Service** (`recPriceRule === "per_unit_dozen"`) → `(amt / qty / dozSize) × vatRate`
4. **BrandActiv / IBL** → "Unit prc excl Vat" col × per-row VAT%; prefer "Unit disc prc excl Vat" if discounted
5. **Lim How Brothers** → "Price (Ex)" col × vatRate
6. **Cadi Fortune** → `amt / qty` (already incl-VAT)
7. **Innodis CT** → extract `xN` from product name; `(amt / (ctQty × N)) × vatRate`
8. **Standard columns** → look for "Unit Price", "UCP", "Price/Unit", "Price (Ex)", "Unit prc excl vat" × vatRate
9. **Fallback** → `(amt / qty / pack) × effectiveVat`; safety net: if amtCol name contains "incl.vat/total incl/inc vat/amount incl" → `effectiveVat = 1.0`; then ÷ `detectPackSize(description)`

**Rec Price** = `buyPlusVat × 1.2` (20% margin). For items format: use `_precomputed[ri].recPrice ÷ pack`.

---

## `extractPriceTrackerValue(inv, ri, row, supMeta)` — line 1842

Used **only** in `buildPriceHistory()`. Returns the canonical incl-VAT unit price for price-change comparison.

Same logic as `calcRec()` but **without SHEET_REC** (which may contain override prices, not real invoice prices). Ensures consistent metric across invoices from the same supplier.

Priority:
1. `_precomputed[ri].buyPlusVat` ÷ pack
2. Explicit excl-VAT unit price col × vatRate (BrandActiv, Lim How, generic UCP)
3. Supplier-specific qty adjustments (RR Rapid dozen, Innodis CT)
4. Fallback: `(amt / qty / pack) × effectiveVat`

---

## `toISODate(str)` — line 1907

Normalises any date string to `YYYY-MM-DD`. Handles:
- ISO: `"2026-05-25"` → `"2026-05-25"`
- ISO datetime: `"2026-05-25T09:00:00Z"` → `"2026-05-25"`
- DD/MM/YYYY: `"25/05/2026"` → `"2026-05-25"`

**Always use before sorting, comparing, or grouping dates.**

---

## `fmtDD(str)` — line 1920

Formats any date to `DD/MM/YYYY` for display only.  
`fmtDD("2026-05-25")` → `"25/05/2026"`

**Never use for sorting or storage.**

---

## `normalizeTotals(t)` — line 1946

Converts ANY totals format to `[[label, value], ...]` pairs for invoice footer display.

- **Array input** `[[label,val], ...]` → returned as-is
- **Object input** `{exclVat: 1273, vat: 190.95, ...}` → emitted in `KEY_ORDER`, duplicate labels suppressed, zeros skipped (except `totalExempted`, `totalTaxable`, `exempted`, `taxable`, `zeroRated` which are meaningful zeros)
- **Unknown keys** → auto-formatted via camelCase → "Title Words"

### To add support for a new totals key

1. Add to `TOTAL_LABELS` object: `myNewKey: "Display Label"`
2. Add to `KEY_ORDER` array at the correct position
3. **No other code changes needed.**

### Complete key → label mapping (current)

```
totalExempted → Total Exempted    totalTaxable → Total Taxable
exempted → Exempted               taxable → Taxable     zeroRated → Zero Rated
exclVat/exclAmt/totalExcl/totalBeforeVat/totalExclVat → Excl. VAT
subtotalExVat → Subtotal Excl. VAT    subTotal → Sub Total
discount/discountTotal → Discount
vat/vatTotal/vatAmt/vatAmount → VAT    vat15/totalVatAmt → VAT 15%
petTax → PET Tax
net/netTotal/totalNet → Net Total
inclVat/totalIncl/totalInclVat → Total Incl. VAT
totalPayable/invoiceTotal → Total Payable
gross/grossTotal → Gross Total    grandTotal → Grand Total    total → Total
```

---

## `buildPriceHistory(SUPPLIERS)` — line 2023

Builds `hist[supplierName][productName] = [{date, price, invoiceId}, ...]` for the Price Changes tab.

Key behaviours:
- Uses `extractPriceTrackerValue()` — NOT `calcRec()`
- Sorts invoices chronologically by `receivedAt`
- One entry per invoice per product (last row in invoice wins if product appears twice)
- Prices rounded to 2 dp to eliminate floating-point noise
- Entries are chronological (oldest first)

---

## `fetchAmendments()` — line 2086

Loads all rows from `price_amendments` table. Returns:
```javascript
{
  "Supplier||Product||invoiceId": { amended: true, amendedAt: "2026-05-28T10:00:00Z" },
  ...
}
```

Called on initial load and on every refresh.

---

## `upsertAmendment(sn, pn, invoiceId, amended, amendedAt)` — line 2099

Writes one amendment record to Supabase using `Prefer: resolution=merge-duplicates` for upsert behaviour.

- `amended = true` → user clicked "✓ Done"
- `amended = false` → user clicked "● Pending" (toggled back)
- `amendedAt = null` when `amended = false`

---

## `getWeekLabel()` — line 2109

Returns `"Week X of MonthName YYYY"` for the FOLLOWING week (used in order planning on Sundays).

---

## React state variables (App component)

| State | Default | Purpose |
|---|---|---|
| `screen` | `"home"` | Current screen: `"home"`, `"invoices"`, `"prices"`, `"orders"`, `"payments"` |
| `suppliers` | `{}` | All supplier data from Supabase |
| `loading` | `true` | Initial load spinner |
| `refreshing` | `false` | Pull-to-refresh spinner |
| `search` | `""` | Global search string |
| `priceSortBy` | `"date"` | Price tracker sort: `"date"`, `"price"`, `"name"`, `"supplier"` |
| `priceSortDir` | `"desc"` | Price tracker sort direction: `"asc"` or `"desc"` |
| `priceAmendFilter` | `"all"` | Price tracker amendment filter: `"all"`, `"pending"`, `"amended"` |
| `amendments` | `{}` | Amendment state loaded from Supabase |
| `priceFilter` | `"changed"` | `"changed"` = show only price changes; `"all"` = show all products |
| `catFilter` | `""` | Category filter (orders module) |
