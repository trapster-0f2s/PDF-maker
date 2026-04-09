const mongoose = require('mongoose');

const lineItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity:    { type: Number, required: true },
  unitPrice:   { type: Number, required: true },
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  guestName:     { type: String, required: true },
  guestEmail:    { type: String, required: true },
  guestPhone:    { type: String, default: '' },
  roomType:      { type: String, required: true },
  checkIn:       { type: Date, required: true },
  checkOut:      { type: Date, required: true },
  lineItems:     [lineItemSchema],
  taxRate:       { type: Number, default: 15 },
  amountPaid:    { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid',
  },
  notes: { type: String, default: '' },
}, { timestamps: true });

invoiceSchema.pre('save', function (next) {
  const subtotal = this.lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const total    = subtotal + subtotal * (this.taxRate / 100);
  if (this.amountPaid <= 0)        this.status = 'unpaid';
  else if (this.amountPaid < total) this.status = 'partial';
  else                              this.status = 'paid';
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);