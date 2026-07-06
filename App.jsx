import { useState } from "react"
import CapitalPage        from "./pages/Capital/index.jsx"
import TreasuryPage       from "./pages/Treasury/index.jsx"
import VendorInvoicePage  from "./pages/VendorInvoice/index.jsx"
import CustomerInvoicePage from "./pages/CustomerInvoice/index.jsx"
import StatementsPage     from "./pages/Statements/index.jsx"
import ReportsPage        from "./pages/Reports/index.jsx"

const NAV = [
  { key: "capital",   label: "Capital & Partners", icon: "🤝", section: "Finance Modules" },
  { key: "treasury",  label: "Treasury",            icon: "🏦", section: "Finance Modules" },
  { key: "vendor",    label: "Vendor Invoices",     icon: "📦", section: "Finance Modules" },
  { key: "customer",  label: "Customer Invoices",   icon: "🧾", section: "Finance Modules" },
  { key: "statements",label: "Statements",          icon: "📋", section: "Analytics" },
  { key: "reports",   label: "Reports",             icon: "📊", section: "Analytics" },
]

const PAGES = {
  capital:    { title: "Capital & Partners", component: <CapitalPage /> },
  treasury:   { title: "Treasury",           component: <TreasuryPage /> },
  vendor:     { title: "Vendor Invoices",    component: <VendorInvoicePage /> },
  customer:   { title: "Customer Invoices",  component: <CustomerInvoicePage /> },
  statements: { title: "Statements",         component: <StatementsPage /> },
  reports:    { title: "Reports",            component: <ReportsPage /> },
}

const SIDEBAR_W      = 260
const SIDEBAR_W_SM   = 60

export default function App() {
  const [page, setPage]       = useState("capital")
  const [collapsed, setCollapsed] = useState(false)

  // auto-collapse on small screens
  const isSmall = typeof window !== "undefined" && window.innerWidth <= 768
  const sideW   = collapsed || isSmall ? SIDEBAR_W_SM : SIDEBAR_W

  const sections = [...new Set(NAV.map(n => n.section))]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Cairo', sans-serif; background: #f1f4f8; color: #1a2535; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; }
        @keyframes slideUp {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @media (max-width: 768px) {
          .kpi-grid-4 { grid-template-columns: repeat(2,1fr) !important; }
          .kpi-grid-3 { grid-template-columns: repeat(2,1fr) !important; }
          .report-grid { grid-template-columns: 1fr !important; }
          .form-grid { grid-template-columns: 1fr !important; }
          .hide-mobile { display: none !important; }
        }
        @media (max-width: 480px) {
          .kpi-grid-4, .kpi-grid-3 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: sideW, background: "#1a2535",
          display: "flex", flexDirection: "column",
          position: "fixed", top: 0, left: 0, height: "100vh",
          zIndex: 100, overflowY: "auto", overflowX: "hidden",
          transition: "width 0.2s ease",
        }}>
          {/* Logo */}
          <div style={{
            padding: collapsed ? "22px 10px" : "26px 22px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between",
          }}>
            {!collapsed && (
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#f97316" }}>💰 Finance ERP</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Financial Management</div>
              </div>
            )}
            <button onClick={() => setCollapsed(c => !c)} style={{
              background: "rgba(255,255,255,0.06)", border: "none",
              color: "rgba(255,255,255,0.5)", cursor: "pointer",
              borderRadius: 8, width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
            }}>{collapsed ? "→" : "←"}</button>
          </div>

          {/* Nav */}
          <nav style={{ padding: collapsed ? "14px 8px" : "16px 14px", flex: 1 }}>
            {sections.map(sec => (
              <div key={sec}>
                {!collapsed && (
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)",
                    letterSpacing: 1.5, padding: "12px 10px 6px", textTransform: "uppercase",
                  }}>{sec}</div>
                )}
                {NAV.filter(n => n.section === sec).map(n => (
                  <div key={n.key} onClick={() => setPage(n.key)} title={collapsed ? n.label : undefined}
                    style={{
                      display: "flex", alignItems: "center",
                      gap: collapsed ? 0 : 12,
                      padding: collapsed ? "13px 0" : "12px 14px",
                      marginBottom: 3, borderRadius: collapsed ? 0 : 10,
                      justifyContent: collapsed ? "center" : "flex-start",
                      background: page === n.key ? "#f97316" : "transparent",
                      color: page === n.key ? "white" : "rgba(255,255,255,0.6)",
                      fontSize: 14, fontWeight: 600, cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { if (page !== n.key) e.currentTarget.style.background = "rgba(255,255,255,0.07)" }}
                    onMouseLeave={e => { if (page !== n.key) e.currentTarget.style.background = "transparent" }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
                    {!collapsed && <span>{n.label}</span>}
                  </div>
                ))}
              </div>
            ))}
          </nav>

          {/* User */}
          {!collapsed && (
            <div style={{ padding: "14px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px",
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", background: "#f97316",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700, color: "white", flexShrink: 0,
                }}>M</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>Mohammed Alkholy</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>System Admin</div>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* ── Main ── */}
        <main style={{
          marginLeft: sideW, flex: 1,
          display: "flex", flexDirection: "column",
          minHeight: "100vh", transition: "margin-left 0.2s ease",
        }}>
          {/* Topbar */}
          <div style={{
            background: "white", padding: "16px 28px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "1px solid #e4e9f0",
            position: "sticky", top: 0, zIndex: 50,
          }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{PAGES[page].title}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span className="hide-mobile" style={{ fontSize: 13, color: "#64748b" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </span>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                border: "1px solid #e4e9f0", background: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 18, color: "#64748b",
              }}>🔔</div>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: 28, flex: 1 }}>
            <div style={{ animation: "slideUp 0.22s ease" }} key={page}>
              {PAGES[page].component}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
