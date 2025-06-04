// /Users/joshuajeyaranjan/Desktop/photography2025/photography2025Server/routes/stripeRoutes.js
const express = require('express');
const router = express.Router();

// POST /api/stripe/create-checkout-session - Endpoint to create a Stripe Checkout Session
router.post('/create-checkout-session', async (req, res) => {
  const { itemId, itemName, itemPrice, quantity = 1 } = req.body;
  const stripe = req.stripe; // Access stripe from req
  const PORT = process.env.PORT || 3001; // For constructing image URLs if needed

  if (!itemId || !itemName || !itemPrice) {
    return res.status(400).json({ error: 'Missing item details for checkout.' });
  }

  const unitAmount = Math.round(parseFloat(itemPrice) * 100);
  if (isNaN(unitAmount) || unitAmount <= 0) {
    return res.status(400).json({ error: 'Invalid item price.' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: itemName,
            },
            unit_amount: unitAmount,
          },
          quantity: quantity,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-cancelled`,
    });
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating Stripe session:', error);
    res.status(500).json({ error: 'Failed to create payment session.' });
  }
});

module.exports = router;
