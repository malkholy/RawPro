import { useState, useEffect } from "react"
import { apiCall, fmt, today } from "../../shared/api.js"
import { KPICard, SectionCard, DataTable, Btn, Badge, Modal, FormGrid, Field, Input, Select, Textarea, Tabs } from "../../shared/UI.jsx"

const EMPTY = { TxType: "Receipt", PartyType: "Other", Party: "", Amount: "", TxDate: today(), Purpose: "", Status: "Posted" }

export default function TreasuryPage() {
  const [all, setAll]         = useState([])
  const [vendors, setVendors] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState("Receipt")
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [editID, setEditID]   = useState(null)
  const [selectedParty, setSelectedParty] = useState("")
  const [search, setSearch]               = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const [txRes, vRes, cRes] = await Promise.all([
        apiCall("Get Treasury Transactions", {}),
        apiCall("Get Vendor List").catch(() => ({ List0: [] })),
        apiCall("Get Customer List").catch(() => ({ List0: [] }))
      ])
      setAll(txRes.List0 || [])
      setVendors((vRes.List0 || []).map(v => v.VendorName))
      setCustomers((cRes.List0 || []).map(c => c.CustomerName))
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    setSelectedParty("")
    setSearch("")
  }, [tab])

  const rows = all.filter(r => 
    r.TxType === tab &&
    (!selectedParty || r.Party === selectedParty) &&
    (!search || 
      r.Reference?.toLowerCase().includes(search.toLowerCase()) ||
      r.Party?.toLowerCase().includes(search.toLowerCase()) ||
      r.Purpose?.toLowerCase().includes(search.toLowerCase())
    )
  )

  const totalReceipts = all.filter(r => r.TxType === "Receipt").reduce((s, r) => s + parseFloat(r.Amount || 0), 0)
  const totalPayments = all.filter(r => r.TxType === "Payment").reduce((s, r) => s + parseFloat(r.Amount || 0), 0)
  const netBalance    = totalReceipts - totalPayments

  const openAdd = () => {
    setForm({ ...EMPTY, TxType: tab })
    setEditID(null)
    setModal(true)
  }
  const openEdit = (row) => {
    setForm({
      TxType: row.TxType, PartyType: row.PartyType || "Other", Party: row.Party || "",
      Amount: row.Amount, TxDate: row.TxDate?.slice(0, 10),
      Purpose: row.Purpose || "", Status: row.Status,
    })
    setEditID(row.TxID)
    setModal(true)
  }

  const save = async () => {
    if (!form.Party || !form.Amount) return alert("Party and amount are required")
    setSaving(true)
    try {
      const op = editID ? "Edit Treasury Transaction" : "Add Treasury Transaction"
      const payload = editID ? { ...form, TxID: editID } : form
      await apiCall(op, payload)
      setModal(false)
      load()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm("Delete this transaction?")) return
    try {
      await apiCall("Delete Treasury Transaction", { TxID: id })
      load()
    } catch (e) { alert(e.message) }
  }

  const columns = [
    { key: "Reference", label: "Reference",  render: v => <strong>{v}</strong> },
    { key: "TxType",    label: "Type",        render: v => <Badge label={v} /> },
    { key: "Party",     label: tab === "Receipt" ? "Received From" : "Paid To", render: (v, row) => (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span>{v}</span>
        {row.PartyType && (
          <span style={{ fontSize: 11, background: "#f1f5f9", color: "#475569", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
            {row.PartyType}
          </span>
        )}
      </div>
    )},
    { key: "Amount",    label: "Amount",      render: v => fmt(v) },
    { key: "TxDate",    label: "Date",        render: v => v?.slice(0, 10) },
    { key: "Purpose",   label: "Purpose",     wrap: true, render: v => v || "—" },
    { key: "Status",    label: "Status",      render: v => <Badge label={v} /> },
    { key: "_act",      label: "",            render: (_, row) => (
      <div style={{ display: "flex", gap: 6 }}>
        <Btn variant="outline" size="sm" onClick={() => openEdit(row)}>Edit</Btn>
        <Btn variant="danger"  size="sm" onClick={() => del(row.TxID)}>Delete</Btn>
      </div>
    )},
  ]

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18, marginBottom: 28 }}>
        <KPICard label="Net Balance"     value={fmt(netBalance)}    sub="Receipts minus payments" icon="💰" accent="#f97316" />
        <KPICard label="Total Receipts"  value={fmt(totalReceipts)} sub="All time"                icon="📥" accent="#16a34a" />
        <KPICard label="Total Payments"  value={fmt(totalPayments)} sub="All time"                icon="📤" accent="#991b1b" />
      </div>

      <SectionCard
        title="Treasury Transactions"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="outline" onClick={load} title="Refresh">↻</Btn>
            <Select value={selectedParty} onChange={e => setSelectedParty(e.target.value)} style={{ width: 180 }}>
              <option value="">{tab === "Receipt" ? "All Customers" : "All Vendors"}</option>
              {(tab === "Receipt" ? customers : vendors).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search reference, party..."
              style={{ padding: "9px 13px", border: "1.5px solid #e4e9f0", borderRadius: 9, fontSize: 14, fontFamily: "inherit", width: 180 }}
            />
            <Btn onClick={openAdd}>+ New {tab}</Btn>
          </div>
        }
      >
        <Tabs
          tabs={[{ key: "Receipt", label: "Receipts" }, { key: "Payment", label: "Payments" }]}
          active={tab} onChange={setTab}
        />
        <DataTable columns={columns} rows={rows} loading={loading} emptyText={`No ${tab.toLowerCase()}s found`} />
        {/* Summary */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #e4e9f0", display: "flex", justifyContent: "flex-end", gap: 32 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Total {tab === "Receipt" ? "Receipts" : "Payments"} Amount</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: tab === "Receipt" ? "#16a34a" : "#991b1b" }}>
              {fmt(rows.reduce((s, r) => s + parseFloat(r.Amount || 0), 0))}
            </div>
          </div>
        </div>
      </SectionCard>

      <Modal open={modal} onClose={() => setModal(false)}
        title={editID ? `Edit ${form.TxType}` : `New ${tab}`}
        footer={<>
          <Btn variant="outline" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </>}
      >
        <FormGrid>
          <Field label="Type">
            <Select value={form.TxType} onChange={e => setForm({ ...form, TxType: e.target.value })}>
              <option>Receipt</option>
              <option>Payment</option>
            </Select>
          </Field>
          <Field label="Party Type">
            <Select value={form.PartyType || "Other"} onChange={e => setForm({ ...form, PartyType: e.target.value, Party: "" })}>
              <option value="Customer">Customer</option>
              <option value="Vendor">Vendor</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
          <Field label={form.TxType === "Receipt" ? "Received From" : "Paid To"}>
            <Input
              value={form.Party}
              onChange={e => setForm({ ...form, Party: e.target.value })}
              placeholder="Party name"
              list={
                form.PartyType === "Customer" ? "customer-list" :
                form.PartyType === "Vendor" ? "vendor-list" :
                undefined
              }
            />
            <datalist id="customer-list">
              {customers.map(c => <option key={c} value={c} />)}
            </datalist>
            <datalist id="vendor-list">
              {vendors.map(v => <option key={v} value={v} />)}
            </datalist>
          </Field>
          <Field label="Amount $">
            <Input type="number" value={form.Amount} onChange={e => setForm({ ...form, Amount: e.target.value })} placeholder="0.00" />
          </Field>
          <Field label="Date">
            <Input type="date" value={form.TxDate} onChange={e => setForm({ ...form, TxDate: e.target.value })} />
          </Field>
          <Field label="Status">
            <Select value={form.Status} onChange={e => setForm({ ...form, Status: e.target.value })}>
              <option>Posted</option>
              <option>Draft</option>
            </Select>
          </Field>
          <Field label="Purpose" full>
            <Textarea value={form.Purpose} onChange={e => setForm({ ...form, Purpose: e.target.value })} placeholder="Purpose / description..." />
          </Field>
        </FormGrid>
      </Modal>
    </div>
  )
}
