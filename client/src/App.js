import React, { useCallback, useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import InvoiceList from './pages/InvoiceList';
import InvoiceForm from './pages/InvoiceForm';
import InvoiceDetail from './pages/InvoiceDetail';

function Toast({ message, onDone }) {
  React.useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return <div className="toast">{message}</div>;
}

function LoginLanding({ onLogin, notify }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();

    if (username.trim() === 'admin' && password === 'admin') {
      onLogin();
      return;
    }

    notify('Invalid username or password');
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <img className="auth-logo" src="/ChateauLogo.JPG" alt="Chateau Serene logo" />
        <div className="auth-copy">
          <p className="auth-kicker">Welcome</p>
          <h1>Chateau Serene Trading CC</h1>
          <p>Sign in to manage invoices.</p>
        </div>

        <div className="field">
          <label>Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        <button type="submit" className="btn btn-primary full-width">Login</button>
      </form>
    </div>
  );
}

export default function App() {
  const [toast, setToast] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('invoiceAuth') === 'true');
  const notify = useCallback((msg) => setToast(msg), []);

  const handleLogin = () => {
    localStorage.setItem('invoiceAuth', 'true');
    setIsAuthenticated(true);
    notify('Welcome');
  };

  const handleLogout = () => {
    localStorage.removeItem('invoiceAuth');
    setIsAuthenticated(false);
    setSidebarCollapsed(false);
    notify('Logged out');
  };

  if (!isAuthenticated) {
    return (
      <>
        <LoginLanding onLogin={handleLogin} notify={notify} />
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </>
    );
  }

  return (
    <div className={`layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <aside className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-mark"><img src="/ChateauLogo.JPG" alt="Chateau Serene logo" /></div>
          <div className="logo-text">
            <div className="logo-name">Chateau Serene</div>
            <div className="logo-sub">Invoice Manager</div>
          </div>
        </div>
        <nav>
          {[
            { to: '/', icon: 'D', label: 'Dashboard' },
            { to: '/invoices', icon: 'I', label: 'Invoices' },
            { to: '/invoices/new', icon: '+', label: 'New Invoice' },
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
          {sidebarCollapsed ? 'Expand' : 'Collapse'}
        </button>
        <button type="button" className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard notify={notify} />} />
          <Route path="/invoices" element={<InvoiceList notify={notify} />} />
          <Route path="/invoices/new" element={<InvoiceForm notify={notify} />} />
          <Route path="/invoices/:id/edit" element={<InvoiceForm notify={notify} />} />
          <Route path="/invoices/:id" element={<InvoiceDetail notify={notify} />} />
        </Routes>
      </main>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
