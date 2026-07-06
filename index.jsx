import { useState, useEffect, useRef } from "react"
import { apiCall, fmt, today } from "../../shared/api.js"
import { KPICard, SectionCard, DataTable, Btn, Badge, Modal, FormGrid, Field, Input, Textarea, LinesEditor } from "../../shared/UI.jsx"

function AutoComplete({ value, onChange, options, placeholder }) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState(value)
  const ref                   = useRef(null)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()))

  const select = (val) => {
    setQuery(val)
    onChange(val)
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={{
          width: "100%", fontFamily: "inherit", fontSize: 14,
          padding: "11px 14px", border: "1.5px solid #e4e9f0",
          borderRadius: 9, background: "white", color: "#1a2535",
        }}
        onFocus={e => { e.target.style.borderColor = "#f97316"; setOpen(true) }}
        onBlur={e => e.target.style.borderColor = "#e4e9f0"}
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

const EMPTY_HDR = { VendorName: "", InvoiceNo: "", InvoiceDate: today(), DueDate: "", Notes: "" }

export default function VendorInvoicePage() {
  const [invoices, setInvoices] = useState([])
  const [vendors, setVendors]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(EMPTY_HDR)
  const [lines, setLines]       = useState([])
  const [saving, setSaving]     = useState(false)
  const [editID, setEditID]     = useState(null)
  // Pay modal
  const [payModal, setPayModal] = useState(false)
  const [payInv, setPayInv]     = useState(null)
  const [payForm, setPayForm]   = useState({ Amount: "", PayDate: today(), Notes: "" })
  const [paying, setPaying]     = useState(false)

  const openPay = (row) => {
    setPayInv(row)
    setPayForm({ Amount: parseFloat(row.Balance || 0).toFixed(2), PayDate: today(), Notes: "" })
    setPayModal(true)
  }

  const submitPay = async () => {
    if (!payForm.Amount || parseFloat(payForm.Amount) <= 0) return alert("Enter a valid amount")
    if (parseFloat(payForm.Amount) > parseFloat(payInv.Balance)) return alert("Amount exceeds invoice balance of " + fmt(payInv.Balance))
    setPaying(true)
    try {
      await apiCall("Pay Vendor Invoice", {
        InvoiceID: payInv.InvoiceID,
        Amount:    parseFloat(payForm.Amount),
        PayDate:   payForm.PayDate,
        Notes:     payForm.Notes,
      })
      setPayModal(false)
      load()
    } catch (e) { alert(e.message) }
    setPaying(false)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [invRes, vRes] = await Promise.all([
        apiCall("Get Vendor Invoices"),
        apiCall("Get Vendor List"),
      ])
      setInvoices(invRes.List0 || [])
      setVendors((vRes.List0 || []).map(v => v.VendorName))
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = invoices.filter(i =>
    !search || i.VendorName?.toLowerCase().includes(search.toLowerCase()) ||
    i.InvoiceNo?.toLowerCase().includes(search.toLowerCase())
  )

  // KPIs
  const total    = invoices.reduce((s, i) => s + parseFloat(i.SubTotal    || 0), 0)
  const paid     = invoices.reduce((s, i) => s + parseFloat(i.PaidAmount  || 0), 0)
  const balance  = invoices.reduce((s, i) => s + parseFloat(i.Balance     || 0), 0)
  const overdue  = invoices.filter(i => i.Status === "Overdue").reduce((s, i) => s + parseFloat(i.Balance || 0), 0)

  const openAdd = () => {
    setForm(EMPTY_HDR)
    setLines([{ Line: 1, ItemDescription: "", Qty: "", UnitPrice: "" }])
    setEditID(null)
    setModal(true)
  }

  const openEdit = async (row) => {
    setForm({
      VendorName: row.VendorName, InvoiceNo: row.InvoiceNo,
      InvoiceDate: row.InvoiceDate?.slice(0, 10),
      DueDate: row.DueDate?.slice(0, 10) || "", Notes: row.Notes || "",
    })
    setEditID(row.InvoiceID)
    setModal(true)
    try {
      const res = await apiCall("Get Vendor Invoice Lines", { InvoiceID: row.InvoiceID })
      setLines((res.List0 || []).map(l => ({
        Line: l.Line, ItemDescription: l.ItemDescription,
        Qty: l.Qty, UnitPrice: l.UnitPrice,
      })))
    } catch { setLines([]) }
  }

  const save = async () => {
    if (!form.VendorName || !form.InvoiceNo) return alert("Vendor and invoice number are required")
    if (!lines.length) return alert("Add at least one line item")
    setSaving(true)
    try {
      const payload = { ...form, Lines: lines.map((l, i) => ({ ...l, Line: i + 1 })) }
      const op = editID ? "Update Vendor Invoice" : "Save Vendor Invoice"
      if (editID) payload.InvoiceID = editID
      await apiCall(op, payload)
      setModal(false)
      load()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm("Delete this invoice?")) return
    try {
      await apiCall("Delete Vendor Invoice", { InvoiceID: id })
      load()
    } catch (e) { alert(e.message) }
  }

  const columns = [
    { key: "InvoiceNo",   label: "Invoice #",  render: v => <strong>{v}</strong> },
    { key: "VendorName",  label: "Vendor" },
    { key: "InvoiceDate", label: "Date",        render: v => v?.slice(0, 10) },
    { key: "DueDate",     label: "Due Date",    render: (v, row) => {
      const overdue = v && v < new Date().toISOString().slice(0, 10) && row.Status !== "Paid"
      return <span style={{ color: overdue ? "#991b1b" : undefined, fontWeight: overdue ? 700 : undefined }}>
        {v?.slice(0, 10) || "—"}{overdue ? " ⚠" : ""}
      </span>
    }},
    { key: "SubTotal",    label: "Total",       render: v => fmt(v) },
    { key: "PaidAmount",  label: "Paid",        render: v => <span style={{ color: "#16a34a" }}>{fmt(v)}</span> },
    { key: "Balance",     label: "Balance",     render: v => <span style={{ color: parseFloat(v) > 0 ? "#991b1b" : "#16a34a", fontWeight: 700 }}>{fmt(v)}</span> },
    { key: "Status",      label: "Status",      render: v => <Badge label={v} /> },
    { key: "_act",        label: "",            render: (_, row) => (
      <div style={{ display: "flex", gap: 6 }}>
        <Btn variant="outline" size="sm" onClick={() => openEdit(row)}>Edit</Btn>
        {parseFloat(row.Balance) > 0 && (
          <Btn variant="primary" size="sm" onClick={() => openPay(row)}>💳 Pay</Btn>
        )}
        <Btn variant="danger"  size="sm" onClick={() => del(row.InvoiceID)}>Delete</Btn>
      </div>
    )},
  ]

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginBottom: 28 }}>
        <KPICard label="Total Invoiced" value={fmt(total)}   sub="All vendor invoices" icon="📦" accent="#f97316" />
        <KPICard label="Total Paid"     value={fmt(paid)}    sub="Settled"             icon="✅" accent="#16a34a" />
        <KPICard label="Outstanding"    value={fmt(balance)} sub="Remaining balance"   icon="⏳" accent="#92400e" />
        <KPICard label="Overdue"        value={fmt(overdue)} sub="Past due date"       icon="⚠️" accent="#991b1b" />
      </div>

      <SectionCard
        title="Vendor Invoices"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              style={{ padding: "9px 13px", border: "1.5px solid #e4e9f0", borderRadius: 9, fontSize: 14, fontFamily: "inherit", width: 180 }} />
            <Btn onClick={openAdd}>+ New Invoice</Btn>
          </div>
        }
      >
        <DataTable columns={columns} rows={filtered} loading={loading} />
        {/* Summary */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #e4e9f0", display: "flex", justifyContent: "flex-end", gap: 32 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Total Amount</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{fmt(filtered.reduce((s, i) => s + parseFloat(i.SubTotal || 0), 0))}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Total Balance</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#991b1b" }}>{fmt(filtered.reduce((s, i) => s + parseFloat(i.Balance || 0), 0))}</div>
          </div>
        </div>
      </SectionCard>

      <Modal open={modal} onClose={() => setModal(false)} width={780}
        title={editID ? "Edit Vendor Invoice" : "New Vendor Invoice"}
        footer={<>
          <Btn variant="outline" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Invoice"}</Btn>
        </>}
      >
        <FormGrid>
          <Field label="Vendor Name">
            <AutoComplete
              value={form.VendorName}
              onChange={val => setForm({ ...form, VendorName: val })}
              options={vendors}
              placeholder="Type to search vendor..."
            />
          </Field>
          <Field label="Invoice #">
            <Input value={form.InvoiceNo} onChange={e => setForm({ ...form, InvoiceNo: e.target.value })} placeholder="VI-XXXX" />
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

      {/* ── Pay Modal ── */}
      <Modal open={payModal} onClose={() => setPayModal(false)} width={460}
        title={"Pay Invoice — " + (payInv?.InvoiceNo || "")}
        footer={<>
          <Btn variant="outline" onClick={() => setPayModal(false)}>Cancel</Btn>
          <Btn onClick={submitPay} disabled={paying}>{paying ? "Processing…" : "Confirm Payment"}</Btn>
        </>}
      >
        {payInv && (
          <div>
            {/* Invoice summary */}
            <div style={{
              background: "#f8fafc", borderRadius: 10, padding: "14px 16px",
              marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>VENDOR</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{payInv.VendorName}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>TOTAL</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{fmt(payInv.SubTotal)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>BALANCE DUE</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#991b1b", marginTop: 2 }}>{fmt(payInv.Balance)}</div>
              </div>
            </div>

            <FormGrid>
              <Field label="Payment Amount $">
                <Input type="number" value={payForm.Amount}
                  onChange={e => setPayForm({ ...payForm, Amount: e.target.value })}
                  placeholder="0.00" />
              </Field>
              <Field label="Payment Date">
                <Input type="date" value={payForm.PayDate}
                  onChange={e => setPayForm({ ...payForm, PayDate: e.target.value })} />
              </Field>
              <Field label="Notes" full>
                <Textarea value={payForm.Notes}
                  onChange={e => setPayForm({ ...payForm, Notes: e.target.value })}
                  placeholder="Payment reference or notes..." />
              </Field>
            </FormGrid>
          </div>
        )}
      </Modal>
    </div>
  )
}
