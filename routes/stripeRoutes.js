const express = require("express");
const router = express.Router();
const db = require("../db");
const fs = require("fs");

router.post("/create-checkout-session", async (req, res) => {
  console.log("=== STRIPE SESSION START ===");
  console.log("Raw body:", JSON.stringify(req.body, null, 2));

  const { items, customer } = req.body;
  const stripe = req.stripe;
  

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
      const itemTotal = price * quantity;
const taxAmount = itemTotal * 0.13;
totalAmount += itemTotal + taxAmount;

      validatedItems.push({
        image_id: dbImage.id,
        print_size_id: dbSize.id,
        quantity,
        price_at_purchase: price,
        item_name: `${dbImage.title || dbImage.filename} (${dbSize.label})`,
      });
    }
    const shippingCost = parseInt(req.body.shipping_cost || 0); // In cents
    totalAmount += shippingCost / 100;

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


    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("Stripe session creation failed:", error);
    res.status(500).json({
      error: "Failed to create payment session.",
      details: error.message,
    });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = req.stripe;
  let event;

  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      // Fetch order from DB by Stripe session ID
      const order = await db("orders")
        .where({ stripe_session_id: session.id })
        .first();

      if (!order) {
        throw new Error(`No order found for session: ${session.id}`);
      }

      // Update order to "completed"
      await db("orders")
        .where({ id: order.id })
        .update({ order_status: "completed" });

      // Get order items
      const items = await db("order_items")
        .where({ order_id: order.id });

      // Generate and send invoice
      const invoicePath = `/tmp/Invoice-${order.id}.pdf`;
      await generateInvoice({
        id: order.id,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        items,
        total_amount: order.total_amount,
      }, invoicePath);

      await req.transporter.sendMail({
        from: `"Joshua Jey Photography" <${process.env.EMAIL_USER}>`,
        to: order.customer_email,
        subject: "Your Order & Invoice",
        html: `<p>Thanks again for your order! Attached is your invoice.</p>`,
        attachments: [{ filename: `Invoice-${order.id}.pdf`, path: invoicePath }],
      });

      console.log(`✅ Invoice sent for order ${order.id}`);
    } catch (err) {
      console.error("❌ Failed to process webhook:", err.message);
    }
  }

  res.json({ received: true });
});



module.exports = router;