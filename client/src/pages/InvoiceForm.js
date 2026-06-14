import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createInvoice, updateInvoice, getInvoice } from '../utils/api';
import { COUNTRY_CODES, DEFAULT_COUNTRY } from '../utils/countryCodes';

const today = () => new Date().toISOString().split('T')[0];
const nextWeek = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
};
const genInvNo = () => {
  const d = new Date();
  return `INV-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 900) + 100)}`;
};

const ACCOMMODATION_DESCRIPTION = 'Accommodation';
const LINE_ITEM_OPTIONS = [
  ACCOMMODATION_DESCRIPTION,
  'Breakfast',
  'Lunch',
  'Dinner',
  'Laundry',
  'Mini Bar',
  'Airport Transfer',
  'Late Checkout',
  'Conference Room',
  'Room Service',
];

const toNumber = (value, fallback = 0) => {
  if (value === '' || value === null || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const getCountry = (iso) => COUNTRY_CODES.find(country => country.iso === iso) || DEFAULT_COUNTRY;

const splitPhoneNumber = (phone = '') => {
  const trimmed = phone.trim();
  if (!trimmed) return { countryIso: DEFAULT_COUNTRY.iso, localPhone: '' };

  const country = [...COUNTRY_CODES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find(item => trimmed.startsWith(item.dialCode));

  if (!country) {
    return { countryIso: DEFAULT_COUNTRY.iso, localPhone: trimmed };
  }

  return {
    countryIso: country.iso,
    localPhone: trimmed.slice(country.dialCode.length).trim(),
  };
};

const buildPhoneNumber = ({ phoneCountry, guestPhone }) => {
  const localPhone = (guestPhone || '').trim();
  if (!localPhone) return '';
  if (localPhone.startsWith('+')) return localPhone;
  return `${getCountry(phoneCountry).dialCode} ${localPhone}`;
};

const normalizeLineItems = (items = []) => {
  if (!items.length) {
    return [{ description: ACCOMMODATION_DESCRIPTION, quantity: 7, unitPrice: 1200 }];
  }

  return items.map(item => ({
    description: item.description || '',
    quantity: item.quantity ?? '',
    unitPrice: item.unitPrice ?? '',
  }));
};

export default function InvoiceForm({ notify }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    invoiceNumber: genInvNo(),
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    phoneCountry: DEFAULT_COUNTRY.iso,
    roomType: 'Standard',
    checkIn: today(),
    checkOut: nextWeek(),
    lineItems: [{ description: ACCOMMODATION_DESCRIPTION, quantity: 7, unitPrice: 1200 }],
    taxRate: 15,
    amountPaid: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const phonePattern = /^[0-9\s\-()]{5,20}$/;
  const isValidPhone = (phone) => phone === '' || phonePattern.test(phone);
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    getInvoice(id)
      .then(inv => {
        const phone = splitPhoneNumber(inv.guestPhone || '');
        setForm({
          invoiceNumber: inv.invoiceNumber,
          guestName: inv.guestName,
          guestEmail: inv.guestEmail,
          guestPhone: phone.localPhone,
          phoneCountry: phone.countryIso,
          roomType: inv.roomType || '',
          checkIn: inv.checkIn.split('T')[0],
          checkOut: inv.checkOut.split('T')[0],
          lineItems: normalizeLineItems(inv.lineItems),
          taxRate: inv.taxRate ?? 15,
          amountPaid: toNumber(inv.amountPaid) > 0 ? String(inv.amountPaid) : '',
          notes: inv.notes || '',
        });
      })
      .catch(err => {
        console.error('Invoice form load failed', err);
        notify?.('Unable to load invoice');
      })
      .finally(() => setLoading(false));
  }, [id, isEdit, notify]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setLine = (i, key, val) => {
    setForm(f => ({
      ...f,
      lineItems: f.lineItems.map((line, index) => (
        index === i ? { ...line, [key]: val } : line
      )),
    }));
  };
  const addLine = () => {
    setForm(f => ({
      ...f,
      lineItems: [...f.lineItems, { description: '', quantity: 1, unitPrice: '' }],
    }));
  };
  const rmLine = (i) => {
    setForm(f => ({ ...f, lineItems: f.lineItems.filter((_, j) => j !== i) }));
  };

  const selectedCountry = getCountry(form.phoneCountry);
  const subtotal = form.lineItems.reduce((s, l) => s + toNumber(l.quantity) * toNumber(l.unitPrice), 0);
  const tax = subtotal * (toNumber(form.taxRate) / 100);
  const total = subtotal + tax;
  const balance = total - toNumber(form.amountPaid);
  const fmtNAD = n => 'N$ ' + Number(n).toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidEmail(form.guestEmail)) {
      notify?.('Please enter a valid email address');
      return;
    }
    if (!isValidPhone(form.guestPhone.trim())) {
      notify?.('Please enter a valid local phone number');
      return;
    }
    if (new Date(form.checkOut) <= new Date(form.checkIn)) {
      notify?.('Check-out must be after check-in');
      return;
    }

    const cleanLineItems = form.lineItems.map(line => ({
      description: line.description.trim(),
      quantity: toNumber(line.quantity),
      unitPrice: toNumber(line.unitPrice),
    }));

    if (cleanLineItems.some(line => !line.description)) {
      notify?.('Each line item needs a description');
      return;
    }
    if (cleanLineItems.some(line => line.quantity <= 0)) {
      notify?.('Line item quantities must be greater than zero');
      return;
    }
    if (cleanLineItems.some(line => line.unitPrice < 0)) {
      notify?.('Line item prices cannot be negative');
      return;
    }
    if (toNumber(form.taxRate) < 0 || toNumber(form.taxRate) > 100) {
      notify?.('Tax rate must be between 0 and 100');
      return;
    }
    if (toNumber(form.amountPaid) < 0) {
      notify?.('Amount paid cannot be negative');
      return;
    }

    const { phoneCountry, ...invoiceForm } = form;
    const payload = {
      ...invoiceForm,
      guestPhone: buildPhoneNumber(form),
      lineItems: cleanLineItems,
      taxRate: toNumber(form.taxRate),
      amountPaid: toNumber(form.amountPaid),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateInvoice(id, payload);
        notify?.('Invoice updated');
        navigate(`/invoices/${id}`);
      } else {
        const res = await createInvoice(payload);
        notify?.('Invoice created');
        navigate(`/invoices/${res.id}`);
      }
    } catch (err) {
      notify?.(err.message || 'Save failed');
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
        <div className="invoice-form-grid">
          <div className="form-stack">
            <div className="card">
              <div className="card-header"><span className="card-title">Invoice Details</span></div>
              <div className="card-body">
                <div className="form-row">
                  <div className="field"><label>Invoice Number</label><input value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} required /></div>
                  <div className="field"><label>Tax Rate (%)</label><input type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={e => set('taxRate', e.target.value)} /></div>
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
                <div className="field">
                  <label>Phone</label>
                  <div className="phone-input">
                    <select value={form.phoneCountry} onChange={e => set('phoneCountry', e.target.value)} aria-label="Phone country code">
                      {COUNTRY_CODES.map(country => (
                        <option key={country.iso} value={country.iso}>{country.flag} {country.dialCode} {country.name}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      inputMode="tel"
                      pattern="[0-9\\s\\-()]{5,20}"
                      value={form.guestPhone}
                      onChange={e => set('guestPhone', e.target.value)}
                      placeholder={selectedCountry.example}
                      title="Local number only. Use the dropdown for the country code."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">Stay Details</span></div>
              <div className="card-body form-grid">
                <div className="form-row">
                  <div className="field"><label>Check-in *</label><input type="date" value={form.checkIn} onChange={e => set('checkIn', e.target.value)} required /></div>
                  <div className="field"><label>Check-out *</label><input type="date" value={form.checkOut} onChange={e => set('checkOut', e.target.value)} required /></div>
                </div>
                <div className="field"><label>Room Type *</label><input value={form.roomType} onChange={e => set('roomType', e.target.value)} required placeholder="Standard" /></div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">Line Items</span>
                <button type="button" className="btn btn-outline btn-sm" onClick={addLine}>+ Add Item</button>
              </div>
              <div className="card-body">
                <datalist id="line-item-options">
                  {LINE_ITEM_OPTIONS.map(option => <option value={option} key={option} />)}
                </datalist>
                <div className="line-items-header">
                  {['Description', 'Qty', 'Unit Price', ''].map(h => (
                    <div key={h}>{h}</div>
                  ))}
                </div>
                {form.lineItems.map((line, i) => (
                  <div key={i} className="line-items-row">
                    <input className="line-description-input" list="line-item-options" value={line.description} onChange={e => setLine(i, 'description', e.target.value)} placeholder={ACCOMMODATION_DESCRIPTION} required />
                    <input className="line-qty-input" type="number" min="1" value={line.quantity} onChange={e => setLine(i, 'quantity', e.target.value)} placeholder="1" required />
                    <input className="line-price-input" type="number" min="0" step="0.01" value={line.unitPrice} onChange={e => setLine(i, 'unitPrice', e.target.value)} placeholder="0.00" required />
                    <button type="button" className="btn btn-icon line-remove-btn" onClick={() => rmLine(i)} disabled={form.lineItems.length === 1} aria-label="Remove line item">&times;</button>
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

          <div className="summary-column">
            <div className="card summary-card">
              <div className="card-header"><span className="card-title">Summary</span></div>
              <div className="card-body">
                <div className="totals-block">
                  <div className="total-row"><span>Subtotal</span><span>{fmtNAD(subtotal)}</span></div>
                  <div className="total-row"><span>VAT ({toNumber(form.taxRate)}%)</span><span>{fmtNAD(tax)}</span></div>
                  <div className="total-row final"><span>Total</span><span>{fmtNAD(total)}</span></div>
                </div>
                <hr className="divider" />
                <div className="field">
                  <label>Amount Paid (N$)</label>
                  <input type="number" min="0" step="0.01" value={form.amountPaid} placeholder="0.00" onChange={e => set('amountPaid', e.target.value)} />
                </div>
                <div className="balance-row">
                  <div className="total-row" style={{ fontWeight: 500, color: balance > 0 ? 'var(--red-fg)' : 'var(--green-fg)' }}>
                    <span>Balance Due</span><span>{fmtNAD(Math.max(0, balance))}</span>
                  </div>
                </div>
                <hr className="divider" />
                <button type="submit" className="btn btn-primary full-width" disabled={saving}>
                  {saving ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}
                </button>
                <button type="button" className="btn btn-outline full-width cancel-button" onClick={() => navigate(-1)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
