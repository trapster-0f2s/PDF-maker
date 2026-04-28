import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getInvoice, deleteInvoice } from '../utils/api';
import generatePDF from '../utils/generatePDF';

const fmtNAD  = n => 'N$ ' + Number(n).toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const nights  = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));

export default function InvoiceDetail({ notify }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inv,     setInv]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInvoice(id)
      .then(invoice => setInv(invoice))
      .catch(err => {
        console.error('Invoice load failed', err);
        notify?.('Unable to load invoice');
      })
      .finally(() => setLoading(false));
  }, [id, notify]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${inv.invoiceNumber}?`)) return;
    await deleteInvoice(id);
    notify('Invoice deleted');
    navigate('/invoices');
  };

  const handlePDF = async () => {
    await generatePDF(inv);
    notify('PDF downloaded');
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!inv)    return <div className="loading">Invoice not found</div>;

  const lineItems = inv.lineItems || inv.line_items || [];
  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax      = subtotal * (inv.taxRate / 100);
  const total    = subtotal + tax;
  const balance  = total - inv.amountPaid;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/invoices" className="btn btn-icon">←</Link>
          <div>
            <h1 className="page-title">{inv.invoiceNumber}</h1>
            <p className="page-sub">Created {fmtDate(inv.createdAt)}</p>
          </div>
          <span className={`badge badge-${inv.status}`}>{inv.status}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={handlePDF}>↓ Download PDF</button>
          <Link to={`/invoices/${id}/edit`} className="btn btn-outline">Edit</Link>
          <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="detail-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ padding: '22px 22px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="logo-mark"><img src="/ChateauLogo.JPG" alt="Chateau Serene logo" /></div>
                <div>
                  <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 15 }}>Chateau Serene</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>Windhoek, Namibia · +264 61 000 0000</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Invoice No.</div>
                <div style={{ fontWeight: 500 }}>{inv.invoiceNumber}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Date</div>
                <div style={{ fontSize: 13 }}>{fmtDate(inv.createdAt)}</div>
              </div>
            </div>

            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Billed To</div>
                  <div style={{ fontWeight: 500, fontSize: 15 }}>{inv.guestName}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{inv.guestEmail}</div>
                  {inv.guestPhone && <div style={{ fontSize: 13, color: 'var(--muted)' }}>{inv.guestPhone}</div>}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Stay Period</div>
                  <div style={{ fontWeight: 500 }}>{fmtDate(inv.checkIn)} — {fmtDate(inv.checkOut)}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{nights(inv.checkIn, inv.checkOut)} nights</div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                <thead>
                  <tr>
                    {['Description','Qty','Unit Price','Amount'].map(h => (
                      <th key={h} style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 0', borderBottom: '1px solid var(--border)', textAlign: ['Qty','Unit Price','Amount'].includes(h) ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(inv.lineItems || inv.line_items || []).map((item, i) => (
                    <tr key={i}>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>{item.description}</td>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13, textAlign: 'right' }}>{item.quantity}</td>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13, textAlign: 'right' }}>{fmtNAD(item.unitPrice)}</td>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13, textAlign: 'right', fontWeight: 500 }}>{fmtNAD(item.quantity * item.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: 260 }} className="totals-block">
                  <div className="total-row"><span>Subtotal</span><span>{fmtNAD(subtotal)}</span></div>
                  <div className="total-row"><span>VAT ({inv.taxRate}%)</span><span>{fmtNAD(tax)}</span></div>
                  <div className="total-row" style={{ color: 'var(--green-fg)' }}><span>Amount Paid</span><span>- {fmtNAD(inv.amountPaid)}</span></div>
                  <div className="total-row final"><span>Balance Due</span><span style={{ color: balance > 0 ? 'var(--red-fg)' : 'var(--green-fg)' }}>{fmtNAD(Math.max(0, balance))}</span></div>
                </div>
              </div>

              {inv.notes && <><hr className="divider" /><div style={{ fontSize: 12, color: 'var(--muted)' }}><strong>Notes:</strong> {inv.notes}</div></>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Payment Summary</span></div>
            <div className="card-body">
              {[
                { label: 'Total Amount', value: fmtNAD(total),                   color: 'var(--text)' },
                { label: 'Amount Paid',  value: fmtNAD(inv.amountPaid),           color: 'var(--green-fg)' },
                { label: 'Balance Due',  value: fmtNAD(Math.max(0, balance)),     color: balance > 0 ? 'var(--red-fg)' : 'var(--green-fg)' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{r.label}</span>
                  <span style={{ fontWeight: 500, color: r.color }}>{r.value}</span>
                </div>
              ))}
              <div style={{ marginTop: 14, textAlign: 'center' }}>
                <span className={`badge badge-${inv.status}`} style={{ fontSize: 13, padding: '6px 16px' }}>{inv.status.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Actions</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handlePDF}>↓ Download PDF</button>
              <Link to={`/invoices/${id}/edit`} className="btn btn-outline" style={{ width: '100%', textAlign: 'center' }}>Edit Invoice</Link>
              <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleDelete}>Delete Invoice</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}