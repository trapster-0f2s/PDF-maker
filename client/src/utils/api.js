import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export default supabase;

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
  if (error) throw error;
  return { invoices: data, total: count, pages: Math.ceil(count / limit) };
};

export const getInvoice = async (id) => {
  const { data, error } = await supabase.from('invoices').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
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
  if (error) throw error;
  return data;
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
  if (error) throw error;
  return data;
};

export const deleteInvoice = async (id) => {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
};

export const getStats = async () => {
  const { data, error } = await supabase.from('invoices').select('*');
  if (error) throw error;
  let revenue = 0, outstanding = 0;
  data.forEach(inv => {
    const sub     = inv.line_items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
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