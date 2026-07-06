import { useState, useEffect } from "react"
import { apiCall, fmt, today } from "../../shared/api.js"
import { KPICard, SectionCard, DataTable, Btn, Badge, Modal, FormGrid, Field, Input, Select, Textarea } from "../../shared/UI.jsx"

const EMPTY_TX = { PartnerName: "", TxType: "Deposit", Amount: "", TxDate: today(), Notes: "", Status: "Posted" }

export default function CapitalPage() {
  const [txList, setTxList]     = useState([])
  const [partners, setPartners] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(EMPTY_TX)
  const [saving, setSaving]     = useState(false)
  const [editID, setEditID]     = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [txRes, pRes] = await Promise.all([
        apiCall("Get Capital Transactions"),
        apiCall("Get Partner List"),
      ])
      setTxList(txRes.List0 || [])
      setPartners((pRes.List0 || []).map(p => p.PartnerName))
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setForm(EMPTY_TX); setEditID(null); setModal(true) }
  const openEdit = (row) => {
    setForm({
      PartnerName: row.PartnerName, TxType: row.TxType,
      Amount: row.Amount, TxDate: row.TxDate?.slice(0, 10),
      Notes: row.Notes || "", Status: row.Status,
    })
    setEditID(row.TransactionID)
    setModal(true)
  }

  const save = async () => {
    if (!form.PartnerName || !form.Amount) return alert("Partner and amount are required")
    setSaving(true)
    try {
      const op = editID ? "Edit Capital Transaction" : "Add Capital Transaction"
      const payload = editID ? { ...form, TransactionID: editID } : form
      await apiCall(op, payload)
      setModal(false)
      load()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm("Delete this transaction?")) return
    try {
      await apiCall("Delete Capital Transaction", { TransactionID: id })
      load()
    } catch (e) { alert(e.message) }
  }

  // KPIs
  const totalDeposits = txList.filter(t => t.TxType === "Deposit").reduce((s, t) => s + parseFloat(t.Amount || 0), 0)
  const totalWithdraw = txList.filter(t => t.TxType !== "Deposit").reduce((s, t) => s + parseFloat(t.Amount || 0), 0)
  const netCapital    = totalDeposits - totalWithdraw
  const uniquePartners = [...new Set(txList.map(t => t.PartnerName))].length

  const columns = [
    { key: "Reference",   label: "Reference", render: v => <strong>{v}</strong> },
    { key: "PartnerName", label: "Partner" },
    { key: "TxType",      label: "Type",   render: v => <Badge label={v} /> },
    { key: "Amount",      label: "Amount", render: v => fmt(v) },
    { key: "TxDate",      label: "Date",   render: v => v?.slice(0, 10) },
    { key: "Notes",       label: "Notes",  wrap: true, render: v => v || "—" },
    { key: "Status",      label: "Status", render: v => <Badge label={v} /> },
    { key: "_actions",    label: "",       render: (_, row) => (
      <div style={{ display: "flex", gap: 6 }}>
        <Btn variant="outline" size="sm" onClick={() => openEdit(row)}>Edit</Btn>
        <Btn variant="danger"  size="sm" onClick={() => del(row.TransactionID)}>Delete</Btn>
      </div>
    )},
  ]

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginBottom: 28 }}>
        <KPICard label="Net Capital"       value={fmt(netCapital)}    sub="Deposits minus withdrawals" icon="💼" accent="#f97316" />
        <KPICard label="Total Deposits"    value={fmt(totalDeposits)} sub="All time"                   icon="📈" accent="#16a34a" />
        <KPICard label="Total Withdrawals" value={fmt(totalWithdraw)} sub="All time"                   icon="📉" accent="#991b1b" />
        <KPICard label="Partners"          value={uniquePartners}     sub="Distinct partners"          icon="👥" accent="#9333ea" />
      </div>

      <SectionCard title="Capital Transactions" action={<div style={{ display: "flex", gap: 8 }}><Btn variant="outline" onClick={load} title="Refresh">↻</Btn><Btn onClick={openAdd}>+ New Entry</Btn></div>}>
        <DataTable columns={columns} rows={txList} loading={loading} />
      </SectionCard>

      <Modal open={modal} onClose={() => setModal(false)}
        title={editID ? "Edit Capital Transaction" : "New Capital Transaction"}
        footer={<>
          <Btn variant="outline" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        </>}
      >
        <FormGrid>
          <Field label="Partner Name">
            <Input value={form.PartnerName} onChange={e => setForm({ ...form, PartnerName: e.target.value })}
              placeholder="Partner name" list="partner-list" />
            <datalist id="partner-list">
              {partners.map(p => <option key={p} value={p} />)}
            </datalist>
          </Field>
          <Field label="Transaction Type">
            <Select value={form.TxType} onChange={e => setForm({ ...form, TxType: e.target.value })}>
              <option>Deposit</option>
              <option>Withdrawal</option>
              <option>Profit Distribution</option>
            </Select>
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
              <option>Under Review</option>
            </Select>
          </Field>
          <Field label="Notes" full>
            <Textarea value={form.Notes} onChange={e => setForm({ ...form, Notes: e.target.value })} placeholder="Optional notes..." />
          </Field>
        </FormGrid>
      </Modal>
    </div>
  )
}
