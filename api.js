const API_URL = "https://sila.silasystem.com:7104/General/GeneralAPI/"

export async function apiCall(operation, params = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Operation: operation, ...params }),
  })
  const data = await res.json()
  if (data.State !== 0) throw new Error(data.Message || "API error")
  return data
}

export const fmt = (n) =>
  "$" + (parseFloat(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const today = () => new Date().toISOString().slice(0, 10)

export const STATUS_COLORS = {
  Pending:  { bg: "#fef3c7", color: "#92400e" },
  Partial:  { bg: "#fff7ed", color: "#f97316" },
  Paid:     { bg: "#dcfce7", color: "#16a34a" },
  Overdue:  { bg: "#fee2e2", color: "#991b1b" },
  Posted:   { bg: "#dcfce7", color: "#16a34a" },
  Draft:    { bg: "#f1f5f9", color: "#64748b" },
  "Under Review": { bg: "#dbeafe", color: "#1d4ed8" },
  Deposit:        { bg: "#dcfce7", color: "#16a34a" },
  Withdrawal:     { bg: "#fee2e2", color: "#991b1b" },
  "Profit Distribution": { bg: "#ede9fe", color: "#7c3aed" },
  Receipt:  { bg: "#dcfce7", color: "#16a34a" },
  Payment:  { bg: "#fee2e2", color: "#991b1b" },
}
