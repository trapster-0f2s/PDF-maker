import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createInvoice, updateInvoice, getInvoice } from '../utils/api';

const today    = () => new Date().toISOString().split('T')[0];
const nextWeek = () => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; };
const genInvNo = () => { const d = new Date(); return `INV-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}${String(Math.floor(Math.random()*900)+100)}`; };

export default function InvoiceForm({ notify }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    invoiceNumber: genInvNo(),
    guestName: '', guestEmail: '', guestPhone: '',
    checkIn: today(), checkOut: nextWeek(),
    lineItems: [{ description: 'House Accommodation', quantity: 7, unitPrice: 1200 }],
    taxRate: 15, amountPaid: 0, notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getInvoice(id)
      .then(inv => {
        setForm({
          invoiceNumber: inv.invoiceNumber,
          guestName: inv.guestName, guestEmail: inv.guestEmail, guestPhone: inv.guestPhone || '',
          checkIn:  inv.checkIn.split('T')[0],
          checkOut: inv.checkOut.split('T')[0],
          lineItems: inv.lineItems,
          taxRate: inv.taxRate, amountPaid: inv.amountPaid, notes: inv.notes || '',
        });
      })
      .catch(err => {
        console.error('Invoice form load failed', err);
        notify?.('Unable to load invoice');
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, notify]);

  const set     = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setLine = (i, key, val) => {
    const lines = [...form.lineItems];
    lines[i] = { ...lines[i], [key]: key === 'description' ? val : Number(val) };
    setForm(f => ({ ...f, lineItems: lines }));
  };
  const addLine = () => setForm(f => ({ ...f, lineItems: [...f.lineItems, { description: '', quantity: 1, unitPrice: 0 }] }));
  const rmLine  = (i) => setForm(f => ({ ...f, lineItems: f.lineItems.filter((_, j) => j !== i) }));

  const subtotal = form.lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const tax      = subtotal * (form.taxRate / 100);
  const total    = subtotal + tax;
  const balance  = total - form.amountPaid;
  const fmtNAD   = n => 'N$ ' + Number(n).toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await updateInvoice(id, form);
        notify('Invoice updated');
        navigate(`/invoices/${id}`);
      } else {
        const res = await createInvoice(form);
        notify('Invoice created');
        navigate(`/invoices/${res.id}`);
      }
    } catch (err) {
      notify(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Invoice' : 'New Invoice'}</h1>
          <p className="page-sub">{isEdit ? `Editing ${form.invoiceNumber}` : 'Create a new guest invoice'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div className="card">
              <div className="card-header"><span className="card-title">Invoice Details</span></div>
              <div className="card-body">
                <div className="form-row">
                  <div className="field"><label>Invoice Number</label><input value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} required /></div>
                  <div className="field"><label>Tax Rate (%)</label><input type="number" min="0" max="100" value={form.taxRate} onChange={e => set('taxRate', Number(e.target.value))} /></div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Guest Information</span></div>
              <div className="card-body form-grid">
                <div className="form-row">
                  <div className="field"><label>Full Name *</label><input value={form.guestName} onChange={e => set('guestName', e.target.value)} required placeholder="John Doe" /></div>
                  <div className="field"><label>Email *</label><input type="email" value={form.guestEmail} onChange={e => set('guestEmail', e.target.value)} required /></div>
                </div>
                <div className="field"><label>Phone</label><input value={form.guestPhone} onChange={e => set('guestPhone', e.target.value)} placeholder="+264 81 000 0000" /></div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Stay Details</span></div>
              <div className="card-body form-grid">
                <div className="form-row">
                  <div className="field"><label>Check-in *</label><input type="date" value={form.checkIn} onChange={e => set('checkIn', e.target.value)} required /></div>
                  <div className="field"><label>Check-out *</label><input type="date" value={form.checkOut} onChange={e => set('checkOut', e.target.value)} required /></div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">Line Items</span>
                <button type="button" className="btn btn-outline btn-sm" onClick={addLine}>+ Add Item</button>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 80px 120px 36px', gap: 8, marginBottom: 6 }}>
                  {['Description','Qty','Unit Price',''].map(h => (
                    <div key={h} style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                  ))}
                </div>
                {form.lineItems.map((line, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 80px 120px 36px', gap: 8, marginBottom: 8 }}>
                    <input value={line.description} onChange={e => setLine(i, 'description', e.target.value)} placeholder="Description" required />
                    <input type="number" min="1" value={line.quantity} onChange={e => setLine(i, 'quantity', e.target.value)} />
                    <input type="number" min="0" value={line.unitPrice} onChange={e => setLine(i, 'unitPrice', e.target.value)} />
                    <button type="button" className="btn btn-icon" style={{ color: 'var(--red-fg)', borderColor: 'var(--red-bg)' }}
                      onClick={() => rmLine(i)} disabled={form.lineItems.length === 1}>×</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Notes</span></div>
              <div className="card-body">
                <div className="field"><textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional payment notes..." /></div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ position: 'sticky', top: 20 }}>
              <div className="card-header"><span className="card-title">Summary</span></div>
              <div className="card-body">
                <div className="totals-block">
                  <div className="total-row"><span>Subtotal</span><span>{fmtNAD(subtotal)}</span></div>
                  <div className="total-row"><span>VAT ({form.taxRate}%)</span><span>{fmtNAD(tax)}</span></div>
                  <div className="total-row final"><span>Total</span><span>{fmtNAD(total)}</span></div>
                </div>
                <hr className="divider" />
                <div className="field">
                  <label>Amount Paid (N$)</label>
                  <input type="number" min="0" step="0.01" value={form.amountPaid} onChange={e => set('amountPaid', Number(e.target.value))} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <div className="total-row" style={{ fontWeight: 500, color: balance > 0 ? 'var(--red-fg)' : 'var(--green-fg)' }}>
                    <span>Balance Due</span><span>{fmtNAD(Math.max(0, balance))}</span>
                  </div>
                </div>
                <hr className="divider" />
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
                  {saving ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}
                </button>
                <button type="button" className="btn btn-outline" style={{ width: '100%', marginTop: 8 }} onClick={() => navigate(-1)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}