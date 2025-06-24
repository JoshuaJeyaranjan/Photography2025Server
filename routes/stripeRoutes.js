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
        .select("id", "title", "filename")
        .where({ id: item.id })
        .first();

      if (!dbImage) {
        return res.status(400).json({ error: `Image not found for ID: ${item.id}` });
      }

      const dbSize = await db("print_sizes")
        .select("id", "label", "price")
        .where({ id: item.print_size_id })
        .first();

      if (!dbSize) {
        return res.status(400).json({ error: `Print size not found for ID: ${item.print_size_id}` });
      }

      const price = parseFloat(dbSize.price);
      const quantity = parseInt(item.quantity || 1);
      totalAmount += price * quantity;

      validatedItems.push({
        image_id: dbImage.id,
        print_size_id: dbSize.id,
        quantity,
        price_at_purchase: price,
        item_name: `${dbImage.title || dbImage.filename} (${dbSize.label})`,
      });
    }

    const line_items = validatedItems.map((item) => ({
      price_data: {
        currency: "cad",
        product_data: { name: item.item_name },
        unit_amount: Math.round(item.price_at_purchase * 100),
      },
      quantity: item.quantity,
    }));

    if (!req.body.shipping_rate) {
      return res.status(400).json({ error: "Missing shipping rate selection." });
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      shipping_options: [
        { shipping_rate: req.body.shipping_rate },
      ],
      customer_email: customer.email,
      automatic_tax: { enabled: true },
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'], // Add others as needed
      },
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
        print_size_id: item.print_size_id, // ✅ this fixes the previous SQL error
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
    res.status(500).json({
      error: "Failed to create payment session.",
      details: error.message,
    });
  }
});



module.exports = router;