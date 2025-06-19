const express = require('express');
const router = express.Router();
const db = require('../db'); // adjust if needed

// POST /api/stripe/create-checkout-session
router.post('/create-checkout-session', async (req, res) => {
  console.log('recieved checkout request:', req.body );
  const { items, customer } = req.body;
  const stripe = req.stripe;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing item details for checkout.' });
  }

  if (!customer || !customer.name || !customer.email) {
    return res.status(400).json({ error: 'Customer name and email are required.' });
  }

  try {
    // Step 1: Validate and fetch each item from DB
    const validatedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const dbImage = await db('images').select('id', 'price', 'title', 'filename').where({ id: item.id }).first();

      if (!dbImage) {
        return res.status(400).json({ error: `Image not found for ID: ${item.id}` });
      }

      const price = parseFloat(dbImage.price);
      const quantity = parseInt(item.quantity || 1);
      const amount = price * quantity;
      totalAmount += amount;

      validatedItems.push({
        image_id: dbImage.id,
        quantity,
        price_at_purchase: price,
        item_name: dbImage.title || dbImage.filename,
      });
    }

    // Step 2: Create Stripe line items
    const line_items = validatedItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.item_name,
        },
        unit_amount: Math.round(item.price_at_purchase * 100),
      },
      quantity: item.quantity,
    }));

    // Step 3: Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer_email: customer.email,
      success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-cancelled`,
    });

    // Step 4: Insert into orders table
    const [orderId] = await db('orders').insert({
      customer_name: customer.name,
      customer_email: customer.email,
      total_amount: totalAmount,
      stripe_session_id: session.id,
      order_status: 'pending',
    });

    // Step 5: Insert into order_items
    for (const item of validatedItems) {
      await db('order_items').insert({
        order_id: orderId,
        image_id: item.image_id,
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase,
        item_name: item.item_name,
      });
    }

    res.json({ sessionId: session.id });

  } catch (error) {
    console.error('Stripe session creation failed:', error.stack || error.message || error);

    res.status(500).json({ error: 'Failed to create payment session.', details: error.message || 'no additional details' });
  }
});

module.exports = router;
