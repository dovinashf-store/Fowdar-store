# Supplier-Specific Rules

Each supplier has quirks in their invoice format or pricing logic. All of these are handled in `calcRec()` in `index_1.html`.

---

## VKS Company (butcher)

**Invoice columns**: Description, Qty/kg, Unit Price, Exempted, Taxable  
**Qty column**: index 1 (`qtyKg` — weight in kg)  
**Amount column**: index 4 (`taxable` — excl-VAT line total for taxable items)

### Old format (cols/rows)
```json
{
  "cols": ["Description", "Qty/kg", "Unit Price", "Exempted", "Taxable"],
  "rows": [["Boneless Mutton", 27.2, 525, 0, 14280]],
  "qtyCol": 1,
  "amountCol": 4,
  "vatRate": 1.15
}
```
`vatRate = 1.15` because `Taxable` column is excl-VAT; multiply by 1.15 for incl-VAT price.

### New format (items)
```json
{
  "items": [{
    "description": "Boneless Mutton",
    "qtyKg": 27.2,
    "unitPrice": 525,
    "exempted": 0,
    "taxable": 14280,
    "vatType": "Taxable",
    "buyPlusVat": 603.75,
    "recPrice": 724.50
  }]
}
```
`buyPlusVat = 14280 / 27.2 × 1.15 = 603.75`

### Zero-rated products at VKS
Sadia, Edendale, or any frozen products sold by VKS are zero-rated:
```json
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
```
`buyPlusVat = 1300 / 10 = 130` (no ×1.15)

### Totals format
```json
{
  "totalExempted": 1300,
  "totalTaxable": 14280,
  "vat15": 2142,
  "grossTotal": 17722
}
```

---

## Quality Beverages Limited (QBL)

Snacks, drinks, confectionery. Uses items format.

**Amount column**: typically `total` (incl-VAT line total)  
**Pack sizes common**: `"70GX24"`, `"300MLX24"`, `"1.5LTX6"` etc.  
**VAT**: standard 15% on most products

```json
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
}
```

`buyPlusVat = 1463.95` (full pack of 24). App shows `1463.95 / 24 = 60.99` per unit.

---

## Edendale Distributors

Frozen chicken and dairy. **All products zero-rated** — never apply 15% VAT.

Uses items format. `vatType: "Exempt"` on all items.

---

## Innodis

**Qty notation**: cartons e.g. `"2CT"` (2 cartons)  
**Product name**: includes `"×N"` for units per carton e.g. `"Rich Tea Biscuit ×36"` = 36 units/carton

```javascript
// calcRec() rule 6:
const ctQty = parseFloat("2CT") || 1;     // = 2
const match = prodName.match(/[xX]([0-9]+)/);
const unitsPerCtn = match ? parseInt(match[1]) : 1;  // = 36
const totalUnits = ctQty * unitsPerCtn;   // = 72
const price = (lineTotal / totalUnits) * vatRate;
```

---

## RR Rapid Service

**Special rule**: items sold by the dozen.  
`meta.recPriceRule = "per_unit_dozen"`, `meta.dozSize = 12`

```javascript
// calcRec() rule 2:
const dozSize = supMeta.dozSize || 12;
buyPlusVat = (lineTotal / qty / dozSize) * vatRate;
```

---

## BrandActiv / IBL

**Unit price column**: `"Unit prc excl Vat"` (excl-VAT)  
**Discounted price**: `"Unit disc prc excl Vat"` (prefer this when discounted)  
**VAT**: per-row `"VAT %"` column (0% or 15% depending on product)

```javascript
// calcRec() rule 3:
const rowVat = parseFloat(row[vatPctIdx]) || 0;
const vatMult = rowVat > 0 ? (1 + rowVat / 100) : 1.0;
buyPlusVat = unitExclPrice * vatMult;
```

---

## Lim How Brothers

**Unit price column**: `"Price (Ex)"` (excl-VAT)

```javascript
// calcRec() rule 4:
buyPlusVat = parseFloat(row[priceExIdx]) * vatRate;
```

---

## Cadi Fortune

Amounts already incl-VAT. Direct divide by qty.

```javascript
// calcRec() rule 5:
buyPlusVat = lineTotal / qty;
```

---

## Panagora

Two invoices (`ARCINV002297601`, `ARCINV002298901`) were manually set to `vatRate=1.0` in Supabase because their amount columns already include VAT.

---

## Kool Food

Mixed invoices:
- Some have `Exempted` column only (frozen/dairy products)
- Some have both `Exempted` and `Taxable` columns

The `amountCol` varies by invoice — always check column names, don't assume.

Invoice 15674 had `amountCol` corrected from index 3 → 4 in Supabase (it was pointing to the wrong column).

---

## Tea Blenders

Uses `SHEET_REC` (handwritten prices) because the invoice format doesn't have a reliable unit price column.

```json
{
  "SHEET_REC": {
    "Lipton Yellow Label 100s": 285.50,
    "Brooke Bond 250g": 142.00
  }
}
```

`calcRec()` rule 1 checks `SHEET_REC` first, keyed by:
1. `row[0]` (product code in col 0)
2. Row index `ri`
3. `row[1]` trimmed (product name in col 1)

---

## Pillay R Frozen

All products are frozen. Zero-rated — never apply 15% VAT.  
Invoice CN/2026/3397 was corrected to `vatRate=1.0` in Supabase.

---

## Li Wan Po

General grocery. Invoice LWP-A056208 corrected to `vatRate=1.0` in Supabase.

---

## Intl Distillers

Alcoholic beverages. Invoice I060000949 corrected to `vatRate=1.0` in Supabase.

---

## Adding a new supplier

1. Create a row in `fowdar_invoices` with `supplier_name`, `meta`, and an empty `invoices` array
2. If the supplier has a unique pricing structure, add a rule to `calcRec()` (rules 3–6 area)
3. Add the supplier name to this document
4. Test with a sample invoice

If the supplier uses the standard items format with `buyPlusVat` pre-computed, no code changes are needed — rule 1 (`_precomputed`) handles it automatically.
