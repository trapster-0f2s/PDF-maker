const Invoice    = require('../models/Invoice');
const PDFDocument = require('pdfkit');

function calcTotals(lineItems, taxRate, amountPaid) {
  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax      = subtotal * (taxRate / 100);
  const total    = subtotal + tax;
  const balance  = total - amountPaid;
  return { subtotal, tax, total, balance };
}

function fmtNAD(n) {
  return 'N$ ' + Number(n).toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function nightsBetween(checkIn, checkOut) {
  return Math.max(0, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000));
}

exports.getAll = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$or = [
      { guestName:     { $regex: search, $options: 'i' } },
      { invoiceNumber: { $regex: search, $options: 'i' } },
    ];
    const invoices = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Invoice.countDocuments(filter);
    res.json({ invoices, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const invoice = new Invoice(req.body);
    await invoice.save();
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Not found' });
    Object.assign(invoice, req.body);
    await invoice.save();
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const all = await Invoice.find({});
    let totalRevenue = 0, totalBalance = 0;
    all.forEach(inv => {
      const { total, balance } = calcTotals(inv.lineItems, inv.taxRate, inv.amountPaid);
      totalRevenue += total;
      totalBalance += Math.max(0, balance);
    });
    res.json({
      total:       all.length,
      paid:        all.filter(i => i.status === 'paid').length,
      partial:     all.filter(i => i.status === 'partial').length,
      unpaid:      all.filter(i => i.status === 'unpaid').length,
      revenue:     totalRevenue,
      outstanding: totalBalance,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generatePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Not found' });

    const { subtotal, tax, total, balance } = calcTotals(
      invoice.lineItems, invoice.taxRate, invoice.amountPaid
    );
    const statusText = balance <= 0 ? 'PAID' : invoice.amountPaid > 0 ? 'PARTIAL' : 'UNPAID';

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);
    doc.pipe(res);

    // Header
    doc.rect(50, 40, 36, 36).fillAndStroke('#1a1a1a', '#1a1a1a');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text('S', 50, 49, { width: 36, align: 'center' });
    doc.fillColor('#1a1a1a').font('Helvetica-Bold').fontSize(16).text('Savanna Lodge', 96, 46);
    doc.fillColor('#888888').font('Helvetica').fontSize(8).text('Windhoek, Namibia  ·  +264 61 000 0000', 96, 66);
    doc.fillColor('#888888').font('Helvetica').fontSize(8)
      .text('Invoice No.', 400, 46, { align: 'right', width: 145 })
      .text('Date',        400, 62, { align: 'right', width: 145 });
    doc.fillColor('#1a1a1a').font('Helvetica-Bold').fontSize(9)
      .text(invoice.invoiceNumber,    400, 54, { align: 'right', width: 145 })
      .text(fmtDate(invoice.createdAt), 400, 70, { align: 'right', width: 145 });

    // Title
    doc.fillColor('#1a1a1a').font('Helvetica-Bold').fontSize(26).text('Invoice', 50, 100);

    // Parties
    doc.fillColor('#888888').font('Helvetica').fontSize(8)
      .text('BILLED TO', 50, 140).text('STAY PERIOD', 300, 140);
    doc.fillColor('#1a1a1a').font('Helvetica-Bold').fontSize(11)
      .text(invoice.guestName, 50, 152)
      .text(`${fmtDate(invoice.checkIn)} — ${fmtDate(invoice.checkOut)}`, 300, 152);
    doc.fillColor('#555555').font('Helvetica').fontSize(9)
      .text(invoice.guestEmail, 50, 166)
      .text(`${nightsBetween(invoice.checkIn, invoice.checkOut)} nights  ·  ${invoice.roomType}`, 300, 166);
    if (invoice.guestPhone) doc.text(invoice.guestPhone, 50, 178);

    // Table header
    let y = 200;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#dddddd').lineWidth(0.5).stroke();
    y += 8;
    doc.fillColor('#888888').font('Helvetica').fontSize(8)
      .text('DESCRIPTION', 50, y)
      .text('QTY',        330, y, { width: 40,  align: 'right' })
      .text('UNIT PRICE', 380, y, { width: 80,  align: 'right' })
      .text('AMOUNT',     470, y, { width: 75,  align: 'right' });
    y += 6;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#dddddd').lineWidth(0.3).stroke();
    y += 10;

    // Line items
    invoice.lineItems.forEach(item => {
      doc.fillColor('#333333').font('Helvetica').fontSize(9)
        .text(item.description,                      50,  y, { width: 270 })
        .text(String(item.quantity),                 330, y, { width: 40,  align: 'right' })
        .text(fmtNAD(item.unitPrice),               380, y, { width: 80,  align: 'right' })
        .text(fmtNAD(item.quantity * item.unitPrice), 470, y, { width: 75, align: 'right' });
      y += 20;
      doc.moveTo(50, y - 6).lineTo(545, y - 6).strokeColor('#f0f0f0').lineWidth(0.3).stroke();
    });

    // Totals
    y += 10;
    const lx = 360, rx = 545, tw = 175;
    doc.fillColor('#777777').font('Helvetica').fontSize(9)
      .text('Subtotal',             lx, y, { width: tw, align: 'right' })
      .text(fmtNAD(subtotal),       lx, y, { width: tw, align: 'right' });
    y += 14;
    doc.text(`VAT (${invoice.taxRate}%)`, lx, y, { width: tw, align: 'right' })
       .text(fmtNAD(tax),           lx, y, { width: tw, align: 'right' });
    y += 14;
    doc.fillColor('#3b6d11')
       .text('Amount Paid',         lx, y, { width: tw, align: 'right' })
       .text(`− ${fmtNAD(invoice.amountPaid)}`, lx, y, { width: tw, align: 'right' });
    y += 8;
    doc.moveTo(360, y).lineTo(545, y).strokeColor('#1a1a1a').lineWidth(0.8).stroke();
    y += 8;
    doc.fillColor('#1a1a1a').font('Helvetica-Bold').fontSize(11)
      .text('Balance Due',                   lx, y, { width: tw, align: 'right' })
      .text(fmtNAD(Math.max(0, balance)),    lx, y, { width: tw, align: 'right' });

    // Status badge
    const badgeColors = {
      PAID:    ['#eaf3de', '#3b6d11'],
      UNPAID:  ['#fcebeb', '#a32d2d'],
      PARTIAL: ['#faeeda', '#854f0b'],
    };
    const [bg, fg] = badgeColors[statusText];
    doc.roundedRect(50, y - 10, 60, 18, 4).fill(bg);
    doc.fillColor(fg).font('Helvetica-Bold').fontSize(8)
       .text(statusText, 50, y - 5, { width: 60, align: 'center' });

    // Notes
    if (invoice.notes) {
      y += 30;
      doc.fillColor('#888888').font('Helvetica').fontSize(8).text('NOTES', 50, y);
      y += 10;
      doc.fillColor('#555555').fontSize(9).text(invoice.notes, 50, y, { width: 300 });
    }

    // Footer
    doc.moveTo(50, 760).lineTo(545, 760).strokeColor('#eeeeee').lineWidth(0.5).stroke();
    doc.fillColor('#aaaaaa').font('Helvetica').fontSize(8)
       .text('Thank you for staying with Savanna Lodge. Payment is due within 7 days.', 50, 768, { width: 495, align: 'center' });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};