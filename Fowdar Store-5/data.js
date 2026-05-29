// ===========================================================
// Fowdar Store — Mock data
// Mauritius grocery context, prices in MUR
// ===========================================================

window.FOWDAR_DATA = (function () {
  const today = new Date();
  const daysAgo = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  const suppliers = [
    {
      id: "sup_innodis",
      name: "Innodis Ltd",
      glyph: "🥩",
      category: "Meat, Dairy & Frozen",
      lead_time: "Next-day",
      account: "FS-INN-021",
      items: 184,
      last_order: daysAgo(3),
    },
    {
      id: "sup_phoenix",
      name: "Phoenix Beverages",
      glyph: "🍺",
      category: "Beverages",
      lead_time: "2 days",
      account: "FS-PBL-014",
      items: 96,
      last_order: daysAgo(6),
    },
    {
      id: "sup_panagora",
      name: "Panagora Marketing",
      glyph: "🥫",
      category: "Dry goods & pantry",
      lead_time: "Next-day",
      account: "FS-PAN-088",
      items: 212,
      last_order: daysAgo(2),
    },
    {
      id: "sup_quality",
      name: "Quality Beverages",
      glyph: "🧃",
      category: "Juices, water, soft drinks",
      lead_time: "Same-day",
      account: "FS-QBL-007",
      items: 64,
      last_order: daysAgo(1),
    },
    {
      id: "sup_ibl",
      name: "IBL Foods",
      glyph: "🌾",
      category: "Grains, rice, oils",
      lead_time: "2 days",
      account: "FS-IBL-033",
      items: 138,
      last_order: daysAgo(10),
    },
    {
      id: "sup_dairyvita",
      name: "Dairy Vita",
      glyph: "🥛",
      category: "Dairy & yogurts",
      lead_time: "Same-day",
      account: "FS-DV-002",
      items: 42,
      last_order: daysAgo(1),
    },
    {
      id: "sup_lottotech",
      name: "Lottotech Distribution",
      glyph: "🧴",
      category: "Cleaning & household",
      lead_time: "3 days",
      account: "FS-LT-115",
      items: 156,
      last_order: daysAgo(14),
    },
    {
      id: "sup_hapag",
      name: "Hapag Distribution",
      glyph: "🍫",
      category: "Snacks & confectionery",
      lead_time: "Next-day",
      account: "FS-HPG-046",
      items: 178,
      last_order: daysAgo(5),
    },
  ];

  // products keyed by supplier id
  const products = {
    sup_innodis: [
      { id: "p1",  name: "Chicken Whole Frozen 1.2kg",   pack: "12 × 1.2kg",  unit: "case",  price: 1820, last_ordered: daysAgo(3),  popular: true },
      { id: "p2",  name: "Beef Mince Premium 500g",      pack: "20 × 500g",   unit: "case",  price: 2640, last_ordered: daysAgo(3) },
      { id: "p3",  name: "Pork Sausage Breakfast 400g",  pack: "10 × 400g",   unit: "case",  price: 920,  last_ordered: daysAgo(10) },
      { id: "p4",  name: "Chicken Wings Frozen 1kg",     pack: "10 × 1kg",    unit: "case",  price: 1450, last_ordered: daysAgo(6), popular: true },
      { id: "p5",  name: "Beef Steak Sirloin 250g",      pack: "8 × 250g",    unit: "case",  price: 1980, last_ordered: daysAgo(17) },
      { id: "p6",  name: "Lamb Chops Frozen 500g",       pack: "10 × 500g",   unit: "case",  price: 3120, last_ordered: daysAgo(22) },
      { id: "p7",  name: "Chicken Fillets 1kg",          pack: "10 × 1kg",    unit: "case",  price: 1680, last_ordered: daysAgo(3), popular: true },
      { id: "p8",  name: "Frozen Mixed Veg 1kg",         pack: "12 × 1kg",    unit: "case",  price: 740,  last_ordered: daysAgo(4) },
      { id: "p9",  name: "Frozen French Fries 2.5kg",    pack: "4 × 2.5kg",   unit: "case",  price: 880,  last_ordered: daysAgo(7) },
      { id: "p10", name: "Frozen Prawns Peeled 1kg",     pack: "6 × 1kg",     unit: "case",  price: 4220, last_ordered: daysAgo(28) },
    ],
    sup_phoenix: [
      { id: "ph1", name: "Phoenix Lager 33cl",           pack: "24 × 33cl",   unit: "case",  price: 980,  last_ordered: daysAgo(6), popular: true },
      { id: "ph2", name: "Blue Marlin 33cl",             pack: "24 × 33cl",   unit: "case",  price: 1040, last_ordered: daysAgo(6) },
      { id: "ph3", name: "Stella Artois 33cl",           pack: "24 × 33cl",   unit: "case",  price: 1480, last_ordered: daysAgo(13) },
      { id: "ph4", name: "Phoenix Special 65cl",         pack: "12 × 65cl",   unit: "case",  price: 1120, last_ordered: daysAgo(6), popular: true },
      { id: "ph5", name: "Black Eagle 33cl",             pack: "24 × 33cl",   unit: "case",  price: 1180, last_ordered: daysAgo(20) },
      { id: "ph6", name: "Guinness 33cl",                pack: "24 × 33cl",   unit: "case",  price: 1620, last_ordered: daysAgo(9) },
    ],
    sup_panagora: [
      { id: "pa1", name: "Maggi Cubes Chicken 4g",       pack: "60 × 24 cubes", unit: "box", price: 1380, last_ordered: daysAgo(2), popular: true },
      { id: "pa2", name: "Maggi Cubes Beef 4g",          pack: "60 × 24 cubes", unit: "box", price: 1380, last_ordered: daysAgo(2) },
      { id: "pa3", name: "Nescafé Classic 200g",         pack: "12 × 200g",   unit: "case",  price: 3240, last_ordered: daysAgo(5) },
      { id: "pa4", name: "KitKat 4-finger 41.5g",        pack: "36 × 41.5g",  unit: "box",   price: 1620, last_ordered: daysAgo(8) },
      { id: "pa5", name: "Cerelac Wheat 400g",           pack: "12 × 400g",   unit: "case",  price: 2880, last_ordered: daysAgo(15) },
      { id: "pa6", name: "Nescafé 3-in-1 Sachets",       pack: "24 × 20 sachets", unit: "box", price: 2160, last_ordered: daysAgo(11) },
      { id: "pa7", name: "Nido Powder Milk 900g",        pack: "12 × 900g",   unit: "case",  price: 4680, last_ordered: daysAgo(4), popular: true },
      { id: "pa8", name: "Maggi 2-min Noodles 70g",      pack: "48 × 70g",    unit: "case",  price: 880,  last_ordered: daysAgo(2) },
    ],
    sup_quality: [
      { id: "q1",  name: "Crystal Water 1.5L",           pack: "6 × 1.5L",    unit: "pack",  price: 220,  last_ordered: daysAgo(1), popular: true },
      { id: "q2",  name: "Crystal Water 50cl",           pack: "24 × 50cl",   unit: "case",  price: 380,  last_ordered: daysAgo(1) },
      { id: "q3",  name: "Coca-Cola 1.5L",               pack: "6 × 1.5L",    unit: "pack",  price: 540,  last_ordered: daysAgo(3), popular: true },
      { id: "q4",  name: "Coca-Cola Zero 1.5L",          pack: "6 × 1.5L",    unit: "pack",  price: 540,  last_ordered: daysAgo(3) },
      { id: "q5",  name: "Fanta Orange 1.5L",            pack: "6 × 1.5L",    unit: "pack",  price: 540,  last_ordered: daysAgo(3) },
      { id: "q6",  name: "Sprite 1.5L",                  pack: "6 × 1.5L",    unit: "pack",  price: 540,  last_ordered: daysAgo(8) },
      { id: "q7",  name: "Goodlife Juice Orange 1L",     pack: "12 × 1L",     unit: "case",  price: 720,  last_ordered: daysAgo(4) },
    ],
    sup_ibl: [
      { id: "i1",  name: "Basmati Rice 5kg",             pack: "4 × 5kg",     unit: "case",  price: 1680, last_ordered: daysAgo(10), popular: true },
      { id: "i2",  name: "White Rice 25kg",              pack: "1 × 25kg",    unit: "bag",   price: 1340, last_ordered: daysAgo(10) },
      { id: "i3",  name: "Sunflower Oil 5L",             pack: "4 × 5L",      unit: "case",  price: 2240, last_ordered: daysAgo(12), popular: true },
      { id: "i4",  name: "Red Lentils 1kg",              pack: "20 × 1kg",    unit: "case",  price: 1240, last_ordered: daysAgo(15) },
      { id: "i5",  name: "Chickpeas Dry 1kg",            pack: "20 × 1kg",    unit: "case",  price: 980,  last_ordered: daysAgo(18) },
      { id: "i6",  name: "All-Purpose Flour 1kg",        pack: "20 × 1kg",    unit: "case",  price: 740,  last_ordered: daysAgo(10) },
      { id: "i7",  name: "Brown Sugar 1kg",              pack: "20 × 1kg",    unit: "case",  price: 820,  last_ordered: daysAgo(10) },
    ],
    sup_dairyvita: [
      { id: "d1",  name: "Fresh Milk Full Cream 1L",     pack: "12 × 1L",     unit: "case",  price: 580,  last_ordered: daysAgo(1), popular: true },
      { id: "d2",  name: "Yogurt Plain 125g",            pack: "24 × 125g",   unit: "case",  price: 480,  last_ordered: daysAgo(1) },
      { id: "d3",  name: "Yogurt Strawberry 125g",       pack: "24 × 125g",   unit: "case",  price: 520,  last_ordered: daysAgo(1) },
      { id: "d4",  name: "Butter Salted 250g",           pack: "20 × 250g",   unit: "case",  price: 1840, last_ordered: daysAgo(7) },
      { id: "d5",  name: "Cheddar Cheese Block 1kg",     pack: "6 × 1kg",     unit: "case",  price: 2640, last_ordered: daysAgo(7) },
    ],
    sup_lottotech: [
      { id: "l1",  name: "Toilet Paper 12-roll",         pack: "8 × 12-pack", unit: "case",  price: 1480, last_ordered: daysAgo(14), popular: true },
      { id: "l2",  name: "Dish Soap 500ml",              pack: "12 × 500ml",  unit: "case",  price: 540,  last_ordered: daysAgo(20) },
      { id: "l3",  name: "Laundry Powder 3kg",           pack: "4 × 3kg",     unit: "case",  price: 1240, last_ordered: daysAgo(14) },
      { id: "l4",  name: "Bleach 1L",                    pack: "12 × 1L",     unit: "case",  price: 380,  last_ordered: daysAgo(22) },
      { id: "l5",  name: "All-Purpose Cleaner 750ml",    pack: "12 × 750ml",  unit: "case",  price: 720,  last_ordered: daysAgo(14) },
    ],
    sup_hapag: [
      { id: "h1",  name: "Lay's Salted 150g",            pack: "20 × 150g",   unit: "case",  price: 1240, last_ordered: daysAgo(5), popular: true },
      { id: "h2",  name: "Cadbury Dairy Milk 90g",       pack: "24 × 90g",    unit: "case",  price: 1640, last_ordered: daysAgo(5) },
      { id: "h3",  name: "Oreo Original 137g",           pack: "20 × 137g",   unit: "case",  price: 980,  last_ordered: daysAgo(9) },
      { id: "h4",  name: "Pringles Original 165g",       pack: "12 × 165g",   unit: "case",  price: 1080, last_ordered: daysAgo(5) },
      { id: "h5",  name: "M&M's Peanut 45g",             pack: "24 × 45g",    unit: "case",  price: 720,  last_ordered: daysAgo(14) },
      { id: "h6",  name: "Tic Tac Mint 16g",             pack: "24 × 16g",    unit: "case",  price: 480,  last_ordered: daysAgo(20) },
    ],
  };

  // Order history
  const orders = [
    {
      id: "PO-2026-0184",
      supplier_id: "sup_quality",
      created: daysAgo(0),
      status: "pending",
      items: [
        { name: "Crystal Water 1.5L",   qty: 8, unit_price: 220, pack: "6 × 1.5L" },
        { name: "Coca-Cola 1.5L",       qty: 4, unit_price: 540, pack: "6 × 1.5L" },
        { name: "Goodlife Juice 1L",    qty: 2, unit_price: 720, pack: "12 × 1L" },
      ],
      timeline: [
        { label: "Draft created",   time: "Today, 09:14", state: "done" },
        { label: "Sent to supplier", time: "Today, 09:22", state: "current" },
        { label: "Confirmed by supplier", time: "—", state: "pending" },
        { label: "Out for delivery", time: "—", state: "pending" },
        { label: "Delivered",       time: "—", state: "pending" },
      ],
    },
    {
      id: "PO-2026-0183",
      supplier_id: "sup_innodis",
      created: daysAgo(1),
      status: "confirmed",
      items: [
        { name: "Chicken Whole Frozen 1.2kg", qty: 3, unit_price: 1820, pack: "12 × 1.2kg" },
        { name: "Chicken Fillets 1kg",       qty: 2, unit_price: 1680, pack: "10 × 1kg" },
        { name: "Beef Mince Premium 500g",   qty: 1, unit_price: 2640, pack: "20 × 500g" },
      ],
      timeline: [
        { label: "Draft created",   time: "Yesterday, 14:02", state: "done" },
        { label: "Sent to supplier", time: "Yesterday, 14:18", state: "done" },
        { label: "Confirmed by supplier", time: "Yesterday, 17:40", state: "current" },
        { label: "Out for delivery", time: "—", state: "pending" },
        { label: "Delivered",       time: "—", state: "pending" },
      ],
    },
    {
      id: "PO-2026-0182",
      supplier_id: "sup_dairyvita",
      created: daysAgo(1),
      status: "delivered",
      items: [
        { name: "Fresh Milk Full Cream 1L",  qty: 6, unit_price: 580, pack: "12 × 1L" },
        { name: "Yogurt Plain 125g",         qty: 4, unit_price: 480, pack: "24 × 125g" },
        { name: "Yogurt Strawberry 125g",    qty: 4, unit_price: 520, pack: "24 × 125g" },
        { name: "Butter Salted 250g",        qty: 1, unit_price: 1840, pack: "20 × 250g" },
      ],
      timeline: [
        { label: "Draft created",   time: "Yesterday, 07:30", state: "done" },
        { label: "Sent to supplier", time: "Yesterday, 07:34", state: "done" },
        { label: "Confirmed by supplier", time: "Yesterday, 08:12", state: "done" },
        { label: "Out for delivery", time: "Today, 06:40", state: "done" },
        { label: "Delivered",       time: "Today, 08:55", state: "done" },
      ],
    },
    {
      id: "PO-2026-0181",
      supplier_id: "sup_panagora",
      created: daysAgo(2),
      status: "delivered",
      items: [
        { name: "Maggi Cubes Chicken 4g",  qty: 2, unit_price: 1380, pack: "60 × 24 cubes" },
        { name: "Nescafé Classic 200g",    qty: 1, unit_price: 3240, pack: "12 × 200g" },
        { name: "Nido Powder Milk 900g",   qty: 1, unit_price: 4680, pack: "12 × 900g" },
      ],
      timeline: [
        { label: "Draft created",   time: "2 days ago, 11:00", state: "done" },
        { label: "Sent to supplier", time: "2 days ago, 11:08", state: "done" },
        { label: "Confirmed by supplier", time: "2 days ago, 13:20", state: "done" },
        { label: "Out for delivery", time: "Yesterday, 09:00", state: "done" },
        { label: "Delivered",       time: "Yesterday, 11:15", state: "done" },
      ],
    },
    {
      id: "PO-2026-0180",
      supplier_id: "sup_phoenix",
      created: daysAgo(6),
      status: "delivered",
      items: [
        { name: "Phoenix Lager 33cl",   qty: 6, unit_price: 980,  pack: "24 × 33cl" },
        { name: "Phoenix Special 65cl", qty: 2, unit_price: 1120, pack: "12 × 65cl" },
        { name: "Guinness 33cl",        qty: 1, unit_price: 1620, pack: "24 × 33cl" },
      ],
      timeline: [
        { label: "Draft created",   time: "6 days ago", state: "done" },
        { label: "Sent to supplier", time: "6 days ago", state: "done" },
        { label: "Confirmed by supplier", time: "6 days ago", state: "done" },
        { label: "Out for delivery", time: "4 days ago", state: "done" },
        { label: "Delivered",       time: "4 days ago", state: "done" },
      ],
    },
    {
      id: "PO-2026-0179",
      supplier_id: "sup_hapag",
      created: daysAgo(8),
      status: "cancelled",
      items: [
        { name: "Lay's Salted 150g",     qty: 3, unit_price: 1240, pack: "20 × 150g" },
        { name: "Cadbury Dairy Milk 90g", qty: 2, unit_price: 1640, pack: "24 × 90g" },
      ],
      timeline: [
        { label: "Draft created",   time: "8 days ago", state: "done" },
        { label: "Sent to supplier", time: "8 days ago", state: "done" },
        { label: "Cancelled by store", time: "7 days ago", state: "current" },
      ],
    },
  ];

  return { suppliers, products, orders };
})();
