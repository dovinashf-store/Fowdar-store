// ===========================================================
// Fowdar Store — Order module root
// ===========================================================

const { suppliers, products, orders: seedOrders } = window.FOWDAR_DATA;

function App() {
  // Navigation: 'suppliers' | 'catalogue' | 'history'
  const [view, setView] = useState("suppliers");
  const [activeSupplierId, setActiveSupplierId] = useState(null);
  const [activeOrderId, setActiveOrderId] = useState(null);

  // Carts keyed by supplier id: { [supplierId]: { [productId]: qty } }
  const [carts, setCarts] = useState({});

  // Orders list (history)
  const [orders, setOrders] = useState(seedOrders);

  // Toast
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  // ---------- Derived ----------
  const totalCartLines = useMemo(() => {
    let n = 0;
    Object.values(carts).forEach((c) => (n += Object.keys(c).length));
    return n;
  }, [carts]);

  const totalCartValue = useMemo(() => {
    let v = 0;
    Object.entries(carts).forEach(([sid, c]) => {
      const ps = products[sid] || [];
      Object.entries(c).forEach(([pid, qty]) => {
        const p = ps.find((x) => x.id === pid);
        if (p) v += p.price * qty;
      });
    });
    return v * 1.15; // include VAT
  }, [carts]);

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === "pending").length,
    [orders]
  );

  // ---------- Actions ----------
  const openSupplier = (id) => {
    setActiveSupplierId(id);
    setView("catalogue");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const backToSuppliers = () => {
    setActiveSupplierId(null);
    setView("suppliers");
  };

  const setQty = (supplierId, productId, qty) => {
    setCarts((prev) => {
      const next = { ...prev };
      const c = { ...(next[supplierId] || {}) };
      if (qty <= 0) delete c[productId];
      else c[productId] = qty;
      if (Object.keys(c).length === 0) delete next[supplierId];
      else next[supplierId] = c;
      return next;
    });
  };

  const clearCart = (supplierId) => {
    setCarts((prev) => {
      const next = { ...prev };
      delete next[supplierId];
      return next;
    });
    setToast("Order cleared");
  };

  const submitOrder = (supplierId) => {
    const cart = carts[supplierId];
    if (!cart || Object.keys(cart).length === 0) return;
    const supplier = suppliers.find((s) => s.id === supplierId);
    const ps = products[supplierId] || [];
    const items = Object.entries(cart).map(([pid, qty]) => {
      const p = ps.find((x) => x.id === pid);
      return {
        name: p.name,
        qty,
        unit_price: p.price,
        pack: p.pack,
      };
    });
    const idNum = 185 + (orders.length - seedOrders.length);
    const newOrder = {
      id: `PO-2026-0${idNum}`,
      supplier_id: supplierId,
      created: new Date().toISOString().slice(0, 10),
      status: "pending",
      items,
      timeline: [
        { label: "Draft created", time: "Just now", state: "done" },
        { label: "Sent to supplier", time: "Just now", state: "current" },
        { label: "Confirmed by supplier", time: "—", state: "pending" },
        { label: "Out for delivery", time: "—", state: "pending" },
        { label: "Delivered", time: "—", state: "pending" },
      ],
    };
    setOrders((o) => [newOrder, ...o]);
    setCarts((prev) => {
      const next = { ...prev };
      delete next[supplierId];
      return next;
    });
    setToast(`Order sent to ${supplier.name}`);
    setView("history");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reorder = (oldOrder) => {
    const sid = oldOrder.supplier_id;
    const ps = products[sid] || [];
    const newCart = {};
    oldOrder.items.forEach((it) => {
      const match = ps.find((p) => p.name === it.name);
      if (match) newCart[match.id] = it.qty;
    });
    setCarts((prev) => ({ ...prev, [sid]: newCart }));
    setActiveSupplierId(sid);
    setActiveOrderId(null);
    setView("catalogue");
    setToast("Items added to a new order");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---------- View routing ----------
  const activeSupplier = suppliers.find((s) => s.id === activeSupplierId);
  const activeOrder = orders.find((o) => o.id === activeOrderId);

  // Tabs
  const tabs = [
    { key: "suppliers", label: "Suppliers", count: suppliers.length },
    { key: "history", label: "Orders", count: pendingCount > 0 ? pendingCount : null, badgePending: pendingCount > 0 },
  ];

  return (
    <div className="app" data-screen-label="Order Module">
      <header className="appbar">
        <div className="appbar-inner">
          <div className="brand-row">
            <button className="brand-back" onClick={() => setToast("This would return to the Fowdar Store home")}>
              <Icon.ArrowLeft /> Fowdar Store
            </button>
            <h1 className="brand-title">Order</h1>
            <p className="brand-sub">Customer orders &amp; weekly purchasing · Veer Bisham Fowdar Trading Co. Ltd.</p>
          </div>
          <div className="appbar-meta">
            <div className="totals">
              <div className="label">Open Order Value</div>
              <div className="value">{fmtMUR(totalCartValue || 0)}</div>
            </div>
            <button className="refresh-btn" title="Refresh">
              <Icon.Refresh />
            </button>
          </div>
        </div>
        <nav className="tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={view === t.key || (t.key === "suppliers" && view === "catalogue")}
              className={`tab ${(view === t.key || (t.key === "suppliers" && view === "catalogue")) ? "active" : ""}`}
              onClick={() => {
                if (t.key === "suppliers") backToSuppliers();
                else setView(t.key);
              }}
            >
              {t.label}
              {t.count != null && (
                <span className="count">{t.count}</span>
              )}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center", padding: "6px 0" }}>
            {totalCartLines > 0 && (
              <button className="chip active" onClick={() => {
                const firstSid = Object.keys(carts)[0];
                if (firstSid) {
                  setActiveSupplierId(firstSid);
                  setView("catalogue");
                }
              }}>
                <Icon.Cart /> {totalCartLines} line{totalCartLines !== 1 ? "s" : ""} drafting
              </button>
            )}
          </div>
        </nav>
      </header>

      <main className="page">
        {view === "suppliers" && (
          <SuppliersScreen
            suppliers={suppliers}
            onOpenSupplier={openSupplier}
          />
        )}
        {view === "catalogue" && activeSupplier && (
          <CatalogueScreen
            supplier={activeSupplier}
            products={products[activeSupplier.id] || []}
            cart={carts[activeSupplier.id] || {}}
            onChangeQty={(pid, v) => setQty(activeSupplier.id, pid, v)}
            onClearCart={() => clearCart(activeSupplier.id)}
            onSubmitOrder={() => submitOrder(activeSupplier.id)}
            onBack={backToSuppliers}
            showFab={true}
            onOpenCart={() => submitOrder(activeSupplier.id)}
          />
        )}
        {view === "history" && (
          <HistoryScreen
            orders={orders}
            suppliers={suppliers}
            onOpenOrder={(id) => setActiveOrderId(id)}
            onReorder={reorder}
          />
        )}
      </main>

      {activeOrder && (
        <OrderDrawer
          order={activeOrder}
          supplier={suppliers.find((s) => s.id === activeOrder.supplier_id)}
          onClose={() => setActiveOrderId(null)}
          onReorder={(o) => {
            setActiveOrderId(null);
            reorder(o);
          }}
        />
      )}

      <Toast message={toast} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
