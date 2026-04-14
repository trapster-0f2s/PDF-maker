// client/src/utils/generatePDF.js
import jsPDF from 'jspdf';

const fmtNAD  = n => 'N$ ' + Number(n).toLocaleString('en-NA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const nights  = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));

const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default async function generatePDF(inv) {
  const doc  = new jsPDF({ unit: 'mm', format: 'a4' });
  const W    = 210, M = 20;
  const lineItems = inv.lineItems || inv.line_items || [];
  const sub  = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax  = sub * ((inv.taxRate ?? inv.tax_rate) / 100);
  const total = sub + tax;
  const bal  = total - (inv.amountPaid ?? inv.amount_paid);
  const statusText = bal <= 0 ? 'PAID' : (inv.amountPaid ?? inv.amount_paid) > 0 ? 'PARTIAL' : 'UNPAID';

  // Header with Logo
  try {
    const logoResponse = await fetch('/ChateauLogo.JPG');
    if (logoResponse.ok) {
      const blob = await logoResponse.blob();
      const logoData = await blobToBase64(blob);
      doc.addImage(logoData, 'JPEG', M, 14, 16, 16);
    }
  } catch (e) {
    // Fallback to text if image fails to load
    doc.setFillColor(26, 26, 26);
    doc.roundedRect(M, 14, 16, 16, 2, 2, 'F');
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold').setFontSize(11).text('S', M+8, 24, { align: 'center' });
  }
  doc.setTextColor(26,26,26).setFont('helvetica','bold').setFontSize(14).text('Chateau Serene', M+20, 20);
  doc.setFont('helvetica','normal').setFontSize(8).setTextColor(130,130,130)
     .text('Windhoek, Namibia  ·  +264 61 000 0000', M+20, 26);
  doc.setFontSize(8).setTextColor(130,130,130)
     .text('Invoice No.', W-M, 18, { align: 'right' })
     .text('Date',        W-M, 28, { align: 'right' });
  doc.setFont('helvetica','bold').setFontSize(9).setTextColor(26,26,26)
     .text(inv.invoiceNumber || inv.invoice_number,       W-M, 23, { align: 'right' })
     .text(fmtDate(inv.createdAt || inv.created_at),  W-M, 33, { align: 'right' });

  // Title
  doc.setFont('helvetica','bold').setFontSize(22).setTextColor(26,26,26).text('Invoice', M, 50);

  // Parties
  let y = 62;
  doc.setFont('helvetica','normal').setFontSize(8).setTextColor(130,130,130)
     .text('BILLED TO', M, y).text('STAY PERIOD', W/2+5, y);
  y += 5;
  doc.setFont('helvetica','bold').setFontSize(10).setTextColor(26,26,26)
     .text(inv.guestName || inv.guest_name, M, y)
     .text(`${fmtDate(inv.checkIn || inv.check_in)} — ${fmtDate(inv.checkOut || inv.check_out)}`, W/2+5, y);
  y += 5;
  doc.setFont('helvetica','normal').setFontSize(8).setTextColor(100,100,100)
     .text(inv.guestEmail || inv.guest_email, M, y)
     .text(`${nights(inv.checkIn || inv.check_in, inv.checkOut || inv.check_out)} nights`, W/2+5, y);

  // Table
  y += 12;
  doc.setDrawColor(220,220,220).setLineWidth(0.3).line(M, y, W-M, y);
  y += 5;
  doc.setFontSize(8).setTextColor(130,130,130).setFont('helvetica','normal')
     .text('DESCRIPTION', M, y)
     .text('QTY',        120, y, { align: 'right' })
     .text('UNIT PRICE', 152, y, { align: 'right' })
     .text('AMOUNT',     W-M, y, { align: 'right' });
  y += 3;
  doc.line(M, y, W-M, y);
  y += 6;

  lineItems.forEach(item => {
    doc.setTextColor(50,50,50).setFontSize(9)
       .text(item.description,                       M,   y)
       .text(String(item.quantity),                  120, y, { align: 'right' })
       .text(fmtNAD(item.unitPrice),                152, y, { align: 'right' })
       .text(fmtNAD(item.quantity * item.unitPrice), W-M, y, { align: 'right' });
    y += 7;
    doc.setDrawColor(240,240,240).line(M, y-2, W-M, y-2);
  });

  // Totals
  y += 6;
  const lx = 130;
  doc.setFontSize(9).setTextColor(100,100,100).setFont('helvetica','normal')
     .text('Subtotal',             lx, y).text(fmtNAD(sub),  W-M, y, { align: 'right' }); y += 6;
  doc.text(`VAT (${inv.taxRate ?? inv.tax_rate}%)`, lx, y).text(fmtNAD(tax), W-M, y, { align: 'right' }); y += 6;
  doc.setTextColor(59,109,17)
     .text('Amount Paid', lx, y).text(`− ${fmtNAD(inv.amountPaid ?? inv.amount_paid)}`, W-M, y, { align: 'right' }); y += 3;
  doc.setDrawColor(26,26,26).setLineWidth(0.6).line(lx, y, W-M, y); y += 5;
  doc.setFont('helvetica','bold').setFontSize(10).setTextColor(26,26,26)
     .text('Balance Due', lx, y).text(fmtNAD(Math.max(0, bal)), W-M, y, { align: 'right' });

  // Badge
  const badgeColors = { PAID: [[234,243,222],[59,109,17]], UNPAID: [[252,235,235],[163,45,45]], PARTIAL: [[250,238,218],[133,79,11]] };
  const [[br,bg,bb],[tr,tg,tb]] = badgeColors[statusText];
  doc.setFillColor(br,bg,bb).roundedRect(M, y-8, 22, 7, 2, 2, 'F');
  doc.setFont('helvetica','bold').setFontSize(7).setTextColor(tr,tg,tb)
     .text(statusText, M+11, y-3.5, { align: 'center' });

  // Footer
  doc.setDrawColor(220,220,220).setLineWidth(0.3).line(M, 278, W-M, 278);
  doc.setFont('helvetica','normal').setFontSize(7).setTextColor(170,170,170)
     .text('Thank you for staying with Chateau Serene. Payment due within 7 days.', W/2, 283, { align: 'center' });

  doc.save(`${inv.invoiceNumber || inv.invoice_number}.pdf`);
}