import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats, getInvoices } from '../utils/api';
import generatePDF from '../utils/generatePDF';

const fmtNAD  = n => 'N$ ' + Number(n).toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Dashboard({ notify }) {
  const [stats,   setStats]   = useState(null);
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getInvoices({ limit: 5 })])
      .then(([s, r]) => { setStats(s); setRecent(r.invoices); })
      .catch(err => {
        console.error('Dashboard load failed', err);
        notify?.('Unable to load dashboard data');
        setStats({ total: 0, revenue: 0, outstanding: 0, paid: 0, partial: 0, unpaid: 0 });
        setRecent([]);
      })
      .finally(() => setLoading(false));
  }, [notify]);

  const handlePDF = async (inv) => {
    await generatePDF(inv);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Overview of your invoicing activity</p>
        </div>
        <Link to="/invoices/new" className="btn btn-primary">+ New Invoice</Link>
      </div>

      <div className="stats-grid">
        {[
          { label: 'Total Invoices', value: stats?.total ?? 0,               sub: 'all time' },
          { label: 'Total Revenue',  value: fmtNAD(stats?.revenue ?? 0),     sub: 'incl. tax' },
          { label: 'Outstanding',    value: fmtNAD(stats?.outstanding ?? 0), sub: `${stats?.unpaid ?? 0} unpaid + ${stats?.partial ?? 0} partial` },
          { label: 'Paid',           value: stats?.paid ?? 0,                sub: 'fully settled' },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Invoices</span>
          <Link to="/invoices" className="btn btn-outline btn-sm">View All</Link>
        </div>
        {recent.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📄</div>
            <p>No invoices yet. <Link to="/invoices/new">Create your first one.</Link></p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Invoice</th><th>Guest</th><th>Stay</th><th>Total</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {recent.map(inv => {
                  const lineItems = inv.lineItems || inv.line_items || [];
                  const sub   = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
                  const total = sub + sub * ((inv.taxRate ?? inv.tax_rate) / 100);
                  return (
                    <tr key={inv.id}>
                      <td><Link to={`/invoices/${inv.id}`} style={{ fontWeight: 500 }}>{inv.invoiceNumber || inv.invoice_number}</Link></td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{inv.guestName || inv.guest_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{inv.guestEmail || inv.guest_email}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>{fmtDate(inv.checkIn || inv.check_in)} — {fmtDate(inv.checkOut || inv.check_out)}</td>
                      <td style={{ fontWeight: 500 }}>{fmtNAD(total)}</td>
                      <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                      <td><button className="btn btn-outline btn-sm" onClick={() => handlePDF(inv)}>↓ PDF</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}