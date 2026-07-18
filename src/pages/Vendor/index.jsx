import { useState, useEffect } from "react"
import { apiCall } from "../../shared/api.js"
import { KPICard, SectionCard, DataTable, Btn, Modal, FormGrid, Field, Input } from "../../shared/UI.jsx"

export default function VendorPage() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [vendorName, setVendorName] = useState("")
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiCall("Get Vendor List")
      setVendors(res.List0 || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!vendorName.trim()) return alert("Vendor Name is required")
    setSaving(true)
    try {
      await apiCall("Add Vendor", { VendorName: vendorName })
      setModal(false)
      setVendorName("")
      load()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  const filtered = vendors.filter(v => 
    !search || v.VendorName?.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    { key: "VendorID", label: "Vendor ID", render: v => <strong>#{v}</strong> },
    { key: "VendorName", label: "Vendor Name" }
  ]

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 28 }}>
        <KPICard label="Total Vendors" value={vendors.length} sub="Registered in master" icon="📦" accent="#f97316" />
      </div>

      <SectionCard 
        title="Vendor Master" 
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="outline" onClick={load} title="Refresh">↻</Btn>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              style={{ padding: "9px 13px", border: "1.5px solid #e4e9f0", borderRadius: 9, fontSize: 14, fontFamily: "inherit", width: 180 }} />
            <Btn onClick={() => setModal(true)}>+ Add Vendor</Btn>
          </div>
        }
      >
        <DataTable columns={columns} rows={filtered} loading={loading} />
      </SectionCard>

      <Modal open={modal} onClose={() => setModal(false)}
        title="Add Vendor"
        footer={<>
          <Btn variant="outline" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Vendor"}</Btn>
        </>}
      >
        <FormGrid>
          <Field label="Vendor Name" full>
            <Input value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="Enter vendor name" />
          </Field>
        </FormGrid>
      </Modal>
    </div>
  )
}
