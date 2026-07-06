import { useState, useEffect } from "react"
import { apiCall, fmt } from "../../shared/api.js"

const REPORTS = [
  { icon: "📈", title: "Revenue & Expenses",      desc: "Monthly and annual comparison of revenue vs. expenses" },
  { icon: "💼", title: "Capital & Partners",       desc: "Summary of partner transactions and profit distributions" },
  { icon: "🏦", title: "Treasury Statement",       desc: "All receipts and payments with running balance" },
  { icon: "📦", title: "Vendor Aging Report",      desc: "Outstanding vendor invoices broken down by time period" },
  { icon: "🧾", title: "Customer Aging Report",    desc: "Outstanding customer receivables by time period" },
  { icon: "📊", title: "Balance Sheet",            desc: "Comprehensive financial position at any selected date" },
]

export default function ReportsPage() {
  const [stats, setStats] = useState({ revenue: 0, expenses: 0, outstanding: 0, collection: 0 })

  useEffect(() => {
    const load = async () => {
      try {
        const [ci, vi] = await Promise.all([
          apiCall("Get Customer Invoices"),
          apiCall("Get Vendor Invoices"),
        ])
        const revenue  = (ci.List0 || []).reduce((s, i) => s + parseFloat(i.SubTotal || 0), 0)
        const expenses = (vi.List0 || []).reduce((s, i) => s + parseFloat(i.SubTotal || 0), 0)
        const ciBalance = (ci.List0 || []).reduce((s, i) => s + parseFloat(i.Balance || 0), 0)
        const collected = (ci.List0 || []).reduce((s, i) => s + parseFloat(i.CollectedAmount || 0), 0)
        const collection = revenue > 0 ? Math.round((collected / revenue) * 100) : 0
        setStats({ revenue, expenses, outstanding: ciBalance, collection })
      } catch {}
    }
    load()
  }, [])

  return (
    <div>
      {/* Mini stats */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
        {[
          { label: "Net Profit",       value: fmt(stats.revenue - stats.expenses), color: "#16a34a" },
          { label: "Total Revenue",    value: fmt(stats.revenue),                  color: "#1a2535" },
          { label: "Total Expenses",   value: fmt(stats.expenses),                 color: "#991b1b" },
          { label: "Collection Rate",  value: `${stats.collection}%`,              color: "#1d4ed8" },
        ].map(s => (
          <div key={s.label} style={{
            background: "white", border: "1px solid #e4e9f0", borderRadius: 10,
            padding: "14px 20px", flex: 1, minWidth: 140,
          }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Report cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
        {REPORTS.map(r => (
          <div key={r.title}
            onClick={() => alert(`"${r.title}" report coming soon — will connect to FastReport PDF API`)}
            style={{
              background: "white", border: "1px solid #e4e9f0",
              borderRadius: 14, padding: 24, cursor: "pointer",
              transition: "0.18s", display: "flex", flexDirection: "column", gap: 10,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#f97316"; e.currentTarget.style.transform = "translateY(-2px)" }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e4e9f0"; e.currentTarget.style.transform = "none" }}
          >
            <div style={{ fontSize: 30 }}>{r.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{r.title}</div>
            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{r.desc}</div>
            <div style={{ marginTop: "auto", color: "#f97316", fontSize: 13, fontWeight: 700 }}>View Report →</div>
          </div>
        ))}
      </div>
    </div>
  )
}
