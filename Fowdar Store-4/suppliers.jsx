// ===========================================================
// Fowdar Store — Suppliers directory screen
// ===========================================================

const SuppliersScreen = ({ suppliers, onOpenSupplier }) => {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | recent | overdue

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (term && !s.name.toLowerCase().includes(term) && !s.category.toLowerCase().includes(term)) {
        return false;
      }
      if (filter === "recent") return daysSince(s.last_order) <= 7;
      if (filter === "overdue") return daysSince(s.last_order) > 10;
      return true;
    });
  }, [suppliers, q, filter]);

  return (
    <div>
      <h1 className="section-label">Suppliers</h1>
      <div className="page-head">
        <div>
          <h1 style={{ marginBottom: 0 }}>Browse suppliers</h1>
          <div className="sub">Pick a supplier to start a new order, or build a master list from any catalogue.</div>
        </div>
      </div>

      <div className="controls-row">
        <div className="search">
          <Icon.Search />
          <input
            className="field"
            placeholder="Search suppliers, categories…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button className={`chip ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
          All <span style={{ color: "var(--text-faint)" }}>·</span> {suppliers.length}
        </button>
        <button className={`chip ${filter === "recent" ? "active" : ""}`} onClick={() => setFilter("recent")}>
          Ordered this week
        </button>
        <button className={`chip ${filter === "overdue" ? "active" : ""}`} onClick={() => setFilter("overdue")}>
          Overdue (10d+)
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="glyph">🔎</div>
          <h3>No suppliers match</h3>
          <p>Try a different search or filter.</p>
        </div>
      ) : (
        <div className="supplier-grid">
          {filtered.map((s) => (
            <div key={s.id} className="card hoverable supplier-card" onClick={() => onOpenSupplier(s.id)}>
              <div className="supplier-emoji">{s.glyph}</div>
              <div className="supplier-info">
                <h3 className="name">{s.name}</h3>
                <div className="meta">
                  {s.category}
                  <span className="dot">·</span>
                  {s.lead_time}
                </div>
              </div>
              <div className="supplier-status">
                <div className="item-count">{s.items} items</div>
                <div>last ordered {relativeDay(s.last_order)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

window.SuppliersScreen = SuppliersScreen;
