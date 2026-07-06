import { useState } from "react"

const USERS = [
  { username: "Houda", password: "Pro123456", fullName: "Houda" },
  { username: "mhd",   password: "Pro123456", fullName: "Mohammed Alkholy" },
]

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)

  const submit = () => {
    setError("")
    if (!username || !password) { setError("Please enter username and password"); return }
    setLoading(true)
    setTimeout(() => {
      const user = USERS.find(
        u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
      )
      if (user) {
        sessionStorage.setItem("FullName", user.fullName)
        sessionStorage.setItem("Username", user.username)
        onLogin(user)
      } else {
        setError("Invalid username or password")
      }
      setLoading(false)
    }, 600)
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#1a2535",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Cairo, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        @keyframes fadeIn { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        .login-input:focus { outline:none; border-color:#f97316 !important; box-shadow:0 0 0 3px rgba(249,115,22,0.15); }
        .login-btn:hover { background:#ea6c0a !important; }
        .login-btn:disabled { opacity:0.7; cursor:not-allowed; }
      `}</style>

      {/* Background decoration */}
      <div style={{
        position: "fixed", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", top: -120, right: -120,
          width: 400, height: 400, borderRadius: "50%",
          background: "rgba(249,115,22,0.08)",
        }} />
        <div style={{
          position: "absolute", bottom: -80, left: -80,
          width: 300, height: 300, borderRadius: "50%",
          background: "rgba(249,115,22,0.05)",
        }} />
      </div>

      {/* Card */}
      <div style={{
        background: "white", borderRadius: 20, padding: "44px 40px",
        width: 420, maxWidth: "92vw",
        boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
        animation: "fadeIn 0.3s ease",
        position: "relative", zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💰</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#1a2535" }}>Finance ERP</div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Sign in to your account</div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "#fee2e2", color: "#991b1b",
            padding: "10px 14px", borderRadius: 9,
            fontSize: 13, fontWeight: 600, marginBottom: 18,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Username */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>
            Username
          </label>
          <input
            className="login-input"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Enter your username"
            autoComplete="username"
            style={{
              width: "100%", fontFamily: "Cairo, sans-serif",
              fontSize: 14, padding: "12px 14px",
              border: "1.5px solid #e4e9f0", borderRadius: 10,
              background: "#f8fafc", color: "#1a2535",
              transition: "0.15s", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 6 }}>
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              className="login-input"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="Enter your password"
              autoComplete="current-password"
              style={{
                width: "100%", fontFamily: "Cairo, sans-serif",
                fontSize: 14, padding: "12px 44px 12px 14px",
                border: "1.5px solid #e4e9f0", borderRadius: 10,
                background: "#f8fafc", color: "#1a2535",
                transition: "0.15s", boxSizing: "border-box",
              }}
            />
            <button onClick={() => setShowPass(s => !s)} style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              fontSize: 16, color: "#94a3b8", padding: 4,
            }}>{showPass ? "🙈" : "👁"}</button>
          </div>
        </div>

        {/* Submit */}
        <button
          className="login-btn"
          onClick={submit}
          disabled={loading}
          style={{
            width: "100%", background: "#f97316", color: "white",
            border: "none", borderRadius: 10, padding: "13px",
            fontSize: 15, fontWeight: 700, cursor: "pointer",
            fontFamily: "Cairo, sans-serif", transition: "0.15s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {loading ? "Signing in…" : "Sign In →"}
        </button>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "#cbd5e1" }}>
          Finance ERP © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
