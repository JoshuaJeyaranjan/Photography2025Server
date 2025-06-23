const PDFDocument = require("pdfkit");
const fs = require("fs");

const generateInvoice = (order, filePath) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    doc.fontSize(20).text("Invoice", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${order.id}`);
    doc.text(`Customer: ${order.customer_name}`);
    doc.text(`Email: ${order.customer_email}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    order.items.forEach((item) => {
      doc.text(`${item.item_name} - Qty: ${item.quantity} - $${item.price_at_purchase}`);
    });

    doc.moveDown();
    doc.text(`Total: $${order.total_amount}`);
    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });
};

module.exports = generateInvoice;