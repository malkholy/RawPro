import { useState, useEffect } from "react"
import { apiCall, fmt, today } from "../../shared/api.js"
import { SectionCard, Btn, Tabs, Input, Select } from "../../shared/UI.jsx"

const CURRENT_YEAR = new Date().getFullYear()

function StmtTable({ rows, loading, type }) {
  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>⏳ Loading...</div>
  if (!rows.length) return <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Select a {type} and click Show Statement</div>

  let balance = 0
  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Date", "Due Date", "Reference", "Description",
              type === "vendor" ? "Debit (Invoice)" : "Debit (Invoice)",
              type === "vendor" ? "Credit (Payment)" : "Credit (Collection)",
              "Running Balance"].map(h => (
              <th key={h} style={{
                textAlign: "left", background: "#f8fafc", color: "#64748b",
                padding: "12px 16px", fontSize: 12, fontWeight: 700,
                borderBottom: "1px solid #e4e9f0", whiteSpace: "nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            balance += parseFloat(r.Debit || 0) - parseFloat(r.Credit || 0)
            const isOverdue = r.DueDate && r.DueDate < todayStr && parseFloat(r.Debit || 0) > 0
            const balColor  = balance > 0 ? "#991b1b" : balance < 0 ? "#16a34a" : "#64748b"
            const isLast    = i === rows.length - 1
            return (
              <tr key={i}
                onMouseEnter={e => [...e.currentTarget.cells].forEach(c => c.style.background = "#f8fafc")}
                onMouseLeave={e => [...e.currentTarget.cells].forEach(c => c.style.background = "transparent")}
              >
                <td style={{ padding: "13px 16px", fontSize: 14, borderBottom: isLast ? "none" : "1px solid #f1f4f8" }}>
                  {r.TxDate?.slice(0, 10)}
                </td>
                <td style={{ padding: "13px 16px", fontSize: 14, borderBottom: isLast ? "none" : "1px solid #f1f4f8" }}>
                  {r.DueDate ? (
                    <span style={{ color: isOverdue ? "#991b1b" : undefined, fontWeight: isOverdue ? 700 : undefined }}>
                      {r.DueDate.slice(0, 10)}{isOverdue ? " ⚠" : ""}
                    </span>
                  ) : <span style={{ color: "#94a3b8" }}>—</span>}
                </td>
                <td style={{ padding: "13px 16px", fontSize: 14, borderBottom: isLast ? "none" : "1px solid #f1f4f8" }}>
                  <strong>{r.Reference}</strong>
                </td>
                <td style={{ padding: "13px 16px", fontSize: 14, borderBottom: isLast ? "none" : "1px solid #f1f4f8" }}>
                  {r.Description}
                </td>
                <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 600, borderBottom: isLast ? "none" : "1px solid #f1f4f8" }}>
                  {parseFloat(r.Debit) > 0 ? fmt(r.Debit) : "—"}
                </td>
                <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 600, color: "#16a34a", borderBottom: isLast ? "none" : "1px solid #f1f4f8" }}>
                  {parseFloat(r.Credit) > 0 ? fmt(r.Credit) : "—"}
                </td>
                <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 800, color: balColor, borderBottom: isLast ? "none" : "1px solid #f1f4f8" }}>
                  {fmt(balance)}
                </td>
              </tr>
            )
          })}

          {/* Totals row */}
          <tr style={{ background: "#f8fafc" }}>
            <td colSpan={4} style={{ padding: "14px 16px", fontSize: 13, color: "#64748b", fontWeight: 700 }}>TOTAL</td>
            <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 800 }}>
              {fmt(rows.reduce((s, r) => s + parseFloat(r.Debit || 0), 0))}
            </td>
            <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 800, color: "#16a34a" }}>
              {fmt(rows.reduce((s, r) => s + parseFloat(r.Credit || 0), 0))}
            </td>
            <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 800,
              color: rows.reduce((s, r) => s + parseFloat(r.Debit || 0) - parseFloat(r.Credit || 0), 0) > 0 ? "#991b1b" : "#16a34a"
            }}>
              {fmt(rows.reduce((s, r) => s + parseFloat(r.Debit || 0) - parseFloat(r.Credit || 0), 0))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function StatementPanel({ type }) {
  const isVendor    = type === "vendor"
  const nameKey     = isVendor ? "VendorName" : "CustomerName"
  const listOp      = isVendor ? "Get Vendor List" : "Get Customer List"
  const stmtOp      = isVendor ? "Get Vendor Statement" : "Get Customer Statement"

  const [names, setNames]   = useState([])
  const [name, setName]     = useState("")
  const [from, setFrom]     = useState(`${CURRENT_YEAR}-01-01`)
  const [to, setTo]         = useState(`${CURRENT_YEAR}-12-31`)
  const [rows, setRows]     = useState([])
  const [loading, setLoading] = useState(false)
  const [shown, setShown]   = useState(false)

  useEffect(() => {
    apiCall(listOp).then(res => setNames((res.List0 || []).map(r => r[nameKey]))).catch(() => {})
  }, [])

  const load = async () => {
    if (!name) return alert(`Please select a ${isVendor ? "vendor" : "customer"}`)
    setLoading(true)
    setShown(true)
    try {
      const payload = { [nameKey]: name, FromDate: from, ToDate: to }
      const res = await apiCall(stmtOp, payload)
      setRows(res.List0 || [])
    } catch (e) { alert(e.message) }
    setLoading(false)
  }

  const print = () => {
    const totalDebit  = rows.reduce((s, r) => s + parseFloat(r.Debit  || 0), 0)
    const totalCredit = rows.reduce((s, r) => s + parseFloat(r.Credit || 0), 0)
    const w = window.open("", "_blank")
    w.document.write(`<html><head><title>${name} Statement</title>
    <style>
      body { font-family: Cairo, sans-serif; padding: 30px; color: #1a2535; }
      h2 { margin-bottom: 4px; } p { color: #64748b; margin: 0 0 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
      th { background: #f8fafc; font-weight: 700; }
      .totals { background: #f8fafc; font-weight: 800; }
      @media print { button { display: none; } }
    </style></head><body>
    <h2>${name} — ${isVendor ? "Vendor" : "Customer"} Statement</h2>
    <p>Period: ${from} to ${to}</p>
    <table>
      <thead><tr>
        <th>Date</th><th>Due Date</th><th>Reference</th><th>Description</th>
        <th>${isVendor ? "Debit (Invoice)" : "Debit (Invoice)"}</th>
        <th>${isVendor ? "Credit (Payment)" : "Credit (Collection)"}</th>
        <th>Running Balance</th>
      </tr></thead>
      <tbody>
        ${(() => {
          let bal = 0
          return rows.map(r => {
            bal += parseFloat(r.Debit || 0) - parseFloat(r.Credit || 0)
            return `<tr>
              <td>${r.TxDate?.slice(0,10) || ""}</td>
              <td>${r.DueDate?.slice(0,10) || "—"}</td>
              <td><strong>${r.Reference}</strong></td>
              <td>${r.Description}</td>
              <td>${parseFloat(r.Debit) > 0 ? fmt(r.Debit) : "—"}</td>
              <td>${parseFloat(r.Credit) > 0 ? fmt(r.Credit) : "—"}</td>
              <td>${fmt(bal)}</td>
            </tr>`
          }).join("")
        })()}
        <tr class="totals">
          <td colspan="4">TOTAL</td>
          <td>${fmt(totalDebit)}</td>
          <td>${fmt(totalCredit)}</td>
          <td>${fmt(totalDebit - totalCredit)}</td>
        </tr>
      </tbody>
    </table>
    <script>window.print()</script>
    </body></html>`)
    w.document.close()
  }

  const totalDebit  = rows.reduce((s, r) => s + parseFloat(r.Debit  || 0), 0)
  const totalCredit = rows.reduce((s, r) => s + parseFloat(r.Credit || 0), 0)

  return (
    <div>
      {/* Filter bar */}
      <SectionCard style={{ marginBottom: 20 }}>
        <div style={{ padding: "18px 24px", display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 2, minWidth: 180 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>{isVendor ? "Vendor" : "Customer"}</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder={`Type or select ${isVendor ? "vendor" : "customer"}...`}
              list={`${type}-names`}
              style={{ fontFamily: "inherit", fontSize: 14, padding: "11px 14px", border: "1.5px solid #e4e9f0", borderRadius: 9 }} />
            <datalist id={`${type}-names`}>{names.map(n => <option key={n} value={n} />)}</datalist>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>From Date</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{ fontFamily: "inherit", fontSize: 14, padding: "11px 14px", border: "1.5px solid #e4e9f0", borderRadius: 9 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>To Date</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{ fontFamily: "inherit", fontSize: 14, padding: "11px 14px", border: "1.5px solid #e4e9f0", borderRadius: 9 }} />
          </div>
          <Btn onClick={load}>Show Statement</Btn>
          <Btn variant="outline" onClick={load} title="Refresh">↻ Refresh</Btn>
          {shown && rows.length > 0 && <Btn variant="outline" onClick={print}>🖨 Print</Btn>}
        </div>
      </SectionCard>

      {shown && (
        <>
          {/* Summary header */}
          <SectionCard style={{ marginBottom: 20 }}>
            <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{name || "—"} — Statement</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Period: {from} to {to}</div>
              </div>
              <div style={{ display: "flex", gap: 28 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Total Invoiced</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(totalDebit)}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{isVendor ? "Total Paid" : "Total Collected"}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#16a34a" }}>{fmt(totalCredit)}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Balance Due</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#991b1b" }}>{fmt(totalDebit - totalCredit)}</div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Statement table */}
          <SectionCard>
            <StmtTable rows={rows} loading={loading} type={type} />
          </SectionCard>
        </>
      )}
    </div>
  )
}

export default function StatementsPage() {
  const [tab, setTab] = useState("vendor")
  return (
    <div>
      <div style={{
        background: "white", borderRadius: 14, boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
        border: "1px solid #e4e9f0", marginBottom: 24, overflow: "hidden",
      }}>
        <Tabs
          tabs={[{ key: "vendor", label: "📦 Vendor Statement" }, { key: "customer", label: "🧾 Customer Statement" }]}
          active={tab} onChange={setTab}
        />
      </div>
      {tab === "vendor"   && <StatementPanel type="vendor"   />}
      {tab === "customer" && <StatementPanel type="customer" />}
    </div>
  )
}
