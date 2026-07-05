# Fowdar Invoice Rulebook (compact v2.3)
MUR · VAT 15% · Output JSON for Supabase.

## ⚠️ APP CONTRACT — don't break (the "MUR 0.00" bug)

The dashboard displays/sums each invoice's top-level `total` — NOT `totals.netTotal`. Missing top-level `total` = MUR 0.00 bug. Every invoice MUST have:

- `total` — top-level number (sibling of `id`/`items`/`totals`) = final incl-VAT payable. This is what the app displays. Never skip it.
- `totals.netTotal` — same figure, inside totals. Set `total` = `totals.netTotal`.
- Items hold ONLY real printed columns + `buyPlusVat` + `recPrice`.
- NEVER emit `cols`, `colOrder`, `divisionConfidence`, `reviewNote`, `packDivisionApplied`, or `sellableUnitCost`.

**Self-check before every push:** `totals.netTotal` = `total`.

## READ & VERIFY FIRST — transcription accuracy

- Anchor every value to its row via the LN/leftmost-label column.
- Check row math before applying rules: qty × unit-excl ≈ line total excl; line total excl × vatPct ≈ printed VAT; line excl + VAT = line total incl.
- VAT% can be per-row and 0 — don't assume 15 everywhere.
- Printed VAT%/VAT-amount column is authoritative per row — never override with a product-category guess (e.g. "Burger Paneer" can print 15% despite being dairy-adjacent).
- Never back-solve an unreadable/crossed cell from the line total — re-read or flag instead.
- Line-wrapped names: continuation line belongs to the item it continues; trailing size/word belongs to item ABOVE, word on the LN/number line STARTS that item.
- Multi-page: totals box reprinted identically each page = grand total, don't double-count.
- Dot-matrix print (BrandActiv/IBL): watch digit pairs 8/0/6/B, 1/7/I, 5/6/S, 3/8, 0/D; decimals/commas can drop out; use vertical alignment to confirm.
- Finish by confirming (gross excl − discount) + total VAT = total amount. Flag non-reconciling rows in chat before pushing.

## JSON shape

```
{
  "id": "<invoice no | supplier-DDMMYYYY if blank>",
  "date": "YYYY-MM-DD",       // upload date, NOT printed date
  "receivedAt": "<today ISO>",
  "total": <final incl-VAT payable, TOP-LEVEL, REQUIRED>,
  "items": [ { "description","qty","unitPrice",<other printed cols>, "buyPlusVat","recPrice" } ],
  "totals": { "netTotal": <same as top-level total>, "exclVat":…, "vat15":…, "discount":… }
}
```

## Review flagging — chat only, never stored

Flag pack-division/price concerns in chat (e.g. "⚠️ Twisties at MUR 1.20/unit — possible bad pack division"). Never put flags into the JSON.

## VAT

- lineTotal ≈ qty×unitPrice → incl, use as-is. lineTotal ≈ qty×unitPrice×1.15 → excl, so ×1.15. Never ×1.15 an already-incl amount.
- Zero-rated → NEVER ×1.15; `buyPlusVat = lineTotal/qty`: frozen chicken/poultry, fish/seafood, dairy, staples (rice/flour/bread), anything Exempt/0%.

## PACK SIZE — buyPlusVat is always PER UNIT

Since `packDivisionApplied`/`reviewNote` are banned, the app has no flag to tell it the division state — **you must divide before writing the JSON**, so every `buyPlusVat` is per-unit, no exceptions.

- Pack count can be in the **description** (`70GX24`, `12X1L`) or in the **qty/UOM column** (`CAR12 PCS`, `CTN 40U`, `BTE18`, `CTN12`, `12 PCS/CTN`) — either means "1 pack/carton of N pieces," qty counts packs, not pieces.
- `buyPlusVat = (pack-level line price, after discount, VAT per that row's rule) / N` — always land on the per-piece cost.
- Don't divide when qty already counts individual pieces (UOM = `Piece`/`Unit`, no pack pattern in the description) or the unit price is already realistic per piece.
- `recPrice = buyPlusVat × 1.2` (20% margin), also per unit.
- Uncertain which level a price is at → flag in chat (per Review flagging above), never guess silently.
