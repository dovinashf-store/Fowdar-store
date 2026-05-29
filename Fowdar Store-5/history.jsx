// ===========================================================
// Fowdar Store — Order history & detail drawer
// ===========================================================

const HistoryScreen = ({ orders, suppliers, onOpenOrder, onReorder }) => {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const supplierById = useMemo(() => {
    const m = {};
    suppliers.forEach((s) => (m[s.id] = s));
    return m;
  }, [suppliers]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (term) {
        const s = supplierById[o.supplier_id];
        const hay = `${o.id} ${s ? s.name : ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [orders, q, statusFilter, supplierById]);

  const counts = useMemo(() => {
    const c = { all: orders.length, pending: 0, confirmed: 0, delivered: 0, cancelled: 0 };
    orders.forEach((o) => (c[o.status] = (c[o.status] || 0) + 1));
    return c;
  }, [orders]);

  return (
    <div>
      <h1 className="section-label">Order History</h1>
      <div className="page-head">
        <div>
          <h1 style={{ marginBottom: 0 }}>Recent orders</h1>
          <div className="sub">Track every purchase order. Tap any row to see status & details.</div>
        </div>
      </div>

      <div className="controls-row">
        <div className="search">
          <Icon.Search />
          <input
            className="field"
            placeholder="Search by order ID or supplier…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {[
          ["all", "All", counts.all],
          ["pending", "Sent", counts.pending],
          ["confirmed", "Confirmed", counts.confirmed],
          ["delivered", "Delivered", counts.delivered],
          ["cancelled", "Cancelled", counts.cancelled],
        ].map(([key, label, n]) => (
          <button
            key={key}
            className={`chip ${statusFilter === key ? "active" : ""}`}
            onClick={() => setStatusFilter(key)}
          >
            {label} <span style={{ color: "var(--text-faint)", marginLeft: 4 }}>{n}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="glyph">📋</div>
          <h3>No orders match</h3>
          <p>Try changing the status filter or search term.</p>
        </div>
      ) : (
        <div className="order-list">
          {filtered.map((o) => {
            const s = supplierById[o.supplier_id];
            const subtotal = o.items.reduce((sum, it) => sum + it.qty * it.unit_price, 0);
            const total = subtotal * 1.15;
            return (
              <div key={o.id} className="card hoverable order-card" onClick={() => onOpenOrder(o.id)}>
                <span className="order-id">{o.id}</span>
                <div className="supplier-info-block">
                  <h4 className="supplier-name">{s ? s.name : "—"}</h4>
                  <div className="order-meta">
                    {o.items.length} line{o.items.length !== 1 ? "s" : ""}
                    <span className="dot">·</span>
                    {o.items.reduce((s, it) => s + it.qty, 0)} cases
                    <span className="dot">·</span>
                    {relativeDay(o.created)}
                  </div>
                </div>
                <StatusChip status={o.status} />
                <div className="order-total">{fmtMUR(total)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---------- Order detail drawer ----------
const OrderDrawer = ({ order, supplier, onClose, onReorder }) => {
  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  if (!order) return null;
  const subtotal = order.items.reduce((s, it) => s + it.qty * it.unit_price, 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2>{order.id}</h2>
              <StatusChip status={order.status} />
            </div>
            <div className="sub">
              {supplier ? supplier.name : "—"} · created {relativeDay(order.created)}
            </div>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">
            <Icon.X />
          </button>
        </div>

        <div className="drawer-body">
          <div>
            <div className="section-label">Status</div>
            <div className="timeline">
              {order.timeline.map((step, i) => (
                <div key={i} className={`tl-step ${step.state}`}>
                  <div className="label">{step.label}</div>
                  <div className="time">{step.time}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="section-label">Items</div>
            <div className="drawer-table">
              <div className="row header">
                <span>Product</span>
                <span className="qty-cell">Qty</span>
                <span className="total-cell">Line total</span>
              </div>
              {order.items.map((it, i) => (
                <div key={i} className="row">
                  <div>
                    <div style={{ fontWeight: 500 }}>{it.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                      {it.pack} · {fmtMUR(it.unit_price)}
                    </div>
                  </div>
                  <div className="qty-cell">{it.qty}</div>
                  <div className="total-cell">{fmtMUR(it.qty * it.unit_price)}</div>
                </div>
              ))}
              <div className="totals-row">
                <span>Subtotal</span>
                <span>{fmtMUR(subtotal)}</span>
              </div>
              <div className="totals-row">
                <span>VAT (15%)</span>
                <span>{fmtMUR(vat)}</span>
              </div>
              <div className="totals-row grand">
                <span>Total</span>
                <span className="amount">{fmtMUR(total)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
            {order.status === "delivered" && (
              <button className="btn btn-primary" onClick={() => onReorder(order)} style={{ marginLeft: "auto" }}>
                <Icon.Refresh />
                Reorder same items
              </button>
            )}
            {order.status === "pending" && (
              <button className="btn" style={{ marginLeft: "auto" }}>
                Edit draft
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

window.HistoryScreen = HistoryScreen;
window.OrderDrawer = OrderDrawer;
