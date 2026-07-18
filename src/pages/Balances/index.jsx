import { useState, useEffect } from "react"
import { apiCall, fmt, today } from "../../shared/api.js"
import { KPICard, SectionCard, DataTable, Btn, Badge, Tabs } from "../../shared/UI.jsx"

const norm = (str) => (str || "").replace(/\s+/g, "").toLowerCase()

export default function BalancesPage() {
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState("Vendor") // "Vendor" or "Customer"
  const [search, setSearch]     = useState("")
  
  const [vendors, setVendors]   = useState([])
  const [customers, setCustomers] = useState([])
  const [vendorInvoices, setVendorInvoices] = useState([])
  const [customerInvoices, setCustomerInvoices] = useState([])
  const [treasury, setTreasury] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const [vList, cList, vInvs, cInvs, txs] = await Promise.all([
        apiCall("Get Vendor List").catch(() => ({ List0: [] })),
        apiCall("Get Customer List").catch(() => ({ List0: [] })),
        apiCall("Get Vendor Invoices").catch(() => ({ List0: [] })),
        apiCall("Get Customer Invoices").catch(() => ({ List0: [] })),
        apiCall("Get Treasury Transactions", {}).catch(() => ({ List0: [] }))
      ])

      setVendors(vList.List0 || [])
      setCustomers(cList.List0 || [])
      setVendorInvoices(vInvs.List0 || [])
      setCustomerInvoices(cInvs.List0 || [])
      setTreasury(txs.List0 || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Calculate Vendor Balances
  const vendorBalances = vendors.map(v => {
    const invs = vendorInvoices.filter(i => norm(i.VendorName) === norm(v.VendorName))
    const totalInvoices = invs.reduce((s, i) => s + parseFloat(i.SubTotal || 0), 0)
    const totalPaid = invs.reduce((s, i) => s + parseFloat(i.PaidAmount || 0), 0)
    const balance = totalInvoices - totalPaid

    const nowStr = today()
    const due = invs
      .filter(i => i.Status !== "Paid" && i.Status !== "Locked" && i.DueDate && i.DueDate < nowStr)
      .reduce((s, i) => s + parseFloat(i.Balance || 0), 0)

    return {
      ID: v.VendorID,
      Name: v.VendorName,
      TotalInvoices: totalInvoices,
      TotalPayment: totalPaid,
      Balance: balance,
      Due: due
    }
  })

  // Calculate Customer Balances
  const customerBalances = customers.map(c => {
    const invs = customerInvoices.filter(i => norm(i.CustomerName) === norm(c.CustomerName))
    const totalInvoices = invs.reduce((s, i) => s + parseFloat(i.SubTotal || 0), 0)
    const totalPaid = invs.reduce((s, i) => s + parseFloat(i.CollectedAmount || 0), 0)
    const balance = totalInvoices - totalPaid

    const nowStr = today()
    const due = invs
      .filter(i => i.Status !== "Paid" && i.Status !== "Locked" && i.DueDate && i.DueDate < nowStr)
      .reduce((s, i) => s + parseFloat(i.Balance || 0), 0)

    return {
      ID: c.CustomerID,
      Name: c.CustomerName,
      TotalInvoices: totalInvoices,
      TotalPayment: totalPaid,
      Balance: balance,
      Due: due
    }
  })

  const currentList = tab === "Vendor" ? vendorBalances : customerBalances

  const filtered = currentList.filter(row => 
    !search || row.Name?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: "ID", label: "ID", render: v => <strong>#{v}</strong> },
    { key: "Name", label: tab === "Vendor" ? "Vendor Name" : "Customer Name" },
    { key: "TotalInvoices", label: "Total Invoices", render: v => fmt(v) },
    { key: "TotalPayment", label: tab === "Vendor" ? "Total Payment" : "Total Collected", render: v => <span style={{ color: "#16a34a" }}>{fmt(v)}</span> },
    { key: "Balance", label: "Balance", render: v => <span style={{ color: parseFloat(v) > 0 ? "#991b1b" : "#16a34a", fontWeight: 700 }}>{fmt(v)}</span> },
    { key: "Due", label: "Overdue", render: v => <span style={{ color: parseFloat(v) > 0 ? "#ef4444" : "#64748b", fontWeight: parseFloat(v) > 0 ? 700 : undefined }}>{fmt(v)}</span> }
  ]

  // Overall sums for the selected tab
  const sumInvoices = filtered.reduce((s, r) => s + r.TotalInvoices, 0)
  const sumPayments = filtered.reduce((s, r) => s + r.TotalPayment, 0)
  const sumBalance  = filtered.reduce((s, r) => s + r.Balance, 0)
  const sumDue      = filtered.reduce((s, r) => s + r.Due, 0)

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginBottom: 28 }}>
        <KPICard label={`Total ${tab} Balance`} value={fmt(sumBalance)} sub={`Outstanding balance`} icon="💰" accent="#f97316" />
        <KPICard label={`Total Overdue`} value={fmt(sumDue)} sub={`Billed & past due date`} icon="⚠️" accent="#991b1b" />
        <KPICard label={`Active ${tab}s`} value={filtered.filter(r => r.TotalInvoices > 0).length} sub={`With transactions`} icon="👥" accent="#16a34a" />
      </div>

      <SectionCard 
        title={`${tab} Balances`}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="outline" onClick={load} title="Refresh">↻</Btn>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name..."
              style={{ padding: "9px 13px", border: "1.5px solid #e4e9f0", borderRadius: 9, fontSize: 14, fontFamily: "inherit", width: 180 }} />
          </div>
        }
      >
        <Tabs 
          tabs={[{ key: "Vendor", label: "Vendor Balances" }, { key: "Customer", label: "Customer Balances" }]}
          active={tab}
          onChange={setTab}
        />
        <DataTable columns={columns} rows={filtered} loading={loading} />

        {/* Footer Summary */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #e4e9f0", display: "flex", justifyContent: "flex-end", gap: 40, background: "#f8fafc" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Sum Invoices</div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{fmt(sumInvoices)}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{tab === "Vendor" ? "Sum Payments" : "Sum Collected"}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#16a34a" }}>{fmt(sumPayments)}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Sum Balance</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#991b1b" }}>{fmt(sumBalance)}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Sum Overdue</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#ef4444" }}>{fmt(sumDue)}</div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
