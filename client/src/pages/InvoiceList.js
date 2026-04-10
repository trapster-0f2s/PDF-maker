import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import{ getInvoice, deleteInvoice } from '../utils/api';
import generatePDF from '../utils/generatePDF';

const fmtNAD  = n => 'N$ ' + Number(n).toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function InvoiceList({ notify }) {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [page,     setPage]     = useState(1);
  const [pages,    setPages]    = useState(1);

  const fetchInvoices = useCallback(() => {
    setLoading(true);
    getInvoices({ search, status, page, limit: 15 })
      .then(r => { setInvoices(r.data.invoices); setPages(r.data.pages); })
      .finally(() => setLoading(false));
  }, [search, status, page]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleDelete = async (id, num) => {
    if (!window.confirm(`Delete invoice ${num}?`)) return;
    await deleteInvoice(id);
    notify(`${num} deleted`);
    fetchInvoices();
  };

  const handlePDF = (inv) => {
    generatePDF(inv);
  };
    

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-sub">Manage all guest invoices</p>
        </div>
        <Link to="/invoices/new" className="btn btn-primary">+ New Invoice</Link>
      </div>

      <div className="search-bar">
        <input className="search-input" placeholder="Search by guest or invoice number..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className="search-input" style={{ flex: '0 0 140px' }} value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>

      <div className="card">
        {loading ? <div className="loading">Loading...</div> : invoices.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📄</div>
            <p>No invoices found. <Link to="/invoices/new">Create one.</Link></p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Invoice</th><th>Guest</th><th>Room</th><th>Check-in</th><th>Total</th><th>Paid</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const sub   = inv.lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
                  const total = sub + sub * (inv.taxRate / 100);
                  return (
                    <tr key={inv._id}>
                      <td><Link to={`/invoices/${inv._id}`} style={{ fontWeight: 500 }}>{inv.invoiceNumber}</Link></td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{inv.guestName}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{inv.guestEmail}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>{inv.roomType}</td>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(inv.checkIn)}</td>
                      <td style={{ fontWeight: 500 }}>{fmtNAD(total)}</td>
                      <td style={{ color: 'var(--green-fg)' }}>{fmtNAD(inv.amountPaid)}</td>
                      <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => navigate(`/invoices/${inv._id}/edit`)}>Edit</button>
                          <button className="btn btn-outline btn-sm" onClick={() => handlePDF(inv)}>↓ PDF</button>
                          <button className="btn btn-danger btn-sm"  onClick={() => handleDelete(inv._id, inv.invoiceNumber)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16 }}>
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPage(p)}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}