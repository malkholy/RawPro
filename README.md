# RawPro — Finance ERP

Live: https://malkholy.github.io/RawPro

## Setup & Run Locally
```bash
npm install
npm run dev
```

## Deploy to GitHub Pages
```bash
# First time — init git and link to repo
git init
git remote add origin https://github.com/malkholy/RawPro.git
git add .
git commit -m "Initial Finance ERP"
git push -u origin main

# Deploy to GitHub Pages
npm run deploy
```

This runs `vite build` then pushes `dist/` to the `gh-pages` branch automatically.

After deploying, enable GitHub Pages in repo Settings → Pages → Branch: `gh-pages`.

## API
- Endpoint: `https://sila.silasystem.com:7104/General/GeneralAPI/`
- SP: `dbo.APIFinanceOperation`

## File Structure
```
src/
├── App.jsx                        ← Sidebar + routing + layout
├── main.jsx                       ← Entry point
├── shared/
│   ├── api.js                     ← apiCall, fmt, STATUS_COLORS
│   └── UI.jsx                     ← All shared components
└── pages/
    ├── Capital/index.jsx
    ├── Treasury/index.jsx
    ├── VendorInvoice/index.jsx
    ├── CustomerInvoice/index.jsx
    ├── Statements/index.jsx
    └── Reports/index.jsx
```
