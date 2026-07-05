# Invoice Processing Prompt
# Paste everything below this line into Claude chat together with the invoice photo.
# ─────────────────────────────────────────────────────────────────────────────────────────

Process this invoice image and return a single JSON object in the exact format below.
Store it in Supabase table `fowdar_invoices`, supplier_name column matching the supplier,
inside the `invoices` JSONB array.

---

## COMPLETENESS MANDATE — Read before anything else

This is a full invoice digitisation task. Your output must be an exact digital copy of the invoice table. Nothing may be dropped, merged, or summarised.

### Never do this
- Extract only description, quantity, price, and total — that is not enough
- Skip rows because they look like subtotals, free-goods lines, or are hard to read
- Ignore columns because they seem unimportant or have an unfamiliar name
- Assume the invoice has a fixed structure

### Always do this
- Capture **every column** visible on the invoice table — regardless of its name
- Capture **every product/item row** — no row may be skipped or merged
- If a cell is unreadable, write `null` for the value and set `"reviewNote": "Unreadable cell"` on that item
- If a row is uncertain, keep it and set `"divisionConfidence": "low"` and `"reviewNote": "Row needs review"` on that item
- Count how many product rows appear on the invoice and store as `"extractedRowCount"` on the invoice object
- Count how many columns the invoice table has and store as `"extractedColumnCount"` on the invoice object

### Invoice columns that may appear — not exhaustive, include whatever is on this invoice
Item code · Barcode · Batch number · Expiry date · Description · Pack size · Qty ordered · Free qty · Unit price excl. VAT · Discount % · Discount amount · VAT % · VAT amount · Line total excl. VAT · Line total incl. VAT · RSP · Supplier reference · Department · Weight/UOM · Carton qty · Any other column present

**Rule: If the invoice has 9 columns, your JSON must have 9 fields per item (plus the computed fields). If it has 12 rows, your JSON must have 12 items.**

---

## Required JSON structure

```json
{
  "id": "<invoice number from the document — if none, generate as supplier-DDMMYYYY>",
  "date": "<TODAY'S date as YYYY-MM-DD — the date you are processing this invoice, NOT the date printed on the document>",
  "supplierInvoiceDate": "<date printed on the invoice document as YYYY-MM-DD — omit this field if it is the same as today>",
  "receivedAt": "<today's date and time as ISO 8601, e.g. 2026-05-26T10:30:00Z>",
  "extractedRowCount": "<number — count of product rows visible on the invoice>",
  "extractedColumnCount": "<number — count of columns in the invoice table>",
  "items": [
    {
      "description": "<product name exactly as on invoice>",
      "qty": "<number — quantity ordered>",
      "unitPrice": "<number — unit price as printed on invoice>",
      "<every other column on this invoice — use the field name table below>": "<value as printed>",
      "buyPlusVat": "<number — see calculation rules below>",
      "recPrice": "<number — buyPlusVat × 1.2, rounded to 2 dp>",
      "packDivisionApplied": "<bool>",
      "sellableUnitCost": "<number — final per-unit incl-VAT cost>",
      "divisionConfidence": "<'high' | 'medium' | 'low' | 'manual'>",
      "reviewNote": "<null, or reason this row needs review>"
    }
  ],
  "totals": {
    "<key>": "<value>"
  },
  "colOrder": ["<every invoice column left-to-right — do NOT include the 6 computed fields>"]
}
```

The `colOrder` array is **required**. List every field name that appears on the paper invoice, in the exact **left-to-right** order of the printed columns. Do **not** include `buyPlusVat`, `recPrice`, `packDivisionApplied`, `sellableUnitCost`, `divisionConfidence`, or `reviewNote`.

---

## buyPlusVat calculation rules — READ CAREFULLY

`buyPlusVat` = the **incl-VAT cost per the full pack** as sold by the supplier.
`recPrice` = `buyPlusVat × 1.2` (20% margin for the store).

### Step 1 — Find the correct line amount

- **"Total Incl. VAT" or "Total" column** → use it directly (do NOT multiply by 1.15 again)
- **"Amount Excl. VAT" or "Net" column only** → multiply by 1.15 (but see zero-rated rule)
- **Per-unit price only** → `unit_price × qty`, then apply VAT rule

### Step 2 — Decide: is the invoice price for a pack or a single unit?

**Do NOT blindly divide by detected pack size.** Use this decision matrix:

**Divide if:**
- `qty = 1` on invoice AND description has clear pack pattern (`70GX24`, `12×1L`, `200ML×18`)
- Line total matches pack-level pricing (e.g., Rs 1500 for a box of 24 snacks)
- Supplier typically sells by the pack/carton/case (check Supplier-Specific Rules below)

**Do NOT divide if:**
- `qty > 1` (multiple individual units ordered — qty logic already handles the pack)
- `qty × unitPrice ≈ lineTotal` (unit-level math checks out without division)
- Product description uses individual unit notation (`"Milk 1L"`, `"Bread 1 loaf"`)
- Unit price falls in realistic range for that product WITHOUT division

### Step 3 — Calculate buyPlusVat (based on decision)

**If dividing by pack:**
```
Pack pattern detected (e.g., 70GX24 → 24 units per pack)
buyPlusVat = line_amount_incl_vat / qty / pack_count
```

**If NOT dividing (already unit price):**
```
qty and unit prices suggest individual units
buyPlusVat = line_amount_incl_vat / qty
```

### Step 4 — Zero-rated products (IMPORTANT — do NOT add 15%)

Never multiply by 1.15 for:
- Frozen chicken and poultry (Sadia, Edendale, nuggets, wings, thighs…)
- Fresh/frozen fish and seafood
- Dairy products (milk, cheese, butter, yoghurt)
- Rice, flour, bread
- Any item marked "Exempt" or "0% VAT" on the invoice

For zero-rated items: `buyPlusVat = line_amount / qty` (no ×1.15)

### Step 5 — Absurd Price Protection

After calculating per-unit cost, check if result is realistic:
- If `sellableUnitCost < Rs 1–2` for snacks/drinks/household items → flag as suspicious
- If other product types produce unrealistic costs → flag for review
- Set `reviewNote: "Needs review — possible incorrect pack division"`
- Set `divisionConfidence: "low"` when uncertain

### Step 6 — Output fields

Always include in each item:
- `packDivisionApplied` — true if divided by pack, false if already unit price
- `sellableUnitCost` — final per-unit cost (= `buyPlusVat` if not divided, or `buyPlusVat / packCount` if divided)
- `divisionConfidence` — "high" / "medium" / "low" / "manual"
- `reviewNote` — null or warning message

---

## Totals object — preferred keys

| What it represents | Key to use |
|---|---|
| Total before VAT | `exclVat` |
| Discount | `discount` |
| VAT (15%) | `vat` |
| PET / Environmental tax | `petTax` |
| Total incl. VAT | `inclVat` |
| Total exempted items | `totalExempted` |
| Total taxable items | `totalTaxable` |
| VAT on taxable items | `vat15` |
| Grand total | `grossTotal` |
| Net total (after discount) | `netTotal` |

---

## Column field names to use

| Invoice column | Field name |
|---|---|
| Description / Product | `description` |
| Quantity / Qty | `qty` |
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
| Pack size | `packSize` |
| Unit of measure | `uom` |
| VAT code | `vatCode` |

---

## Date format

- `date`: **today's date** (upload/processing date) as `YYYY-MM-DD` — NOT the printed invoice date
- `supplierInvoiceDate`: the date printed on the document as `YYYY-MM-DD` — only include if different from today
- `receivedAt`: today's full ISO datetime e.g. `"2026-05-26T10:30:00Z"`

---

## Checklist before submitting

- [ ] `id` is the invoice number (or generated if blank)
- [ ] `date` is **today's upload/processing date** (YYYY-MM-DD) — not the printed invoice date
- [ ] `supplierInvoiceDate` is included if the printed date differs from today
- [ ] `receivedAt` is today's ISO datetime
- [ ] `extractedRowCount` matches the actual row count on the invoice
- [ ] `extractedColumnCount` matches the actual column count on the invoice
- [ ] **Every column** from the invoice table is present as a field — not just description/qty/price/total
- [ ] **No rows were skipped** — unclear rows have `reviewNote` set, not deleted
- [ ] Every column from the invoice is included as a field
- [ ] For each item: decided whether invoice price is pack-level or unit-level
- [ ] `packDivisionApplied` is set correctly (true for pack prices, false for unit prices)
- [ ] `sellableUnitCost` is the final per-unit incl-VAT cost
- [ ] `divisionConfidence` reflects the certainty of the pack division decision
- [ ] `reviewNote` is null, or contains warning if price seems unrealistically low
- [ ] `buyPlusVat` matches the chosen interpretation (pack-level if divided, unit-level if not)
- [ ] Zero-rated products have `buyPlusVat = line_total / qty` (no ×1.15)
- [ ] `recPrice = buyPlusVat × 1.2`
- [ ] `totals` uses descriptive key names from the preferred list
- [ ] `buyPlusVat`, `recPrice`, `packDivisionApplied`, `sellableUnitCost`, `divisionConfidence`, `reviewNote` are the last six fields on each item
- [ ] `colOrder` lists every invoice column in left-to-right paper order (excludes the six fields above)

---

## Pack Division Decision Matrix

Before processing each item, decide whether the invoice price should be divided by pack count.

### Quick decision framework

| Signal | Decide | Notes |
|---|---|---|
| `qty=1`, description has pack pattern (70GX24, 12X1L) | **DIVIDE** | Clear pack notation + single pack ordered |
| `qty>1`, description is individual units (Milk 1L × 5) | **DO NOT DIVIDE** | qty already represents individual units |
| `qty×unitPrice ≈ lineTotal` | **DO NOT DIVIDE** | Unit-level math checks out |
| `qty×unitPrice×N ≈ lineTotal` (where N is pack count) | **DIVIDE** | Pack-level math checks out |
| Supplier metadata says "sold by carton/dozen" | **DIVIDE** | Check Supplier-Specific Rules section |
| Unit price seems unrealistically low after division | **FLAG & REVIEW** | Set divisionConfidence="low", add reviewNote |

### Signals for DIVIDE

- Qty = 1 and description clearly indicates pack (`"Doritos BBQ 70GX24"`, `"Milk 1LX12"`, `"Eggs 18 count"`)
- Supplier typically sells by the pack/carton/case (Innodis, RR Rapid, etc.)
- Line total >> typical single-unit price for the product
- `qty × unitPrice ÷ N ≈ lineTotal` math (where N = detected pack count)

### Carton-style UOM column — "1 carton of N pieces"

Some suppliers put the pack count in the **UOM/Unit column** instead of the description.
All of these mean the line is billed per carton of N pieces, with QTY counting **cartons**:

| UOM value | Meaning | Seen at |
|---|---|---|
| `CAR12 PCS`, `CAR 24PCS` | carton of 12 / 24 pieces | Vaulbert (HVC) |
| `CTN 40U`, `CTN 12U` | carton of 40 / 12 units | Dywada |
| `CTN12`, `BTE18`, `BTE24` | carton/boîte of 12 / 18 / 24 | Tenfa Marketing |
| `CTN X 12`, `12 PCS/CTN`, `BOX12` | carton of 12 | generic variants |

**Rule:** when the UOM says carton-of-N and the description has NO pack pattern,
store `buyPlusVat` at the **carton level as billed** (after discount, incl. VAT where
applicable) — the app detects the UOM notation and divides by N automatically.
Set `packDivisionApplied=false` and note the UOM in `reviewNote` if unsure.
**Never divide twice** — if you divide to per-piece yourself, the unit-price and
line-amount columns must still be copied unchanged, exactly as printed.

NOT carton notation (do not divide): plain `Piece`/`Unit`, bare `CT` (Innodis has
its own rule), and Lim How's `C30`-style unit codes (their Price (Ex) is already
per piece).

### Signals for DO NOT DIVIDE

- `qty > 1` (multiple individual units, not packs)
- Description lacks pack multiplier (`"Milk 1L"`, `"Bread 1 loaf"`, `"Biscuit packet"`)
- `qty × unitPrice ≈ lineTotal` (unit-level math works)
- Supplier sells individual units at retail volume (e.g., Cadi Fortune, retail FMCG)
- Unit price falls within realistic range for that product category

### Output requirements for each item

```json
{
  "packDivisionApplied": true,
  "sellableUnitCost": 62.50,
  "divisionConfidence": "high",
  "reviewNote": null
}
```

Always set all four fields, even if `packDivisionApplied = false`.

---

## Supplier-Specific Rules

Read the section for this supplier before processing. These rules override or extend the general rules above.

---

### Supplier: Quality Beverages Limited (QBL)

**Category:** Snacks · Drinks · Confectionery
**Supabase supplier_name:** `Quality Beverages Limited`

**Invoice columns (left → right on paper):**

| Field | Invoice header | Notes |
|---|---|---|
| `description` | Description | Product name exactly as printed |
| `code` | Code | Product SKU |
| `qty` | Qty | Quantity ordered |
| `disc` | Disc% | Discount percentage |
| `price` | Price | Unit price excl. VAT |
| `vat` | VAT | VAT amount for the line |
| `petTax` | PET | Environmental levy |
| `total` | Total | Line total **incl. VAT** |

**colOrder:** `["description", "code", "qty", "disc", "price", "vat", "petTax", "total"]`

**VAT treatment:**
- Standard 15% on most products
- Zero-rated (no ×1.15): frozen chicken, dairy, basic food staples

**Special rules:**
1. The `total` column **already includes VAT** — do NOT multiply by 1.15
2. `buyPlusVat = total / qty` (full-pack incl-VAT cost)
3. Pack sizes in descriptions: `"70GX24"` = 24 units, `"300MLX24"` = 24 units, `"1.5LTX6"` = 6 units
4. `recPrice = buyPlusVat × 1.2`

**Gotchas:**
- Never pre-divide `buyPlusVat` by pack count
- If Sadia or Edendale products appear, treat as zero-rated (no ×1.15)

---

### Supplier: VKS Company

**Category:** Butcher — Meat, Poultry, Frozen
**Supabase supplier_name:** `VKS Company`

**Invoice columns (left → right on paper):**

| Field | Invoice header | Notes |
|---|---|---|
| `description` | Description | Product name |
| `qtyKg` | Qty/kg | Weight in kilograms |
| `unitPrice` | Unit Price | Price per kg |
| `exempted` | Exempted | Line total for zero-rated items |
| `taxable` | Taxable | Line total excl. VAT for taxable items |
| `vatType` | — | Set to `"Taxable"` or `"Exempt"` based on product |

**colOrder:** `["description", "qtyKg", "unitPrice", "exempted", "taxable"]`

**VAT treatment:**
- Taxable items (mutton, beef, pork): `buyPlusVat = taxable / qtyKg × 1.15`
- Exempt/zero-rated items (Sadia, Edendale, all frozen chicken): `buyPlusVat = exempted / qtyKg` (no ×1.15)

**Totals keys to use:** `totalExempted`, `totalTaxable`, `vat15`, `grossTotal`

**Special rules:**
1. Qty column is in **kg** (`qtyKg`), not units
2. `exempted` = zero-rated line total; `taxable` = excl-VAT line total for standard-rated items
3. For taxable rows: `buyPlusVat = (taxable / qtyKg) × 1.15`
4. For exempt rows: `buyPlusVat = exempted / qtyKg`
5. `recPrice = buyPlusVat × 1.2`

**Gotchas:**
- Sadia / Edendale frozen products sold through VKS are always zero-rated — no ×1.15 regardless
- `vatType` field: use `"Taxable"` or `"Exempt"` on every item

---

### Supplier: Edendale Distributors

**Category:** Frozen Chicken · Poultry · Dairy
**Supabase supplier_name:** `Edendale Distributors`

**VAT treatment:**
- **ALL products are zero-rated** — VAT Code Z = Zero VAT, no VAT calculation needed
- `vatType: "Exempt"` on every item
- When VAT Code column shows `Z` → zero-rated, no ×1.15 under any circumstance

**Special rules:**
1. `buyPlusVat = unitPrice` (Price U on the invoice) — no multiplication needed, it is already the correct buy price
2. `recPrice = buyPlusVat × 1.2` (Price U × 1.2)
3. Pack sizes may appear in descriptions (e.g. `"1KGX10"` = 10 units per pack — app divides automatically)

**Gotchas:**
- Even if the invoice shows a VAT line or VAT amount, ignore it — VAT Code Z means zero-rated by law in Mauritius
- Do NOT use line total / qty — use the unit price (Price U) column directly

---

### Supplier: Innodis

**Category:** Food & Grocery — Carton Quantities
**Supabase supplier_name:** `Innodis`

**VAT treatment:**
- Standard 15% on most products
- Some lines may be zero-rated (frozen, dairy) — check the invoice

**Special rules:**
1. Qty is in **cartons**: e.g. `"2CT"` = 2 cartons
2. Product name contains units per carton: e.g. `"Rich Tea Biscuit ×36"` = 36 units per carton
3. `buyPlusVat = lineTotal / (cartons × unitsPerCarton) × vatRate`
   - Example: lineTotal = 720, qty = "2CT", product = "Biscuit ×36" → `720 / (2 × 36) × 1.15 = 11.50`
4. Extract carton count: take the number from the qty string (drop "CT")
5. Extract units per carton: find `×N` or `xN` in the product name

**colOrder:** `["description", "qty", "unitPrice", "total"]` *(adjust to match actual invoice)*

**Gotchas:**
- Do NOT treat "2CT" as qty=2 and divide only by 2 — you must also divide by units per carton
- Check each product individually for zero-rating (frozen items are exempt)

---

### Supplier: RR Rapid Service

**Category:** General — Sold by the Dozen
**Supabase supplier_name:** `RR Rapid Service`
**Supabase meta:** `{ "recPriceRule": "per_unit_dozen", "dozSize": 12 }`

**VAT treatment:**
- Standard 15% VAT applies

**Special rules:**
1. Items are sold **by the dozen** (12 units per sale unit)
2. `buyPlusVat = (lineTotal / qty / 12) × 1.15`
3. `recPrice = buyPlusVat × 1.2`

**Gotchas:**
- The qty on the invoice is number of dozens ordered, NOT individual units
- Always divide by 12 in addition to qty

---

### Supplier: BrandActiv / IBL

**Category:** Branded FMCG — VAT per row
**Supabase supplier_name:** `BrandActiv` or `IBL`

**Invoice columns typically include:**

| Field | Invoice header | Notes |
|---|---|---|
| `description` | Description | Product name |
| `qty` | Qty | Quantity |
| `unitPriceExcl` | Unit prc excl Vat | Excl-VAT unit price — **use this for buyPlusVat** |
| `discUnitPriceExcl` | Unit disc prc excl Vat | Discounted excl-VAT unit price — use instead if present |
| `vatPct` | VAT % | Per-row VAT percentage (0% or 15%) |
| `total` | Total | Line total |

**Special rules:**
1. Use `"Unit prc excl Vat"` column × `(1 + vatPct/100)` for `buyPlusVat`
2. If `"Unit disc prc excl Vat"` column exists and is non-zero, use that instead (discounted price)
3. VAT % is **per row** — some products may be 0%, others 15%
4. `buyPlusVat = unitExclPrice × (1 + vatPct / 100)`
5. `recPrice = buyPlusVat × 1.2`

**Gotchas:**
- Do NOT use a single invoice-level vatRate — each row has its own VAT%
- Do NOT use the "Rec.Cons" or "RRP" column — that is the suggested selling price, not the buying price

---

### Supplier: Lim How Brothers

**Category:** General Grocery
**Supabase supplier_name:** `Lim How Brothers`

**Invoice columns typically include:**

| Field | Invoice header | Notes |
|---|---|---|
| `description` | Description | Product name |
| `qty` | Qty | Quantity |
| `priceEx` | Price (Ex) | Excl-VAT unit price — **use this** |
| `total` | Total | Line total |

**Special rules:**
1. `"Price (Ex)"` column is the excl-VAT unit price
2. `buyPlusVat = priceEx × 1.15`
3. `recPrice = buyPlusVat × 1.2`

**Gotchas:**
- Do not use the line total column for buyPlusVat calculation — use the unit price column

---

### Supplier: Cadi Fortune

**Category:** General — Amounts Already Incl. VAT
**Supabase supplier_name:** `Cadi Fortune`

**VAT treatment:**
- Line total amounts **already include VAT** — do NOT multiply by 1.15

**Special rules:**
1. `buyPlusVat = lineTotal / qty` (amounts are already incl-VAT)
2. `recPrice = buyPlusVat × 1.2`

**Gotchas:**
- This supplier is the opposite of the default — amounts are incl-VAT, not excl-VAT

---

### Supplier: Panagora

**Category:** General FMCG
**Supabase supplier_name:** `Panagora`

**VAT treatment:**
- Line total amounts **already include VAT** — do NOT multiply by 1.15

**Special rules:**
1. `buyPlusVat = lineTotal / qty` (amounts already incl-VAT)
2. `recPrice = buyPlusVat × 1.2`

**Gotchas:**
- vatRate for all Panagora invoices is 1.0 (stored in Supabase) — confirmed by audit

---

### Supplier: Kool Food

**Category:** Frozen · Chilled · Dairy
**Supabase supplier_name:** `Kool Food`

**VAT treatment:**
- Mixed: frozen/dairy lines are zero-rated (Exempt); standard lines are taxable (15%)
- Check each product individually

**Special rules:**
1. Some invoices have only an `exempted` column (all zero-rated products)
2. Some invoices have both `exempted` + `taxable` columns (mixed invoice)
3. For `exempted` items: `buyPlusVat = exempted / qty` (no ×1.15)
4. For `taxable` items: `buyPlusVat = taxable / qty × 1.15`
5. Check which columns are present before calculating

**Gotchas:**
- Do not assume all products on a Kool Food invoice are zero-rated — verify each line

---

### Supplier: Pillay R Frozen

**Category:** Frozen Products
**Supabase supplier_name:** `Pillay R Frozen`

**VAT treatment:**
- **ALL products are zero-rated** — never apply 15% VAT

**Special rules:**
1. `buyPlusVat = lineTotal / qty` (no ×1.15 on any item)
2. `recPrice = buyPlusVat × 1.2`

**Gotchas:**
- All frozen — exempt from VAT by Mauritius law

---

### Supplier: Li Wan Po

**Category:** General Grocery
**Supabase supplier_name:** `Li Wan Po`

**VAT treatment:**
- Line totals already include VAT (vatRate = 1.0)

**Special rules:**
1. `buyPlusVat = lineTotal / qty` (amounts already incl-VAT)
2. `recPrice = buyPlusVat × 1.2`

**Gotchas:**
- *(Update this section when more invoice details are available)*

---

### Supplier: International Distillers Ltd

**Category:** Alcoholic Beverages · Spirits
**Supabase supplier_name:** `International Distillers Ltd`

**Invoice columns (left → right on paper):**

| Field | Invoice header | Notes |
|---|---|---|
| `description` | Description | Product name |
| `qty` | Qty | Quantity |
| `price` | Price | Unit price **excl. VAT** |
| `vat` | VAT | Total VAT paid on the line |
| `total` | Total | Price + VAT (incl-VAT line total) |

**colOrder:** `["description", "qty", "price", "vat", "total"]`

**VAT treatment:**
- `Price` column = **excl. VAT**
- `VAT` column = total VAT amount paid on the line
- `Total` = Price + VAT (already incl-VAT)
- Standard 15% VAT applies

**Special rules:**
1. `buyPlusVat = price × 1.15` (Price column is excl-VAT — multiply by 1.15)
2. `recPrice = buyPlusVat × 1.2`
3. Alternatively: `buyPlusVat = total / qty` gives the same result since Total already includes VAT

**Gotchas:**
- The `Price` column is excl-VAT — always multiply by 1.15 to get the incl-VAT buy price
- Do NOT use the `Total` column without dividing by qty

---

### Supplier: Tea Blenders

**Category:** Tea · Hot Beverages
**Supabase supplier_name:** `Tea Blenders`

**VAT treatment:**
- Standard 15% applies to most products

**Special rules:**
1. Prices are handwritten and stored as `SHEET_REC` in the invoice JSON — not computed from columns
2. Do NOT attempt to compute `buyPlusVat` from columns — use the value given directly
3. `SHEET_REC` is keyed by product name: `{ "Lipton Yellow Label 100s": 285.50, ... }`

**Gotchas:**
- *(Update column details when next invoice is processed)*

---

### Supplier: Onsiong Brothers & Co. Ltd

**Category:** *(To be confirmed)*
**Supabase supplier_name:** `Onsiong Brothers & Co. Ltd`

**VAT treatment:**
- *(To be confirmed — update when invoice is reviewed)*

**Special rules:**
1. `recPrice = unitPrice × 1.2` (Price U × 1.2)
2. *(Remaining rules to be confirmed when invoice columns are reviewed)*

**Gotchas:**
- *(To be confirmed)*

---

### Supplier: Grays

**Category:** General Grocery / Household
**Supabase supplier_name:** `Grays`

**Invoice columns (left → right on paper):**

| Field | Invoice header | Notes |
|---|---|---|
| `qty` | Qty | Quantity |
| `description` | Description | Product name |
| `unitPriceExcl` | Unit Price Excl VAT | Unit price before VAT |
| `discount` | Discount | Discount amount |
| `vatPct` | VAT% | VAT percentage for the line |
| `totalUnitPrice` | Total Unit Price | Unit price **incl. VAT** (= unitPriceExcl × (1 + VAT%)) |
| `netVat` | Net VAT | Total VAT on the line |
| `netAmount` | Net Amount | Line total **incl. VAT** (= qty × totalUnitPrice) |
| `rsp` | RSP | Recommended Selling Price — printed on invoice, use directly |

**colOrder:** `["qty","description","unitPriceExcl","discount","vatPct","totalUnitPrice","netVat","netAmount","rsp"]`

**VAT treatment:**
- `netAmount` column = **incl-VAT line total** (`qty × totalUnitPrice`)
- `vatRate = 1.0` — **do NOT multiply by 1.15** (amount already includes VAT)
- Standard 15% VAT applies to most products

**Special rules:**
1. `buyPlusVat = netAmount / qty` — divide the incl-VAT line total by quantity to get per-unit incl-VAT price
2. `recPrice` = use the `RSP` column **directly** from the invoice — do **not** compute as `buyPlusVat × 1.2`
3. All three existing invoices in Supabase have `vatRate: 1.0` confirmed and corrected

**Gotchas:**
- Do NOT set `vatRate = 1.15` — `netAmount` already includes VAT; multiplying again causes double-VAT (~32% overcharge)
- Do NOT compute `recPrice` as `buyPlusVat × 1.2` — use the printed RSP column value directly
- Existing old-format invoices (cols/rows) have `amountCol: 7` (Net Amount, index 7 in the cols array)

---

### Supplier: Freelance Distributors

**Category:** General Grocery / Household / FMCG
**Supabase supplier_name:** `Freelance Distributors`

**Invoice columns (left → right on paper):**

| Field | Invoice header | Notes |
|---|---|---|
| `rsp` | RSP | **First column** — Recommended Selling Price from supplier |
| `item` | Item | Product code / SKU |
| `description` | Description | Product name |
| `ctns` | Ctns | Carton quantity |
| `units` | Units | Total individual units |
| `unitPrice` | Unit Price | Unit price **incl-VAT** |
| `vatPct` | VAT% | VAT percentage on the line |
| `discPct` | Disc% | Discount percentage |
| `total` | Total | Line total **incl-VAT** (= units × unitPrice after disc) |

**colOrder:** `["rsp","item","description","ctns","units","unitPrice","vatPct","discPct","total"]`

*(Do NOT include `buyPlusVat` or `recPrice` in colOrder.)*

**VAT treatment:**
- `unitPrice` and `total` columns are **incl-VAT** already
- `vatRate = 1.0` — do NOT multiply by 1.15
- Mixed VAT: some products at 15% (`vatPct = 15`), some at 0% (check `vatPct` column per row)

**Special rules:**
1. `buyPlusVat = total / units` — line total incl-VAT divided by unit count
2. `recPrice = buyPlusVat × 1.2` (standard 20% margin)
3. The invoice already carries `rsp` — this is the supplier's recommended retail price (for reference only, not used as `recPrice`)

**Totals keys used by Freelance:**
- `totalBeforeVat` → "Excl. VAT"
- `subTotalInclLineDisc` → "Subtotal (after disc.)"
- `totalVatAmount` → "VAT"
- `totalIncVat` → "Total Incl. VAT" ← **this is the grand total**

**Gotchas:**
- `rsp` is the **first** column — `colOrder` must start with `"rsp"`
- The grand total key is `totalIncVat` (note: NOT `totalInclVat`) — both are now handled by `normalizeTotals`
- Do not confuse `ctns` (cartons) with `units` (individual pieces) — `buyPlusVat` divides by `units`

---

### Supplier: Vaulbert (HVC Ltd)

**Category:** Canned fish · Sauces · General Grocery
**Supabase supplier_name:** `Vaulbert`

**Invoice columns (left → right on paper):**

| Field | Invoice header | Notes |
|---|---|---|
| `gtin` | GTIN | Barcode |
| `description` | Description | Product name |
| `no` | No. | Product code (e.g. `0660148`, `IT000074`) |
| `qty` | QTY | **Counts CARTONS when UOM is CAR-style, pieces when UOM = Piece** |
| `uom` | UOM | `CAR12 PCS` / `CAR 24PCS` = carton of N · `Piece` = individual |
| `unitPriceExclVat` | Unit Price Excl. VAT | **PER CARTON** when UOM is CAR-style |
| `disc` | Dis% | Line discount, e.g. `-3%` — must be applied into buyPlusVat |
| `lineAmountExclVat` | Line Amount Excl. VAT | Line total after discount |
| `vatId` | VAT ID | `Z` = zero-rated · `S` = standard 15% |

**colOrder:** `["gtin","description","no","qty","uom","unitPriceExclVat","disc","lineAmountExclVat","vatId"]`

**VAT treatment:**
- `vatId = Z` (pilchards, canned fish) → zero-rated, NO 15%
- `vatId = S` → multiply by 1.15 for buyPlusVat

**Special rules:**
1. UOM `CAR12 PCS` / `CAR 24PCS` = 1 carton of 12 / 24 pieces; QTY counts cartons
2. `buyPlusVat` = **carton price as billed** (unit price × (1+disc), ×1.15 only when vatId=S) — store at CARTON level; the app divides by the UOM pack count automatically
3. `recPrice = buyPlusVat × 1.2` (also carton level)

**Gotchas:**
- Invoices SI25919 (carton-level buyPlusVat) and SI26635 (pre-divided) were processed inconsistently — the app now auto-detects both, but going forward ALWAYS store carton level
- Do not read the pack count from the description (it has none) — it lives in the UOM column
- Older keyed invoices carry extra `Pack` and `Price/Unit` columns — `Price/Unit` is the per-piece price, already discounted

---

### Supplier: Dywada (Dywada Worldwide Co Ltd)

**Category:** Korean noodles · Household
**Supabase supplier_name:** `Dywada`

**Invoice columns (left → right on paper):**

| Field | Invoice header | Notes |
|---|---|---|
| `code` | Code | e.g. `ND-KR-03` |
| `description` | Description | Product name |
| `qty` | Qty | **Counts CARTONS** |
| `uom` | UOM | `CTN 40U` = carton of 40 units |
| `totalUnits` | Total Qty | qty × units-per-carton (pieces) |
| `unitPriceExcl` | Unit Price (Excl.) | **PER PIECE**, excl. VAT |
| `pricePerCtn` | Price per CTN | Per carton, excl. VAT |
| `totalExcl` | Total (Excl.) | Line total excl. VAT |
| `vatPct` | VAT | Per-row percent: `0` or `15` |
| `totalInclVat` | Total (Incl.) | Line total incl. VAT |
| `pricePerUnit` | Price/Unit | **PER PIECE, INCL-VAT — the buying price** |

**colOrder:** `["code","description","qty","uom","totalUnits","unitPriceExcl","pricePerCtn","totalExcl","vatPct","totalInclVat","pricePerUnit"]`

**VAT treatment:**
- Per-row `VAT` percent column: noodles mostly `0`, household items `15`
- `Price/Unit` already includes VAT — `vatRate = 1.0`, never multiply again

**Special rules:**
1. `buyPlusVat` = the `Price/Unit` column value directly (per piece, incl-VAT) — set `packDivisionApplied = false`
2. `recPrice = buyPlusVat × 1.2`
3. UOM `CTN 40U` = carton of 40; `Total Qty` = pieces — use as cross-check: `Price/Unit × Total Qty ≈ Total (Incl.)`

**Gotchas:**
- `Unit Price (Excl.)` is per PIECE but `Price per CTN` is per carton — do not mix them up
- The amount column for the app is `Total (Incl.)` — incl-VAT

---

### Supplier: Tenfa Marketing Ltd

**Category:** Sweets · Confectionery
**Supabase supplier_name:** `Tenfa Marketing Ltd`

**Invoice columns (left → right on paper):**

| Field | Invoice header | Notes |
|---|---|---|
| `qty` | Qty | **Counts BOXES when UOM is BTE/CTN-style** |
| `uom` | UOM | `BTE18`/`BTE24`/`BTE12` (boîte of N) · `CTN12` · `Unit` |
| `description` | Description | Often carries pack in parentheses: `"(20)"`, `"(6*18)"` |
| `unitPrice` | Unit Price | **PER BOX** when UOM is BTE/CTN-style |
| `vatPct` | VAT % | 15 on most items |
| `amount` | Amount | Line total |

**colOrder:** `["qty","uom","description","unitPrice","vatPct","amount"]`

**VAT treatment:**
- `vatPct = 15` on most items — verify whether the printed prices already include VAT before adding 15% (existing processed invoices treated them as incl-VAT)

**Special rules:**
1. UOM `BTE18` = box of 18, `CTN12` = carton of 12; when UOM = `Unit`, the pack count is the number in parentheses in the description (`"TENFA GUMMY POP (20)"` → 20)
2. **This supplier's existing invoices store `buyPlusVat` PER PIECE** (box price ÷ N) — keep doing it per piece for consistency, and set `packDivisionApplied = true`
3. `recPrice = buyPlusVat × 1.2`

**Gotchas:**
- `"(6*18)"` in a description means 6 inner packs × 18 — the box count is the UOM number (BTE18 → 18), not 6×18
- This is the ONE carton-UOM supplier that stores per-piece buyPlusVat (historical consistency) — the app's ratio guard handles it either way, but stay consistent
