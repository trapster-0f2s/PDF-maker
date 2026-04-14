console.log('SUPABASE URL:', process.env.REACT_APP_SUPABASE_URL);
console.log('SUPABASE KEY:', process.env.REACT_APP_SUPABASE_ANON_KEY);

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default supabase;

const normalizeInvoice = (invoice) => ({
  ...invoice,
  id: invoice.id || invoice._id,
  invoiceNumber: invoice.invoiceNumber || invoice.invoice_number,
  guestName: invoice.guestName || invoice.guest_name,
  guestEmail: invoice.guestEmail || invoice.guest_email,
  guestPhone: invoice.guestPhone || invoice.guest_phone,
  checkIn: invoice.checkIn || invoice.check_in,
  checkOut: invoice.checkOut || invoice.check_out,
  taxRate: invoice.taxRate ?? invoice.tax_rate,
  amountPaid: invoice.amountPaid ?? invoice.amount_paid,
  lineItems: invoice.lineItems || invoice.line_items || [],
  createdAt: invoice.createdAt || invoice.created_at,
  updatedAt: invoice.updatedAt || invoice.updated_at,
});

function makeError(error) {
  if (!error) return new Error('Unknown error');
  const message = typeof error === 'string'
    ? error
    : error.message || error.msg || JSON.stringify(error);
  const err = new Error(message);
  if (typeof error === 'object' && error !== null) {
    err.code = error.code;
    err.details = error.details;
    err.hint = error.hint;
  }
  return err;
}

function calcStatus(lineItems, taxRate, amountPaid) {
  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const total    = subtotal + subtotal * (taxRate / 100);
  if (amountPaid <= 0)     return 'unpaid';
  if (amountPaid < total)  return 'partial';
  return 'paid';
}

export const getInvoices = async ({ search, status, page = 1, limit = 15 }) => {
  let query = supabase.from('invoices').select('*', { count: 'exact' });
  if (status) query = query.eq('status', status);
  if (search) query = query.or(`guest_name.ilike.%${search}%,invoice_number.ilike.%${search}%`);
  const from = (page - 1) * limit;
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);
  if (error) throw makeError(error);
  return { invoices: data.map(normalizeInvoice), total: count, pages: Math.ceil(count / limit) };
};

export const getInvoice = async (id) => {
  if (!id || id === 'undefined') throw new Error('Invalid invoice ID');
  const { data, error } = await supabase.from('invoices').select('*').eq('id', id).single();
  if (error) throw makeError(error);
  return normalizeInvoice(data);
};

export const createInvoice = async (form) => {
  const { data, error } = await supabase.from('invoices').insert({
    invoice_number: form.invoiceNumber,
    guest_name:     form.guestName,
    guest_email:    form.guestEmail,
    guest_phone:    form.guestPhone || '',
    check_in:       form.checkIn,
    check_out:      form.checkOut,
    line_items:     form.lineItems,
    tax_rate:       form.taxRate,
    amount_paid:    form.amountPaid,
    status:         calcStatus(form.lineItems, form.taxRate, form.amountPaid),
    notes:          form.notes || '',
  }).select().single();
  if (error) throw makeError(error);
  return normalizeInvoice(data);
};

export const updateInvoice = async (id, form) => {
  const { data, error } = await supabase.from('invoices').update({
    invoice_number: form.invoiceNumber,
    guest_name:     form.guestName,
    guest_email:    form.guestEmail,
    guest_phone:    form.guestPhone || '',
    check_in:       form.checkIn,
    check_out:      form.checkOut,
    line_items:     form.lineItems,
    tax_rate:       form.taxRate,
    amount_paid:    form.amountPaid,
    status:         calcStatus(form.lineItems, form.taxRate, form.amountPaid),
    notes:          form.notes || '',
    updated_at:     new Date().toISOString(),
  }).eq('id', id).select().single();
  if (error) throw makeError(error);
  return normalizeInvoice(data);
};

export const deleteInvoice = async (id) => {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw makeError(error);
};

export const getStats = async () => {
  const { data, error } = await supabase.from('invoices').select('*');
  if (error) throw makeError(error);
  let revenue = 0, outstanding = 0;
  data.forEach(inv => {
    const items = inv.line_items || [];
    const sub     = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const total   = sub + sub * (inv.tax_rate / 100);
    const balance = total - inv.amount_paid;
    revenue     += total;
    outstanding += Math.max(0, balance);
  });
  return {
    total:       data.length,
    paid:        data.filter(i => i.status === 'paid').length,
    partial:     data.filter(i => i.status === 'partial').length,
    unpaid:      data.filter(i => i.status === 'unpaid').length,
    revenue,
    outstanding,
  };
};