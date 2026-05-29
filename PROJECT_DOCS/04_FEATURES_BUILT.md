# Features Built — Claude Code Session Log

A complete record of every feature and fix implemented in Claude Code sessions, with line references in `index_1.html`.

---

## Session 1 — Core App

### Invoice viewer
- Two-format invoice normalisation (`normalizeInv`) — handles both old cols/rows and new AI items format
- Dynamic column detection — reads ALL fields from `items[0]`, never hardcodes columns
- Buy+VAT column (`calcRec`) — 9-rule priority chain per supplier
- Rec Price column — `buyPlusVat × 1.2`
- Invoice totals footer (`normalizeTotals`) — handles both array and object formats
- `detectPackSize()` — 3 patterns (A/B/C) for extracting pack count from description
- `detectVatRate()` — auto-detects 1.0 vs 1.15 for old invoices without stored vatRate
- Date handling — `toISODate()` for sorting, `fmtDD()` for display
- Edit mode for invoices

### Price Tracker (original)
- `buildPriceHistory()` — builds price history per supplier/product
- `extractPriceTrackerValue()` — consistent incl-VAT metric for change detection
- Price change cards showing Was/Now/Diff
- KPI strip: Up count, Down count, Tracked count

### Orders module
- Catalogue view with categories
- Order history
- Supplier list

### Payments module

---

## Session 2 — VAT Audit

### Problem identified
Multiple invoices had `vatRate=1.15` when their amount columns already included VAT, causing double-VAT inflation of ~32%.

### Fix applied
Audited all invoices in Supabase. Corrected to `vatRate=1.0` in Supabase for:

| Supplier | Invoice IDs |
|---|---|
| Quality Beverages Limited | PSI26/00128447, PSI26/00128451 |
| Edendale Distributors | edendale-MV0110012414, MV0210010629 |
| Innodis | MDPDIX10002334 |
| Intl Distillers | I060000949 |
| RR Rapid Service | rr-rapid-607501, 608676 |
| Panagora | ARCINV002297601, ARCINV002298901 |
| Li Wan Po | LWP-A056208 |
| Pillay R Frozen | CN/2026/3397 |
| Kool Food | invoice 15674 (also fixed amountCol 3→4) |

### Safety net added to `calcRec()`
Rule 8 fallback: if `amountCol` column name contains `"incl.vat / total incl / inc vat / amount incl"` → override `effectiveVat = 1.0` regardless of stored `vatRate`.

---

## Session 3 — Three Major Features

### Task 1 — Invoice column order matches paper invoice

**Problem**: The app sorted columns using `ITEM_FIELD_ORDER` heuristic, which didn't match the paper invoice's actual left-to-right order.

**Solution**:

1. **`normalizeInv()` updated** (lines ~1598–1614): added `colOrder` support.
   - If `inv.colOrder` is present and non-empty → sort `displayFields` using `colOrder` as the primary key
   - Fields not in `colOrder` fall back to `ITEM_FIELD_ORDER` position (sorted after colOrder fields)
   - Fallback: if no `colOrder` → existing `ITEM_FIELD_ORDER` heuristic (unchanged)

2. **`INVOICE_PROCESSING_PROMPT.md` updated**: added `colOrder` as a required field in the AI-generated JSON structure, with instructions on how to build it and a concrete example.

### Task 2 — Grand total always visible at invoice footer

**Problem**: If `inv.totals` was empty (or the array had no rows), no footer was shown at all — the grand total was invisible.

**Solution**: Invoice tfoot render updated (~lines 2590–2630 in the invoice detail view).

- Last row of totals is now prominently styled:
  - Background: `rgba(138,255,122,0.08)` (green tint)
  - Top border: `2px solid rgba(138,255,122,0.32)` (green)
  - Larger font: 14px bold vs 12px for other rows
  - Amount column: `fontSize: 14, fontWeight: 800`

- **Fallback**: if `totals` array is empty but `inv.total > 0` → synthesise a `["Grand Total", inv.total]` row

### Task 3 — Price Tracker interactive sort, filter & amendment tracking

**New Supabase table**: `price_amendments` (see `01_SUPABASE_SCHEMA.md`)

**New functions**:
- `fetchAmendments()` (line 2086) — loads all amendment records from Supabase
- `upsertAmendment(sn, pn, invoiceId, amended, amendedAt)` (line 2099) — persists an amendment

**New state variables** (in App component):
```javascript
const [priceSortBy,        setPriceSortBy]        = React.useState("date");
const [priceSortDir,       setPriceSortDir]       = React.useState("desc");
const [priceAmendFilter,   setPriceAmendFilter]   = React.useState("all");
const [amendments,         setAmendments]         = React.useState({});
```

**Amended to `useEffect` initial load**: `fetchAmendments().then(...)` called alongside `loadSuppliers()`.

**Amended to `refreshData`**: re-fetches amendments on every manual refresh.

**Prices screen rebuilt** (screen === "prices"):

Key structure:
```
<div>
  <BackBar title="Price Tracker" />

  {/* Sticky control bar — top: 62 (sits just below BackBar) */}
  <div style={{ position: "sticky", top: 62, zIndex: 150 }}>
    {/* Row 1: SortBtn Date | Price | Name | Supplier + Reset button */}
    {/* Row 2: Amendment filter All | Pending | Amended + summary counter */}
  </div>

  <div style={{ padding: "12px 10px" }}>
    {/* KPI strip: Up / Down / Tracked */}
    {/* Search input */}
    {/* SortPills: Changes Only / All Products */}
    {/* Price change cards */}
  </div>
</div>
```

**Sorting**:
- **Date** (default desc): newest invoice first; amended items sink to bottom in "all" view
- **Price**: sorts by `|diff|` (magnitude of change) — ties broken by date
- **Name**: alphabetical product name
- **Supplier**: alphabetical supplier name
- Toggle direction by clicking same sort button again

**Amendment filter**:
- **All**: shows all price changes; amended items dimmed to `opacity: 0.55` and pushed to bottom
- **Pending**: shows only non-amended items
- **Amended**: shows only amended items

**Summary counter**: `"N changes — M pending"` — clicking the pending count sets filter to "pending"

**Amendment button on each card** (min height 44px for touch target):
- Green `✓ Done` when amended
- Amber `● Pending` when not amended
- Clicking toggles the state and persists to Supabase

**Amended cards**: show `"Amended: 28/05/2026 10:00"` timestamp

**Reset button**: appears when any filter deviates from default (`sortBy !== "date" || sortDir !== "desc" || amendFilter !== "all" || priceFilter !== "changed" || search !== ""`)

**Amendment key format**: `"supplierName||productName||invoiceId"` — unique per price-change event

---

## CSS Bug Fixed (Session 3)

**Line 3573** — home screen safe-area bottom padding had a missing `)`:
```javascript
// Wrong:
"max(40px,calc(40px + env(safe-area-inset-bottom))"
// Correct:
"max(40px,calc(40px + env(safe-area-inset-bottom)))"
```
This caused iOS safe-area bottom inset to fall back to 40px on notched devices.

---

## Features Implemented Summary

| Feature | Status | Key lines |
|---|---|---|
| Two-format invoice normalisation | ✅ | `normalizeInv` line 1576 |
| Dynamic column detection (items format) | ✅ | Line 1595–1616 |
| `colOrder` support for paper invoice column order | ✅ | Lines 1598–1614 |
| Buy+VAT / Rec Price columns | ✅ | `calcRec` line 1703 |
| Price tracker extraction | ✅ | `extractPriceTrackerValue` line 1842 |
| Pack size detection (3 patterns) | ✅ | `detectPackSize` line 1469 |
| VAT rate safety net | ✅ | `calcRec` rule 8 / `detectVatRate` |
| Invoice grand total always visible | ✅ | tfoot render ~line 2590 |
| Grand total prominent styling | ✅ | Last tfoot row green tint/bold |
| `price_amendments` Supabase table | ✅ | See schema doc |
| `fetchAmendments` / `upsertAmendment` | ✅ | Lines 2086, 2099 |
| Price tracker sort (Date/Price/Name/Supplier) | ✅ | Prices screen |
| Price tracker direction toggle | ✅ | Prices screen |
| Amendment filter (All/Pending/Amended) | ✅ | Prices screen |
| Summary counter "N changes — M pending" | ✅ | Prices screen |
| Amended items dimmed + pushed to bottom | ✅ | Prices screen sort logic |
| Touch-target amendment button (44px) | ✅ | Each price card |
| Amendment timestamp display | ✅ | Amended cards |
| Reset button when filters active | ✅ | Prices screen |
| `INVOICE_PROCESSING_PROMPT.md` updated with `colOrder` | ✅ | Prompt file |
| CSS safe-area bottom bug fixed | ✅ | Line 3573 |
