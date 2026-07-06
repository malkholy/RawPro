import { useState } from "react"
import { STATUS_COLORS } from "./api.js"

// ── Badge ──────────────────────────────────────────────────
export function Badge({ label }) {
  const s = STATUS_COLORS[label] || { bg: "#f1f5f9", color: "#64748b" }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "4px 10px", borderRadius: 20,
      fontSize: 12, fontWeight: 700,
      background: s.bg, color: s.color,
    }}>{label}</span>
  )
}

// ── Btn ────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = "primary", size = "md", disabled, style = {} }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 7,
    borderRadius: 9, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    border: "none", fontFamily: "inherit", transition: "0.15s",
    opacity: disabled ? 0.5 : 1,
    padding: size === "sm" ? "7px 13px" : "10px 18px",
    fontSize: size === "sm" ? 13 : 14,
  }
  const variants = {
    primary: { background: "#f97316", color: "white" },
    outline: { background: "white", color: "#1a2535", border: "1px solid #e4e9f0" },
    danger:  { background: "#fee2e2", color: "#991b1b" },
  }
  return (
    <button style={{ ...base, ...variants[variant], ...style }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

// ── Modal ──────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, width = 560 }) {
  if (!open) return null
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div style={{
        background: "white", borderRadius: 18,
        width, maxWidth: "95vw", maxHeight: "90vh",
        overflowY: "auto", animation: "slideUp 0.22s ease",
      }}>
        <div style={{
          padding: "22px 26px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #e4e9f0",
          position: "sticky", top: 0, background: "white", zIndex: 2,
        }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: 8,
            border: "1px solid #e4e9f0", background: "white",
            cursor: "pointer", fontSize: 18, color: "#64748b",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>
        <div style={{ padding: "24px 26px" }}>{children}</div>
        {footer && (
          <div style={{
            padding: "16px 26px", borderTop: "1px solid #e4e9f0",
            display: "flex", justifyContent: "flex-end", gap: 10,
          }}>{footer}</div>
        )}
      </div>
    </div>
  )
}

// ── FormGrid ───────────────────────────────────────────────
export function FormGrid({ children }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>{children}</div>
}

export function Field({ label, full, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: full ? "1/-1" : undefined }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>{label}</label>
      {children}
    </div>
  )
}

export function Input({ value, onChange, placeholder, type = "text", style = {} }) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{
        fontFamily: "inherit", fontSize: 14, padding: "11px 14px",
        border: "1.5px solid #e4e9f0", borderRadius: 9,
        background: "white", color: "#1a2535", transition: "0.15s",
        outline: "none", ...style,
      }}
      onFocus={e => e.target.style.borderColor = "#f97316"}
      onBlur={e => e.target.style.borderColor = "#e4e9f0"}
    />
  )
}

export function Select({ value, onChange, children, style = {} }) {
  return (
    <select
      value={value} onChange={onChange}
      style={{
        fontFamily: "inherit", fontSize: 14, padding: "11px 14px",
        border: "1.5px solid #e4e9f0", borderRadius: 9,
        background: "white", color: "#1a2535", cursor: "pointer", ...style,
      }}
    >{children}</select>
  )
}

export function Textarea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value} onChange={onChange} placeholder={placeholder}
      style={{
        fontFamily: "inherit", fontSize: 14, padding: "11px 14px",
        border: "1.5px solid #e4e9f0", borderRadius: 9, background: "white",
        color: "#1a2535", resize: "vertical", minHeight: 72, transition: "0.15s",
      }}
      onFocus={e => e.target.style.borderColor = "#f97316"}
      onBlur={e => e.target.style.borderColor = "#e4e9f0"}
    />
  )
}

// ── KPI Card ───────────────────────────────────────────────
export function KPICard({ label, value, sub, icon, accent = "#f97316" }) {
  return (
    <div style={{
      background: "white", borderRadius: 14, padding: "22px 24px",
      boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: "1px solid #e4e9f0",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: 4, height: "100%", background: accent,
      }} />
      <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8, letterSpacing: -1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>{sub}</div>}
      {icon && (
        <div style={{
          position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)",
          fontSize: 36, opacity: 0.08,
        }}>{icon}</div>
      )}
    </div>
  )
}

// ── Section Card ───────────────────────────────────────────
export function SectionCard({ title, action, children, style = {} }) {
  return (
    <div style={{
      background: "white", borderRadius: 14,
      boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
      border: "1px solid #e4e9f0", overflow: "hidden",
      marginBottom: 24, ...style,
    }}>
      {title && (
        <div style={{
          padding: "18px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #e4e9f0",
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ── Data Table ─────────────────────────────────────────────
export function DataTable({ columns, rows, loading, emptyText = "No data found" }) {
  if (loading) return (
    <div style={{ textAlign: "center", padding: "50px 20px", color: "#64748b" }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>Loading...
    </div>
  )
  if (!rows?.length) return (
    <div style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
      <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.4 }}>📭</div>
      <p>{emptyText}</p>
    </div>
  )
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} style={{
                textAlign: "left", background: "#f8fafc", color: "#64748b",
                padding: "12px 16px", fontSize: 12, fontWeight: 700,
                letterSpacing: 0.5, borderBottom: "1px solid #e4e9f0",
                whiteSpace: "nowrap",
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ cursor: "default" }}
              onMouseEnter={e => [...e.currentTarget.cells].forEach(c => c.style.background = "#f8fafc")}
              onMouseLeave={e => [...e.currentTarget.cells].forEach(c => c.style.background = "transparent")}
            >
              {columns.map(c => (
                <td key={c.key} style={{
                  padding: "13px 16px", fontSize: 14,
                  borderBottom: i < rows.length - 1 ? "1px solid #f1f4f8" : "none",
                  whiteSpace: c.wrap ? "normal" : "nowrap",
                }}>
                  {c.render ? c.render(row[c.key], row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Tabs ───────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{
      display: "flex", gap: 4,
      borderBottom: "1px solid #e4e9f0",
      padding: "0 24px",
      overflowX: "auto",
    }}>
      {tabs.map(t => (
        <div key={t.key} onClick={() => onChange(t.key)} style={{
          padding: "12px 18px", fontSize: 14, fontWeight: 600,
          color: active === t.key ? "#f97316" : "#64748b",
          borderBottom: active === t.key ? "2px solid #f97316" : "2px solid transparent",
          marginBottom: -1, cursor: "pointer", whiteSpace: "nowrap", transition: "0.15s",
        }}>{t.label}</div>
      ))}
    </div>
  )
}

// ── Invoice Lines Editor ───────────────────────────────────
export function LinesEditor({ lines, onChange }) {
  const fmt2 = (n) => (parseFloat(n) || 0).toFixed(2)
  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.Qty) || 0) * (parseFloat(l.UnitPrice) || 0), 0)

  const update = (i, field, val) => {
    const next = lines.map((l, idx) => idx === i ? { ...l, [field]: val } : l)
    onChange(next)
  }
  const add = () => onChange([...lines, { Line: lines.length + 1, ItemDescription: "", Qty: "", UnitPrice: "" }])
  const remove = (i) => onChange(lines.filter((_, idx) => idx !== i).map((l, idx) => ({ ...l, Line: idx + 1 })))

  return (
    <div style={{ border: "1.5px solid #e4e9f0", borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
      <div style={{
        background: "#f8fafc", padding: "10px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid #e4e9f0",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>ITEMS</span>
        <Btn variant="outline" size="sm" onClick={add}>+ Add Line</Btn>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["#", "Item Description", "Qty", "Unit Price", "Total", ""].map(h => (
              <th key={h} style={{
                textAlign: "left", padding: "9px 12px", fontSize: 12,
                fontWeight: 700, color: "#64748b", background: "#f8fafc",
                borderBottom: "1px solid #e4e9f0",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((ln, i) => {
            const total = (parseFloat(ln.Qty) || 0) * (parseFloat(ln.UnitPrice) || 0)
            return (
              <tr key={i} style={{ borderBottom: "1px solid #f1f4f8" }}>
                <td style={{ padding: "7px 12px", fontSize: 13, color: "#94a3b8", width: 32 }}>{i + 1}</td>
                <td style={{ padding: "7px 8px" }}>
                  <Input value={ln.ItemDescription} placeholder="Item description"
                    onChange={e => update(i, "ItemDescription", e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", fontSize: 13 }} />
                </td>
                <td style={{ padding: "7px 8px", width: 80 }}>
                  <Input type="number" value={ln.Qty} placeholder="0"
                    onChange={e => update(i, "Qty", e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", fontSize: 13 }} />
                </td>
                <td style={{ padding: "7px 8px", width: 110 }}>
                  <Input type="number" value={ln.UnitPrice} placeholder="0.00"
                    onChange={e => update(i, "UnitPrice", e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", fontSize: 13 }} />
                </td>
                <td style={{ padding: "7px 12px", fontSize: 14, fontWeight: 700, width: 100 }}>
                  ${fmt2(total)}
                </td>
                <td style={{ padding: "7px 8px", width: 36 }}>
                  <button onClick={() => remove(i)} style={{
                    background: "#fee2e2", color: "#991b1b", border: "none",
                    borderRadius: 6, width: 28, height: 28, cursor: "pointer",
                    fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}>✕</button>
                </td>
              </tr>
            )
          })}
          {lines.length === 0 && (
            <tr><td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
              No lines yet — click + Add Line
            </td></tr>
          )}
        </tbody>
      </table>

      <div style={{
        padding: "12px 16px", borderTop: "1px solid #e4e9f0",
        display: "flex", justifyContent: "flex-end", background: "#fafbfc",
      }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Subtotal</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>
            ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  )
}
