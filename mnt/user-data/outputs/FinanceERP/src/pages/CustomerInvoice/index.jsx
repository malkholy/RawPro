import { useState, useEffect } from "react"
import { apiCall, fmt, today } from "../../shared/api.js"
import { KPICard, SectionCard, DataTable, Btn, Badge, Modal, FormGrid, Field, Input, Textarea, LinesEditor } from "../../shared/UI.jsx"

const EMPTY_HDR = { CustomerName: "", InvoiceNo: "", InvoiceDate: today(), DueDate: "", Notes: "" }

export default function CustomerInvoicePage() {
  const [invoices, setInvoices]   = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState("")
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(EMPTY_HDR)
  const [lines, setLines]         = useState([])
  const [saving, setSaving]       = useState(false)
  const [editID, setEditID]       = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [invRes, cRes] = await Promise.all([
        apiCall("Get Customer Invoices"),
        apiCall("Get Customer List"),
      ])
      setInvoices(invRes.List0 || [])
      setCustomers((cRes.List0 || []).map(c => c.CustomerName))
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = invoices.filter(i =>
    !search || i.CustomerName?.toLowerCase().includes(search.toLowerCase()) ||
    i.InvoiceNo?.toLowerCase().includes(search.toLowerCase())
  )

  // KPIs
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
      const res = await apiCall("Get Customer Invoice Lines", { LineData: JSON.stringify({ InvoiceID: row.InvoiceID }) })
      setLines((res.List0 || []).map(l => ({
        Line: l.Line, ItemDescription: l.ItemDescription,
        Qty: l.Qty, UnitPrice: l.UnitPrice,
      })))
    } catch { setLines([]) }
  }

  const save = async () => {
    if (!form.CustomerName || !form.InvoiceNo) return alert("Customer and invoice number are required")
    if (!lines.length) return alert("Add at least one line item")
    setSaving(true)
    try {
      const payload = { ...form, Lines: lines.map((l, i) => ({ ...l, Line: i + 1 })) }
      const op = editID ? "Update Customer Invoice" : "Save Customer Invoice"
      if (editID) payload.InvoiceID = editID
      await apiCall(op, { LineData: JSON.stringify(payload) })
      setModal(false)
      load()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm("Delete this invoice?")) return
    try {
      await apiCall("Delete Customer Invoice", { LineData: JSON.stringify({ InvoiceID: id }) })
      load()
    } catch (e) { alert(e.message) }
  }

  const columns = [
    { key: "InvoiceNo",       label: "Invoice #",  render: v => <strong>{v}</strong> },
    { key: "CustomerName",    label: "Customer" },
    { key: "InvoiceDate",     label: "Date",        render: v => v?.slice(0, 10) },
    { key: "DueDate",         label: "Due Date",    render: (v, row) => {
      const overdue = v && v < new Date().toISOString().slice(0, 10) && row.Status !== "Paid"
      return <span style={{ color: overdue ? "#991b1b" : undefined, fontWeight: overdue ? 700 : undefined }}>
        {v?.slice(0, 10) || "—"}{overdue ? " ⚠" : ""}
      </span>
    }},
    { key: "SubTotal",        label: "Total",       render: v => fmt(v) },
    { key: "CollectedAmount", label: "Collected",   render: v => <span style={{ color: "#16a34a" }}>{fmt(v)}</span> },
    { key: "Balance",         label: "Balance",     render: v => <span style={{ color: parseFloat(v) > 0 ? "#991b1b" : "#16a34a", fontWeight: 700 }}>{fmt(v)}</span> },
    { key: "Status",          label: "Status",      render: v => <Badge label={v} /> },
    { key: "_act",            label: "",            render: (_, row) => (
      <div style={{ display: "flex", gap: 6 }}>
        <Btn variant="outline" size="sm" onClick={() => openEdit(row)}>Edit</Btn>
        <Btn variant="danger"  size="sm" onClick={() => del(row.InvoiceID)}>Delete</Btn>
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              style={{ padding: "9px 13px", border: "1.5px solid #e4e9f0", borderRadius: 9, fontSize: 14, fontFamily: "inherit", width: 180 }} />
            <Btn onClick={openAdd}>+ New Invoice</Btn>
          </div>
        }
      >
        <DataTable columns={columns} rows={filtered} loading={loading} />
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

      <Modal open={modal} onClose={() => setModal(false)} width={780}
        title={editID ? "Edit Customer Invoice" : "New Customer Invoice"}
        footer={<>
          <Btn variant="outline" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Invoice"}</Btn>
        </>}
      >
        <FormGrid>
          <Field label="Customer Name">
            <Input value={form.CustomerName} onChange={e => setForm({ ...form, CustomerName: e.target.value })}
              placeholder="Customer name" list="customer-list" />
            <datalist id="customer-list">{customers.map(c => <option key={c} value={c} />)}</datalist>
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
    </div>
  )
}
