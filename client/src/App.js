import React, { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard     from './pages/Dashboard';
import InvoiceList   from './pages/InvoiceList';
import InvoiceForm   from './pages/InvoiceForm';
import InvoiceDetail from './pages/InvoiceDetail';

function Toast({ message, onDone }) {
  React.useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div className="toast">{message}</div>;
}

export default function App() {
  const [toast, setToast] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const notify = (msg) => setToast(msg);

  return (
    <div className="layout">
      <aside className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-mark"><img src="/chateau-serene-logo.png" alt="Chateau Serene logo" /></div>
          <div className="logo-text">
            <div className="logo-name">Chateau Serene</div>
            <div className="logo-sub">Invoice Manager</div>
          </div>
        </div>
        <nav>
          {[
            { to: '/',             icon: '▦', label: 'Dashboard'   },
            { to: '/invoices',     icon: '≡', label: 'Invoices'    },
            { to: '/invoices/new', icon: '+', label: 'New Invoice'  },
          ].map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>
        <button type="button" className="sidebar-toggle" onClick={() => setSidebarCollapsed(c => !c)}>
          {sidebarCollapsed ? '→' : '←'}
        </button>
      </aside>

      <main className="main" style={{ marginLeft: sidebarCollapsed ? 88 : 220 }}>
        <Routes>
          <Route path="/"                  element={<Dashboard   notify={notify} />} />
          <Route path="/invoices"          element={<InvoiceList notify={notify} />} />
          <Route path="/invoices/new"      element={<InvoiceForm notify={notify} />} />
          <Route path="/invoices/:id/edit" element={<InvoiceForm notify={notify} />} />
          <Route path="/invoices/:id"      element={<InvoiceDetail notify={notify} />} />
        </Routes>
      </main>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}