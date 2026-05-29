# Invoice Processing Prompt
# Paste everything below this line into Claude chat together with the invoice photo.
# ─────────────────────────────────────────────────────────────────────────────────────────

Process this invoice image and return a single JSON object in the exact format below.
Store it in Supabase table `fowdar_invoices`, supplier_name column matching the supplier,
inside the `invoices` JSONB array.

---

## Required JSON structure

```json
{
  "id": "<invoice number from the document — if none, generate as supplier-DDMMYYYY>",
  "date": "<invoice date as YYYY-MM-DD>",
  "receivedAt": "<today's date and time as ISO 8601, e.g. 2026-05-26T10:30:00Z>",
  "items": [
    {
      "description": "<product name exactly as on invoice>",
      "qty": "<number — quantity ordered>",
      "unitPrice": "<number — unit price as printed on invoice>",
      "<any other columns on the invoice>": "<value>",
      "buyPlusVat": "<number — see calculation rules below>",
      "recPrice": "<number — buyPlusVat × 1.2, rounded to 2 dp>"
    }
  ],
  "totals": {
    "<key>": "<value>"
  },
  "colOrder": ["<field1>", "<field2>", "..."]
}
```

The `colOrder` array is **required**. List every field name that appears on the paper invoice, in the exact **left-to-right** order of the printed columns. Do **not** include `buyPlusVat` or `recPrice`.

---

## buyPlusVat calculation rules — READ CAREFULLY

`buyPlusVat` = the **incl-VAT cost per the full pack** as sold by the supplier.
`recPrice` = `buyPlusVat × 1.2` (20% margin for the store).

### Step 1 — Find the correct line amount

- **"Total Incl. VAT" or "Total" column** → use it directly (do NOT multiply by 1.15 again)
- **"Amount Excl. VAT" or "Net" column only** → multiply by 1.15 (but see zero-rated rule)
- **Per-unit price only** → `unit_price × qty`, then apply VAT rule

### Step 2 — Divide by quantity

`buyPlusVat = line_amount_incl_vat / qty`  — gives the **per-pack** buying price incl. VAT.

### Step 3 — Zero-rated products (IMPORTANT — do NOT add 15%)

Never multiply by 1.15 for:
- Frozen chicken and poultry (Sadia, Edendale, nuggets, wings, thighs…)
- Fresh/frozen fish and seafood
- Dairy products (milk, cheese, butter, yoghurt)
- Rice, flour, bread
- Any item marked "Exempt" or "0% VAT" on the invoice

For zero-rated items: `buyPlusVat = line_amount / qty` (no ×1.15)

### Step 4 — Pack size (CRITICAL — do NOT pre-divide)

Leave `buyPlusVat` at the **per-pack level**. The app divides automatically.

- `"Doritos BBQ 70GX24"` → buyPlusVat = cost for the whole pack of 24
- `"20 X 45g"` → 20 units per pack
- `"300X30"` → 30 units per pack (smaller number = count)
- `"12X1L"` → 12 units per pack

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

- `date`: always `YYYY-MM-DD`
- `receivedAt`: today's full ISO datetime e.g. `"2026-05-26T10:30:00Z"`

---

## Checklist before submitting

- [ ] `id` is the invoice number (or generated if blank)
- [ ] `date` is YYYY-MM-DD
- [ ] `receivedAt` is today's ISO datetime
- [ ] Every column from the invoice is included as a field
- [ ] `buyPlusVat` is incl-VAT cost at pack level (not per unit, not divided by pack count)
- [ ] Zero-rated products have `buyPlusVat = line_total / qty` (no ×1.15)
- [ ] `recPrice = buyPlusVat × 1.2`
- [ ] `totals` uses descriptive key names from the preferred list
- [ ] `buyPlusVat` and `recPrice` are the last two fields on each item
- [ ] `colOrder` lists every invoice column in left-to-right paper order

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
