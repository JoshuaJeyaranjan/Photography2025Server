const express = require("express");
const router = express.Router();
const db = require("../db");
const generateInvoice = require("../utils/invoice"); // ✅ separate file
const fs = require("fs");

router.post("/create-checkout-session", async (req, res) => {
  console.log("=== STRIPE SESSION START ===");
  console.log("Raw body:", JSON.stringify(req.body, null, 2));

  const { items, customer } = req.body;
  const stripe = req.stripe;
  const transporter = req.transporter;

  if (!items?.length || !customer?.name || !customer?.email) {
    return res.status(400).json({ error: "Invalid input." });
  }

  try {
    const validatedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const dbImage = await db("images")
        .select("id", "price", "title", "filename")
        .where({ id: item.id })
        .first();

      if (!dbImage) {
        return res.status(400).json({ error: `Image not found for ID: ${item.id}` });
      }

      const price = parseFloat(dbImage.price);
      const quantity = parseInt(item.quantity || 1);
      totalAmount += price * quantity;

      validatedItems.push({
        image_id: dbImage.id,
        quantity,
        price_at_purchase: price,
        item_name: dbImage.title || dbImage.filename,
      });
    }

    const line_items = validatedItems.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: { name: item.item_name },
        unit_amount: Math.round(item.price_at_purchase * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      customer_email: customer.email,
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
    });

    const [orderId] = await db("orders").insert({
      customer_name: customer.name,
      customer_email: customer.email,
      total_amount: totalAmount,
      stripe_session_id: session.id,
      order_status: "pending",
    });

    for (const item of validatedItems) {
      await db("order_items").insert({
        order_id: orderId,
        image_id: item.image_id,
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase,
        item_name: item.item_name,
      });
    }

    const invoicePath = `/tmp/Invoice-${orderId}.pdf`;
    await generateInvoice({
      id: orderId,
      customer_name: customer.name,
      customer_email: customer.email,
      items: validatedItems,
      total_amount: totalAmount,
    }, invoicePath);

    await transporter.sendMail({
      from: `"Joshua Jey Photography" <${process.env.EMAIL_USER}>`,
      to: customer.email,
      subject: "Your Order & Invoice",
      html: `<p>Thanks again for your order! Attached is your invoice.</p>`,
      attachments: [{ filename: `Invoice-${orderId}.pdf`, path: invoicePath }],
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("Stripe session creation failed:", error);
    res.status(500).json({ error: "Failed to create payment session.", details: error.message });
  }
});

// Test route to simulate order and generate a PDF invoice
router.post("/test-invoice", async (req, res) => {
  const { name, email } = req.body;

  const orderId = Math.floor(Math.random() * 100000); // Fake order ID
  const orderData = {
    id: orderId,
    customer_name: name || "Test User",
    customer_email: email || "test@example.com",
    items: [
      { item_name: "Portrait 1", quantity: 1, price_at_purchase: 40 },
      { item_name: "Landscape 2", quantity: 2, price_at_purchase: 60 },
    ],
    total_amount: 160,
  };

  const invoicePath = `/tmp/Invoice-${orderId}.pdf`;

  try {
    await require("../utils/invoice")(orderData, invoicePath);

    console.log(`✅ PDF generated at: ${invoicePath}`);

    // Optional: send it by email too
    if (req.transporter) {
      await req.transporter.sendMail({
        from: `"Joshua Jey Photography" <${process.env.EMAIL_USER}>`,
        to: email || process.env.EMAIL_TO, // fallback recipient
        subject: "Test Invoice PDF",
        html: `<p>This is a test email with a generated PDF invoice.</p>`,
        attachments: [
          {
            filename: `Invoice-${orderId}.pdf`,
            path: invoicePath,
          },
        ],
      });

      console.log("✅ Test email sent");
    }

    res.json({ success: true, invoicePath });
  } catch (err) {
    console.error("❌ Failed to generate invoice:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;