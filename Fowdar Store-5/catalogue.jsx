// ===========================================================
// Fowdar Store — Supplier catalogue + cart panel
// ===========================================================

const CatalogueScreen = ({
  supplier,
  products,
  cart,
  onChangeQty,
  onClearCart,
  onSubmitOrder,
  onBack,
  showFab,
  onOpenCart,
}) => {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | popular | reorder

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter((p) => {
      if (term && !p.name.toLowerCase().includes(term)) return false;
      if (filter === "popular") return !!p.popular;
      if (filter === "reorder") return daysSince(p.last_ordered) >= 7;
      return true;
    });
  }, [products, q, filter]);

  const supplierCart = useMemo(() => {
    return Object.entries(cart)
      .map(([pid, qty]) => {
        const p = products.find((x) => x.id === pid);
        return p ? { ...p, qty } : null;
      })
      .filter(Boolean);
  }, [cart, products]);

  const subtotal = supplierCart.reduce((s, it) => s + it.qty * it.price, 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;
  const itemCount = supplierCart.reduce((s, it) => s + it.qty, 0);

  return (
    <div>
      <button className="brand-back" onClick={onBack} style={{ marginBottom: 14 }}>
        <Icon.ArrowLeft /> All suppliers
      </button>

      <div className="catalogue-head">
        <div className="supplier-emoji">{supplier.glyph}</div>
        <div>
          <h2>{supplier.name}</h2>
          <div className="meta-line">
            {supplier.account}
            <span className="dot">·</span>
            {supplier.category}
            <span className="dot">·</span>
            Lead time {supplier.lead_time.toLowerCase()}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="section-label" style={{ margin: 0 }}>Items</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600 }}>{products.length}</div>
        </div>
      </div>

      <div className="catalogue-layout">
        <div>
          <div className="controls-row">
            <div className="search">
              <Icon.Search />
              <input
                className="field"
                placeholder={`Search ${supplier.name.split(" ")[0]} catalogue…`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <button className={`chip ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
              All items
            </button>
            <button className={`chip ${filter === "popular" ? "active" : ""}`} onClick={() => setFilter("popular")}>
              Frequently ordered
            </button>
            <button className={`chip ${filter === "reorder" ? "active" : ""}`} onClick={() => setFilter("reorder")}>
              Due to reorder
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="glyph">📦</div>
              <h3>No matching items</h3>
              <p>Try clearing the filter or searching for something else.</p>
            </div>
          ) : (
            <div className="product-list">
              {filtered.map((p) => {
                const qty = cart[p.id] || 0;
                return (
                  <div key={p.id} className={`product-row ${qty > 0 ? "in-cart" : ""}`}>
                    <div>
                      <h4 className="product-name">{p.name}</h4>
                      <div className="product-meta">
                        <span>{p.pack}</span>
                        {p.popular && <span style={{ color: "var(--accent)" }}>· popular</span>}
                        <span className="last-ordered">last {relativeDay(p.last_ordered)}</span>
                      </div>
                    </div>
                    <div className="product-pack">
                      <span className="label">Pack</span>
                      <span>{p.pack.split(" × ")[0]} per {p.unit}</span>
                    </div>
                    <div className="product-price">
                      <span className="label">Price / {p.unit}</span>
                      <span className="value">{fmtMUR(p.price)}</span>
                    </div>
                    <QtyStepper value={qty} onChange={(v) => onChangeQty(p.id, v)} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <CartSummary
          supplier={supplier}
          items={supplierCart}
          subtotal={subtotal}
          vat={vat}
          total={total}
          onChangeQty={onChangeQty}
          onClearCart={onClearCart}
          onSubmitOrder={onSubmitOrder}
        />
      </div>

      {showFab && itemCount > 0 && (
        <button className="fab-cart show" onClick={onOpenCart}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon.Cart />
            Review order
            <span className="count">{itemCount}</span>
          </span>
          <span style={{ fontFamily: "var(--font-mono)" }}>{fmtMUR(total)}</span>
        </button>
      )}
    </div>
  );
};

const CartSummary = ({ supplier, items, subtotal, vat, total, onChangeQty, onClearCart, onSubmitOrder }) => {
  if (items.length === 0) {
    return (
      <aside className="cart-summary">
        <h3>Current order <span className="count">0 items</span></h3>
        <div className="cart-empty">
          <div>Nothing in the order yet.</div>
          <div className="hint">Tap <Icon.Plus /> on a product to add it.</div>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-faint)", lineHeight: 1.5 }}>
          Orders to <strong style={{ color: "var(--text-dim)" }}>{supplier.name}</strong> are typically delivered within {supplier.lead_time.toLowerCase()}.
        </div>
      </aside>
    );
  }

  return (
    <aside className="cart-summary">
      <h3>
        Current order
        <span className="count">{items.length} line{items.length !== 1 ? "s" : ""}</span>
      </h3>

      <div className="cart-list">
        {items.map((it) => (
          <div key={it.id} className="cart-item">
            <div>
              <div className="name">{it.name}</div>
              <div className="meta">{it.qty} × {fmtMURcompact(it.price)} · {it.pack.split(" × ")[0]}/{it.unit}</div>
            </div>
            <div>
              <div className="line-total">{fmtMUR(it.qty * it.price)}</div>
              <button className="remove" onClick={() => onChangeQty(it.id, 0)}>remove</button>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-totals">
        <div className="line">
          <span>Subtotal</span>
          <span>{fmtMUR(subtotal)}</span>
        </div>
        <div className="line">
          <span>VAT (15%)</span>
          <span>{fmtMUR(vat)}</span>
        </div>
        <div className="line grand">
          <span>Total</span>
          <span className="amount">{fmtMUR(total)}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClearCart} style={{ flex: "0 0 auto" }}>
          Clear
        </button>
        <button className="btn btn-primary" onClick={onSubmitOrder} style={{ flex: 1, justifyContent: "center" }}>
          <Icon.Send />
          Send to {supplier.name.split(" ")[0]}
        </button>
      </div>
    </aside>
  );
};

window.CatalogueScreen = CatalogueScreen;
window.CartSummary = CartSummary;
