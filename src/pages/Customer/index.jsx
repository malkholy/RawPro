import { useState, useEffect } from "react"
import { apiCall } from "../../shared/api.js"
import { KPICard, SectionCard, DataTable, Btn, Modal, FormGrid, Field, Input } from "../../shared/UI.jsx"

export default function CustomerPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiCall("Get Customer List")
      setCustomers(res.List0 || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!customerName.trim()) return alert("Customer Name is required")
    setSaving(true)
    try {
      await apiCall("Add Customer", { CustomerName: customerName })
      setModal(false)
      setCustomerName("")
      load()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  const filtered = customers.filter(c => 
    !search || c.CustomerName?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: "CustomerID", label: "Customer ID", render: v => <strong>#{v}</strong> },
    { key: "CustomerName", label: "Customer Name" }
  ]

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 28 }}>
        <KPICard label="Total Customers" value={customers.length} sub="Registered in master" icon="🧾" accent="#f97316" />
      </div>

      <SectionCard 
        title="Customer Master" 
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="outline" onClick={load} title="Refresh">↻</Btn>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              style={{ padding: "9px 13px", border: "1.5px solid #e4e9f0", borderRadius: 9, fontSize: 14, fontFamily: "inherit", width: 180 }} />
            <Btn onClick={() => setModal(true)}>+ Add Customer</Btn>
          </div>
        }
      >
        <DataTable columns={columns} rows={filtered} loading={loading} />
      </SectionCard>

      <Modal open={modal} onClose={() => setModal(false)}
        title="Add Customer"
        footer={<>
          <Btn variant="outline" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Customer"}</Btn>
        </>}
      >
        <FormGrid>
          <Field label="Customer Name" full>
            <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Enter customer name" />
          </Field>
        </FormGrid>
      </Modal>
    </div>
  )
}
