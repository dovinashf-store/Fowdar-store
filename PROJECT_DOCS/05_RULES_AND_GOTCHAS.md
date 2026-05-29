# Rules and Gotchas

Critical rules that must never be violated, and common mistakes to avoid.

---

## 1. The vatRate trap — most dangerous bug

### The rule
`vatRate = 1.0` → amount column **already includes** VAT — do NOT multiply by 1.15 again.  
`vatRate = 1.15` → amount column is **excl-VAT** — multiply by 1.15 to get incl-VAT price.

### The trap
If you set `vatRate = 1.15` on an invoice where the amount column is already incl-VAT, every price is inflated by ~32%:
- `1000 × 1.15 = 1150` instead of `1000`

### How to verify which vatRate is correct
Check: `row_total ≈ qty × unit_price`?
- YES → amount is already incl-VAT → `vatRate = 1.0`
- NO → `row_total ≈ qty × unit_price × 1.15`? → excl-VAT → `vatRate = 1.15`

### The safety net
`calcRec()` rule 8: if the `amountCol` column name contains `"incl.vat"`, `"total incl"`, `"inc vat"`, or `"amount incl"` → override `effectiveVat = 1.0` regardless of stored value.

### Audited invoices
All known incorrect `vatRate=1.15` invoices were corrected to `1.0` in Supabase. See `04_FEATURES_BUILT.md` → Session 2 for the complete list.

---

## 2. Zero-rated products — never apply 15% VAT

The following product categories are **zero-rated in Mauritius**. Never multiply their amounts by 1.15:

- Frozen chicken and poultry (Sadia, Edendale, any frozen chicken nuggets, wings, thighs)
- Fresh/frozen fish and seafood
- Dairy products (milk, cheese, butter, yoghurt)
- Rice, flour, bread
- Any product the invoice marks as "Exempt" or "0% VAT"

For these: `buyPlusVat = line_amount / qty` (no ×1.15).

---

## 3. Pack size — always divide

When `detectPackSize(description)` returns a value N > 1, always divide the buying price by N to get per-unit price.

```
"Doritos BBQ 70GX24" → N=24
buyPlusVat at pack level = 1463.95
Per-unit buying price = 1463.95 / 24 = 60.99
```

**NEVER pre-divide `buyPlusVat` when generating invoice JSON.** The app does it. Always store `buyPlusVat` at the full-pack level.

---

## 4. Date handling — always normalise

```javascript
// ❌ Wrong — "22/05/2026" > "2026-05-18" alphabetically, breaks sorting
invoices.sort((a,b) => a.date.localeCompare(b.date))

// ✅ Correct — toISODate() normalises both formats
invoices.sort((a,b) => toISODate(a.receivedAt||a.date).localeCompare(
                        toISODate(b.receivedAt||b.date)))
```

```javascript
// ❌ Wrong — shows raw ISO to user
<td>{inv.date}</td>

// ✅ Correct — fmtDD() produces DD/MM/YYYY
<td>{fmtDD(inv.date)}</td>
```

---

## 5. Dynamic column reading — never hardcode

```javascript
// ❌ Wrong — ignores columns the AI included
const qty = item.qty;
const price = item.price;

// ✅ Correct — read ALL keys dynamically
const displayFields = Object.keys(firstItem).filter(k => !ITEM_META_FIELDS[k]);
```

---

## 6. normalizeTotals — always call it

```javascript
// ❌ Wrong — totals might be object {exclVat:1273,...} not array
inv.totals.map(t => ...)

// ✅ Correct — normalizeTotals handles both formats
normalizeTotals(inv.totals).map(t => ...)
```

---

## 7. New totals keys — add to TOTAL_LABELS + KEY_ORDER only

When a new supplier invoice introduces a totals key not yet supported:

```javascript
// ✅ In normalizeTotals():
var TOTAL_LABELS = {
  // ... existing ...
  myNewKey: "My New Label",   // ← add here
};
var KEY_ORDER = [
  // ... existing ...
  "myNewKey",                  // ← add at correct position
];
```

No other code changes needed. Unknown keys auto-format via camelCase → "Title Words" as a fallback anyway.

---

## 8. Supabase upsert requires Prefer header

```javascript
// ❌ Wrong — will create a duplicate row
fetch(url, { method: "POST", body: JSON.stringify(data) })

// ✅ Correct — merges on unique constraint (supplier_name, product_name, invoice_id)
fetch(url, {
  method: "POST",
  headers: { "Prefer": "resolution=merge-duplicates" },
  body: JSON.stringify(data)
})
```

---

## 9. JSX in Babel standalone — paren counting is unreliable

The app uses Babel standalone for JSX. CSS strings inside JSX attributes contain parentheses that look like JS parens to naive raw-text parsers. Don't rely on raw character counts to verify JS balance. Babel will report actual syntax errors if code is broken.

Known issue: line 3573 historically had a CSS string `"max(40px,calc(40px + env(safe-area-inset-bottom))"` missing one `)` — this is a CSS bug, not a JS syntax error. Fixed in session 3.

---

## 10. The app has no build step

- Edit `index_1.html` directly
- Reload the browser tab to see changes
- No npm install, no webpack, no compilation
- All React 18 and Babel are loaded via CDN
- Deploy by uploading `index_1.html` to Netlify

---

## 11. Supabase REST headers required on every request

```javascript
const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": "Bearer " + SUPABASE_KEY
};
// For writes:
headers["Content-Type"] = "application/json";
```

Never omit `apikey` and `Authorization` — requests will return 401.

---

## 12. `colOrder` field — must list paper-invoice columns only

When generating `colOrder` in the AI prompt:
- Include field names that correspond to actual invoice columns
- **Do NOT include** `buyPlusVat` or `recPrice` (they are computed meta-fields)
- List in the exact left-to-right order of the printed columns
- Fields not in `colOrder` sort to the end (still displayed)

---

## 13. Amendment key format

The amendment key in the `amendments` state object is:
```
"supplierName||productName||invoiceId"
```

Must use `||` as separator. Generated consistently in:
- `fetchAmendments()` → when loading from Supabase
- The price tracker screen → when building `flagged[]` array
- `toggleAmendment()` → when reading/writing

---

## 14. Innodis quantity parsing

Innodis invoices use qty like `"2CT"` (2 cartons) and product names like `"Biscuit X36"` (36 units per carton).

```javascript
const ctQty = parseFloat("2CT") || 1;     // = 2
const match = "Biscuit X36".match(/[xX]([0-9]+)/);
const unitsPerCtn = match ? parseInt(match[1]) : 1;  // = 36
const totalUnits = ctQty * unitsPerCtn;  // = 72
const pricePerUnit = (lineTotal / totalUnits) * vatRate;
```

---

## 15. BrandActiv VAT is per-row, not invoice-level

BrandActiv / IBL invoices have a "VAT %" column on each row — some products may be 0%, others 15%. The `calcRec()` rule 3 reads the per-row VAT% column, not the invoice-level `vatRate`.

```javascript
const rowVat = vatPctIdx >= 0 ? (parseFloat(row[vatPctIdx]) || 0) : 0;
const vatMult = rowVat > 0 ? (1 + rowVat / 100) : 1.0;
```
