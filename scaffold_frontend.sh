#!/bin/bash
mkdir -p frontend/src/{api,components/layout,components/ui,components/forms,pages,context,hooks,types}

touch frontend/src/api/{auth,nova,reconcile,cases,settlements,audit,report}.ts
touch frontend/src/components/layout/{Sidebar,Header,PageShell}.tsx
touch frontend/src/components/ui/{KpiCard,StatusBadge,DataTable,StageProgress,ExceptionDrawer,NovaStreamCard,ModuleCoverageRow}.tsx
touch frontend/src/components/forms/{LoginForm,DecisionForm}.tsx
touch frontend/src/pages/{LoginPage,DashboardPage,TimelinePage,NovaExplorerPage,ExceptionsPage,SettlementPage,ReportPage}.tsx
touch frontend/src/context/AuthContext.tsx
touch frontend/src/hooks/{useReconcile,useCases,useReport}.ts
touch frontend/src/types/index.ts
touch frontend/src/{App,main}.tsx
touch frontend/index.html
touch frontend/vite.config.ts
touch frontend/tailwind.config.ts
touch frontend/tsconfig.json

cat << 'EOF' > frontend/index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LedgerSense | FIN-11</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

cat << 'EOF' > frontend/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

cat << 'EOF' > frontend/src/App.tsx
import React from 'react'

export default function App() {
  return (
    <div>
      <h1>LedgerSense Modular React App</h1>
    </div>
  )
}
EOF

echo "Scaffolded React structure."
