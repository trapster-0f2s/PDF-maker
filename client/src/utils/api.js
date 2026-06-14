// Mock data for local testing (no Supabase needed)
const USE_MOCK_DATA = true;

// Mock Supabase client
const supabase = {
  from: () => ({
    select: () => ({ eq: () => ({ single: () => ({}) }) }),
  }),
};

export default supabase;

// Mock invoice data
let mockInvoices = [
  {
    id: '1',
    invoice_number: 'INV-001',
    guest_name: 'John Doe',
    guest_email: 'john@example.com',
    guest_phone: '555-0101',
    room_type: 'Deluxe',
    check_in: '2026-05-01',
    check_out: '2026-05-05',
    line_items: [
      { id: 1, description: 'Room (4 nights)', quantity: 4, unitPrice: 150 },
      { id: 2, description: 'Breakfast', quantity: 4, unitPrice: 15 },
    ],
    tax_rate: 10,
    amount_paid: 660,
    status: 'paid',
    notes: 'Guest requested early checkout',
    created_at: '2026-05-01T10:00:00Z',
    updated_at: '2026-05-05T14:30:00Z',
  },
  {
    id: '2',
    invoice_number: 'INV-002',
    guest_name: 'Jane Smith',
    guest_email: 'jane@example.com',
    guest_phone: '555-0102',
    room_type: 'Standard',
    check_in: '2026-05-06',
    check_out: '2026-05-08',
    line_items: [
      { id: 1, description: 'Room (2 nights)', quantity: 2, unitPrice: 100 },
    ],
    tax_rate: 10,
    amount_paid: 110,
    status: 'partial',
    notes: '',
    created_at: '2026-05-06T11:00:00Z',
    updated_at: '2026-05-08T10:00:00Z',
  },
  {
    id: '3',
    invoice_number: 'INV-003',
    guest_name: 'Bob Johnson',
    guest_email: 'bob@example.com',
    guest_phone: '555-0103',
    room_type: 'Suite',
    check_in: '2026-05-10',
    check_out: '2026-05-12',
    line_items: [
      { id: 1, description: 'Suite (2 nights)', quantity: 2, unitPrice: 250 },
      { id: 2, description: 'Mini Bar', quantity: 1, unitPrice: 45 },
    ],
    tax_rate: 10,
    amount_paid: 0,
    status: 'unpaid',
    notes: 'Invoice pending',
    created_at: '2026-05-10T09:00:00Z',
    updated_at: '2026-05-12T15:00:00Z',
  },
];

let nextId = 4;

const normalizeInvoice = (invoice) => ({
  ...invoice,
  id: invoice.id || invoice._id,
  invoiceNumber: invoice.invoiceNumber || invoice.invoice_number,
  guestName: invoice.guestName || invoice.guest_name,
  guestEmail: invoice.guestEmail || invoice.guest_email,
  guestPhone: invoice.guestPhone || invoice.guest_phone,
  roomType: invoice.roomType || invoice.room_type,
  checkIn: invoice.checkIn || invoice.check_in,
  checkOut: invoice.checkOut || invoice.check_out,
  taxRate: invoice.taxRate ?? invoice.tax_rate,
  amountPaid: Number(invoice.amountPaid ?? invoice.amount_paid) || 0,
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
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  let filtered = mockInvoices;
  
  if (status) {
    filtered = filtered.filter(inv => inv.status === status);
  }
  
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(inv => 
      inv.guest_name.toLowerCase().includes(s) || 
      inv.invoice_number.toLowerCase().includes(s)
    );
  }
  
  const total = filtered.length;
  const from = (page - 1) * limit;
  const invoices = filtered
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(from, from + limit)
    .map(normalizeInvoice);
  
  return { 
    invoices, 
    total, 
    pages: Math.ceil(total / limit) 
  };
};

export const getInvoice = async (id) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  if (!id || id === 'undefined') throw new Error('Invalid invoice ID');
  
  const invoice = mockInvoices.find(inv => inv.id === id);
  if (!invoice) throw new Error('Invoice not found');
  
  return normalizeInvoice(invoice);
};

export const createInvoice = async (form) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const newInvoice = {
    id: String(nextId++),
    invoice_number: form.invoiceNumber,
    guest_name:     form.guestName,
    guest_email:    form.guestEmail,
    guest_phone:    form.guestPhone || '',
    room_type:      form.roomType,
    check_in:       form.checkIn,
    check_out:      form.checkOut,
    line_items:     form.lineItems,
    tax_rate:       form.taxRate,
    amount_paid:    Number(form.amountPaid) || 0,
    status:         calcStatus(form.lineItems, form.taxRate, Number(form.amountPaid) || 0),
    notes:          form.notes || '',
    created_at:     new Date().toISOString(),
    updated_at:     new Date().toISOString(),
  };
  
  mockInvoices.push(newInvoice);
  return normalizeInvoice(newInvoice);
};

export const updateInvoice = async (id, form) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const index = mockInvoices.findIndex(inv => inv.id === id);
  if (index === -1) throw new Error('Invoice not found');
  
  mockInvoices[index] = {
    ...mockInvoices[index],
    invoice_number: form.invoiceNumber,
    guest_name:     form.guestName,
    guest_email:    form.guestEmail,
    guest_phone:    form.guestPhone || '',
    room_type:      form.roomType,
    check_in:       form.checkIn,
    check_out:      form.checkOut,
    line_items:     form.lineItems,
    tax_rate:       form.taxRate,
    amount_paid:    Number(form.amountPaid) || 0,
    status:         calcStatus(form.lineItems, form.taxRate, Number(form.amountPaid) || 0),
    notes:          form.notes || '',
    updated_at:     new Date().toISOString(),
  };
  
  return normalizeInvoice(mockInvoices[index]);
};

export const deleteInvoice = async (id) => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const index = mockInvoices.findIndex(inv => inv.id === id);
  if (index === -1) throw new Error('Invoice not found');
  
  mockInvoices.splice(index, 1);
};

export const getStats = async () => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  let revenue = 0, outstanding = 0;
  mockInvoices.forEach(inv => {
    const items = inv.line_items || [];
    const sub     = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const total   = sub + sub * (inv.tax_rate / 100);
    const balance = total - inv.amount_paid;
    revenue     += total;
    outstanding += Math.max(0, balance);
  });
  
  return {
    total:       mockInvoices.length,
    paid:        mockInvoices.filter(i => i.status === 'paid').length,
    partial:     mockInvoices.filter(i => i.status === 'partial').length,
    unpaid:      mockInvoices.filter(i => i.status === 'unpaid').length,
    revenue,
    outstanding,
  };
};