// ===========================================================
// Fowdar Store — Shared UI primitives & icons
// ===========================================================

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ---------- Currency ----------
const fmtMUR = (n) => {
  if (n == null) return "—";
  return "MUR " + Number(n).toLocaleString("en-MU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmtMURcompact = (n) => {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-MU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// ---------- Date helpers ----------
const daysSince = (isoDate) => {
  if (!isoDate) return null;
  const then = new Date(isoDate);
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
};

const relativeDay = (isoDate) => {
  const n = daysSince(isoDate);
  if (n === 0) return "today";
  if (n === 1) return "yesterday";
  if (n < 7) return `${n}d ago`;
  if (n < 30) return `${Math.floor(n / 7)}w ago`;
  return `${Math.floor(n / 30)}mo ago`;
};

// ---------- Icons (inline SVG, currentColor) ----------
const Icon = {
  Search: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="7" cy="7" r="5" />
      <path d="M11 11l3 3" strokeLinecap="round" />
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 8a6 6 0 1 1-1.76-4.24" />
      <path d="M14 2v3.5h-3.5" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 2.5L3 6l4.5 3.5" />
      <path d="M3 6h7" />
    </svg>
  ),
  Chevron: () => (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 2.5L8 6l-3.5 3.5" />
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M8 3v10M3 8h10" />
    </svg>
  ),
  Minus: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M3 8h10" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  ),
  Filter: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h12M4 8h8M6 13h4" />
    </svg>
  ),
  Cart: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h2l1.5 8h7l1.5-6H4.5" />
      <circle cx="6.5" cy="13.5" r="1" />
      <circle cx="11.5" cy="13.5" r="1" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5L6.5 12 13 4.5" />
    </svg>
  ),
  Send: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2L2 7l5 2 2 5z" />
      <path d="M7 9l4-4" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2 1.5" />
    </svg>
  ),
};

// ---------- Status chip ----------
const StatusChip = ({ status }) => {
  const labels = {
    draft: "Draft",
    pending: "Sent",
    confirmed: "Confirmed",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return (
    <span className={`status ${status}`}>
      <span className="dot"></span>
      {labels[status] || status}
    </span>
  );
};

// ---------- Quantity stepper ----------
const QtyStepper = ({ value, onChange, min = 0, max = 99 }) => {
  const inCart = value > 0;
  return (
    <div className={`qty ${inCart ? "in-cart" : "empty"}`}>
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease">
        <Icon.Minus />
      </button>
      <div className="value">{value}</div>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase">
        <Icon.Plus />
      </button>
    </div>
  );
};

// ---------- Toast ----------
const Toast = ({ message }) => {
  if (!message) return null;
  return <div className="toast">{message}</div>;
};

// expose
Object.assign(window, {
  fmtMUR, fmtMURcompact, daysSince, relativeDay,
  Icon, StatusChip, QtyStepper, Toast,
});
