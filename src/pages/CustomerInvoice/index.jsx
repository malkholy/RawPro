import { useState, useEffect, useRef } from "react"
import { apiCall, fmt, today } from "../../shared/api.js"
import { KPICard, SectionCard, DataTable, Btn, Badge, Modal, FormGrid, Field, Input, Select, Textarea, LinesEditor } from "../../shared/UI.jsx"

function AutoComplete({ value, onChange, options, placeholder }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState(value)
  const ref               = useRef(null)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
  const select   = (val) => { setQuery(val); onChange(val); setOpen(false) }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={e => { e.target.style.borderColor = "#f97316"; setOpen(true) }}
        onBlur={e => e.target.style.borderColor = "#e4e9f0"}
        placeholder={placeholder}
        style={{
          width: "100%", fontFamily: "inherit", fontSize: 14,
          padding: "11px 14px", border: "1.5px solid #e4e9f0",
          borderRadius: 9, background: "white", color: "#1a2535",
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "white", border: "1.5px solid #e4e9f0", borderRadius: 9,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 999,
          maxHeight: 200, overflowY: "auto",
        }}>
          {filtered.map(o => (
            <div key={o} onMouseDown={() => select(o)} style={{
              padding: "10px 14px", fontSize: 14, cursor: "pointer",
              borderBottom: "1px solid #f1f4f8",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#fff7ed"}
              onMouseLeave={e => e.currentTarget.style.background = "white"}
            >{o}</div>
          ))}
        </div>
      )}
    </div>
  )
}

const EMPTY_HDR = { CustomerName: "", InvoiceNo: "", InvoiceDate: today(), DueDate: "", Notes: "" }

const norm = (str) => (str || "").replace(/\s+/g, "").toLowerCase()

export default function CustomerInvoicePage() {
  const [invoices, setInvoices]   = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState("")
  const [sortBy, setSortBy]       = useState("date")
  const [sortOrder, setSortOrder] = useState("desc")
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY_HDR)
  const [lines, setLines]         = useState([])
  const [saving, setSaving]       = useState(false)
  const [editID, setEditID]       = useState(null)
  const [collectModal, setCollectModal] = useState(false)
  const [collectInv, setCollectInv]     = useState(null)
  const [collectForm, setCollectForm]   = useState({ Amount: "", PayDate: today(), Notes: "" })
  const [collecting, setCollecting]     = useState(false)
  const [treasury, setTreasury]         = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const [invRes, cRes, tRes] = await Promise.all([
        apiCall("Get Customer Invoices"),
        apiCall("Get Customer List"),
        apiCall("Get Treasury Transactions", {})
      ])
      setInvoices(invRes.List0 || [])
      setCustomers((cRes.List0 || []).map(c => c.CustomerName))
      setTreasury(tRes.List0 || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = invoices.filter(i =>
    (!selectedCustomer || i.CustomerName?.trim() === selectedCustomer.trim()) &&
    (!search || i.CustomerName?.toLowerCase().includes(search.toLowerCase()) ||
     i.InvoiceNo?.toLowerCase().includes(search.toLowerCase()))
  )

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "date") {
      const dA = a.InvoiceDate || ""
      const dB = b.InvoiceDate || ""
      return sortOrder === "asc" ? dA.localeCompare(dB) : dB.localeCompare(dA)
    } else {
      const nA = a.CustomerName || ""
      const nB = b.CustomerName || ""
      return sortOrder === "asc" ? nA.localeCompare(nB) : nB.localeCompare(nA)
    }
  })

  const total     = invoices.reduce((s, i) => s + parseFloat(i.SubTotal         || 0), 0)
  const collected = invoices.reduce((s, i) => s + parseFloat(i.CollectedAmount  || 0), 0)
  const balance   = invoices.reduce((s, i) => s + parseFloat(i.Balance          || 0), 0)
  const overdue   = invoices.filter(i => i.Status === "Overdue").reduce((s, i) => s + parseFloat(i.Balance || 0), 0)

  const openAdd = () => {
    setForm(EMPTY_HDR)
    setLines([{ Line: 1, ItemDescription: "", Qty: "", UnitPrice: "" }])
    setEditID(null)
    setModal(true)
  }

  const openEdit = async (row) => {
    setForm({
      CustomerName: row.CustomerName, InvoiceNo: row.InvoiceNo,
      InvoiceDate: row.InvoiceDate?.slice(0, 10),
      DueDate: row.DueDate?.slice(0, 10) || "", Notes: row.Notes || "",
    })
    setEditID(row.InvoiceID)
    setModal(true)
    try {
      const res = await apiCall("Get Customer Invoice Lines", { InvoiceID: row.InvoiceID })
      setLines((res.List0 || []).map(l => ({
        Line: l.Line, ItemDescription: l.ItemDescription,
        Qty: l.Qty, UnitPrice: l.UnitPrice,
      })))
    } catch { setLines([]) }
  }

  const openCollect = (row) => {
    setCollectInv(row)
    setCollectForm({ Amount: parseFloat(row.Balance || 0).toFixed(2), PayDate: today(), Notes: "" })
    setCollectModal(true)
  }

  const save = async () => {
    if (!form.CustomerName || !form.InvoiceNo) return alert("Customer and invoice number are required")
    if (!lines.length) return alert("Add at least one line item")
    setSaving(true)
    try {
      const payload = { ...form, Lines: lines.map((l, i) => ({ ...l, Line: i + 1 })) }
      const op = editID ? "Update Customer Invoice" : "Save Customer Invoice"
      if (editID) payload.InvoiceID = editID
      await apiCall(op, payload)
      setModal(false)
      load()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  const submitCollect = async () => {
    if (!collectForm.Amount || parseFloat(collectForm.Amount) <= 0) return alert("Enter a valid amount")
    if (parseFloat(collectForm.Amount) > parseFloat(collectInv.Balance)) return alert("Amount exceeds invoice balance of " + fmt(collectInv.Balance))
    
    const customerReceipts = treasury.filter(t => norm(t.Party) === norm(collectInv.CustomerName) && t.TxType === "Receipt").reduce((s, t) => s + parseFloat(t.Amount || 0), 0)
    const customerPayments = treasury.filter(t => norm(t.Party) === norm(collectInv.CustomerName) && t.TxType === "Payment").reduce((s, t) => s + parseFloat(t.Amount || 0), 0)
    const customerCollected = invoices.filter(i => norm(i.CustomerName) === norm(collectInv.CustomerName)).reduce((s, i) => s + parseFloat(i.CollectedAmount || 0), 0)
    const availablePayments = customerReceipts - customerPayments - customerCollected
    
    if (parseFloat(collectForm.Amount) > availablePayments) {
      return alert(`Cannot collect. Available customer payments: ${fmt(availablePayments)}`)
    }
    
    setCollecting(true)
    try {
      await apiCall("Collect Customer Invoice", {
        InvoiceID: collectInv.InvoiceID,
        Amount:    parseFloat(collectForm.Amount),
        PayDate:   collectForm.PayDate,
        Notes:     collectForm.Notes,
      })
      setCollectModal(false)
      load()
    } catch (e) { alert(e.message) }
    setCollecting(false)
  }

  const del = async (id) => {
    if (!confirm("Delete this invoice?")) return
    try {
      await apiCall("Delete Customer Invoice", { InvoiceID: id })
      load()
    } catch (e) { alert(e.message) }
  }

  const lockInvoice = async (id) => {
    try {
      await apiCall("Lock Customer Invoice", { InvoiceID: id })
      load()
    } catch (e) { alert(e.message) }
  }

  const resetCollection = async (id) => {
    try {
      await apiCall("Reset Customer Invoice Collection", { InvoiceID: id })
      load()
    } catch (e) { alert(e.message) }
  }

  const columns = [
    { key: "InvoiceNo",       label: "Invoice #",  render: v => <strong>{v}</strong> },
    { key: "CustomerName",    label: "Customer" },
    { key: "InvoiceDate",     label: "Date",        render: v => v?.slice(0, 10) },
    { key: "DueDate",         label: "Due Date",    render: (v, row) => {
      const od = v && v < new Date().toISOString().slice(0, 10) && row.Status !== "Paid"
      return <span style={{ color: od ? "#991b1b" : undefined, fontWeight: od ? 700 : undefined }}>
        {v?.slice(0, 10) || "—"}{od ? " ⚠" : ""}
      </span>
    }},
    { key: "SubTotal",        label: "Total",       render: v => fmt(v) },
    { key: "CollectedAmount", label: "Collected",   render: v => <span style={{ color: "#16a34a" }}>{fmt(v)}</span> },
    { key: "Balance",         label: "Balance",     render: v => <span style={{ color: parseFloat(v) > 0 ? "#991b1b" : "#16a34a", fontWeight: 700 }}>{fmt(v)}</span> },
    { key: "Status",          label: "Status",      render: v => <Badge label={v} /> },
    { key: "_act",            label: "",            render: (_, row) => row.Status === "Locked" ? (
      <span style={{ fontSize: 13, color: "#64748b", fontStyle: "italic", padding: "4px 8px", background: "#f1f5f9", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4 }}>
        🔒 Locked
      </span>
    ) : (
      <div style={{ display: "flex", gap: 6 }}>
        <Btn variant="outline" size="sm" onClick={() => openEdit(row)}>Edit</Btn>
        {parseFloat(row.Balance) > 0 && (
          <Btn variant="primary" size="sm" onClick={() => openCollect(row)}>💰 Collect</Btn>
        )}
        {parseFloat(row.CollectedAmount) > 0 && (
          <Btn variant="outline" size="sm" onClick={() => resetCollection(row.InvoiceID)} style={{ borderColor: "#f97316", color: "#f97316" }}>🔄 Reset</Btn>
        )}
        {row.Status === "Paid" && (
          <Btn variant="outline" size="sm" onClick={() => lockInvoice(row.InvoiceID)} style={{ borderColor: "#64748b", color: "#475569" }}>🔒 Lock</Btn>
        )}
        <Btn variant="danger" size="sm" onClick={() => del(row.InvoiceID)}>Delete</Btn>
      </div>
    )},
  ]

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginBottom: 28 }}>
        <KPICard label="Total Invoiced"  value={fmt(total)}     sub="All customer invoices" icon="🧾" accent="#f97316" />
        <KPICard label="Total Collected" value={fmt(collected)} sub="Settled"               icon="✅" accent="#16a34a" />
        <KPICard label="Outstanding"     value={fmt(balance)}   sub="Remaining balance"     icon="⏳" accent="#92400e" />
        <KPICard label="Overdue"         value={fmt(overdue)}   sub="Past due date"         icon="⏰" accent="#991b1b" />
      </div>

      <SectionCard
        title="Customer Invoices"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="outline" onClick={load} title="Refresh">↻</Btn>
            <Select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} style={{ width: 180 }}>
              <option value="">All Customers</option>
              {customers.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select value={`${sortBy}-${sortOrder}`} onChange={e => {
              const [by, order] = e.target.value.split("-")
              setSortBy(by)
              setSortOrder(order)
            }} style={{ width: 180 }}>
              <option value="date-desc">Newest Date First</option>
              <option value="date-asc">Oldest Date First</option>
              <option value="name-asc">Customer A-Z</option>
              <option value="name-desc">Customer Z-A</option>
            </Select>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              style={{ padding: "9px 13px", border: "1.5px solid #e4e9f0", borderRadius: 9, fontSize: 14, fontFamily: "inherit", width: 180 }} />
            <Btn onClick={openAdd}>+ New Invoice</Btn>
          </div>
        }
      >
        <DataTable columns={columns} rows={sorted} loading={loading} />
        <div style={{ padding: "14px 24px", borderTop: "1px solid #e4e9f0", display: "flex", justifyContent: "flex-end", gap: 32 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Total Invoiced</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{fmt(filtered.reduce((s, i) => s + parseFloat(i.SubTotal || 0), 0))}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Total Outstanding</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#991b1b" }}>{fmt(filtered.reduce((s, i) => s + parseFloat(i.Balance || 0), 0))}</div>
          </div>
        </div>
      </SectionCard>

      {/* ── Invoice Modal ── */}
      <Modal open={modal} onClose={() => setModal(false)} width={780}
        title={editID ? "Edit Customer Invoice" : "New Customer Invoice"}
        footer={<>
          <Btn variant="outline" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Invoice"}</Btn>
        </>}
      >
        <FormGrid>
          <Field label="Customer Name">
            <AutoComplete
              value={form.CustomerName}
              onChange={val => setForm({ ...form, CustomerName: val })}
              options={customers}
              placeholder="Type to search customer..."
            />
          </Field>
          <Field label="Invoice #">
            <Input value={form.InvoiceNo} onChange={e => setForm({ ...form, InvoiceNo: e.target.value })} placeholder="CI-XXXX" />
          </Field>
          <Field label="Invoice Date">
            <Input type="date" value={form.InvoiceDate} onChange={e => setForm({ ...form, InvoiceDate: e.target.value })} />
          </Field>
          <Field label="Due Date">
            <Input type="date" value={form.DueDate} onChange={e => setForm({ ...form, DueDate: e.target.value })} />
          </Field>
          <Field label="Notes" full>
            <Textarea value={form.Notes} onChange={e => setForm({ ...form, Notes: e.target.value })} placeholder="Invoice notes..." />
          </Field>
        </FormGrid>
        <div style={{ marginTop: 20 }}>
          <LinesEditor lines={lines} onChange={setLines} />
        </div>
      </Modal>

      {/* ── Collect Modal ── */}
      <Modal open={collectModal} onClose={() => setCollectModal(false)} width={460}
        title={"Collect Invoice — " + (collectInv?.InvoiceNo || "")}
        footer={<>
          <Btn variant="outline" onClick={() => setCollectModal(false)}>Cancel</Btn>
          <Btn onClick={submitCollect} disabled={collecting}>{collecting ? "Processing…" : "Confirm Collection"}</Btn>
        </>}
      >
        {collectInv && (
          <div>
            <div style={{
              background: "#f8fafc", borderRadius: 10, padding: "14px 16px",
              marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>CUSTOMER</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{collectInv.CustomerName}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>AVAILABLE PAYMENTS</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: "#16a34a" }}>
                  {fmt(
                    treasury.filter(t => norm(t.Party) === norm(collectInv.CustomerName) && t.TxType === "Receipt").reduce((s, t) => s + parseFloat(t.Amount || 0), 0) -
                    treasury.filter(t => norm(t.Party) === norm(collectInv.CustomerName) && t.TxType === "Payment").reduce((s, t) => s + parseFloat(t.Amount || 0), 0) -
                    invoices.filter(i => norm(i.CustomerName) === norm(collectInv.CustomerName)).reduce((s, i) => s + parseFloat(i.CollectedAmount || 0), 0)
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>TOTAL</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{fmt(collectInv.SubTotal)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>BALANCE DUE</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#991b1b", marginTop: 2 }}>{fmt(collectInv.Balance)}</div>
              </div>
            </div>
            <FormGrid>
              <Field label="Collection Amount $">
                <Input type="number" value={collectForm.Amount}
                  onChange={e => setCollectForm({ ...collectForm, Amount: e.target.value })}
                  placeholder="0.00" />
              </Field>
              <Field label="Collection Date">
                <Input type="date" value={collectForm.PayDate}
                  onChange={e => setCollectForm({ ...collectForm, PayDate: e.target.value })} />
              </Field>
              <Field label="Notes" full>
                <Textarea value={collectForm.Notes}
                  onChange={e => setCollectForm({ ...collectForm, Notes: e.target.value })}
                  placeholder="Receipt reference or notes..." />
              </Field>
            </FormGrid>
          </div>
        )}
      </Modal>
    </div>
  )
}
