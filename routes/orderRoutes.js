const express = require("express");
const router = express.Router();
const db = require("../db");
const authenticateJWT = require("../middleware/authenticateJWT");

router.get("/my-orders", authenticateJWT, async (req, res) => {
  try {
    const { userId, userEmail } = req;

    let ordersQuery = db("orders").orderBy("order_date", "desc");

    if (userId) {
      ordersQuery = ordersQuery.where("user_id", userId);
    } else if (userEmail) {
      ordersQuery = ordersQuery.where("customer_email", userEmail);
    } else {
      return res.status(400).json({ error: "No user ID or email found" });
    }

    const orders = await ordersQuery;
    const orderIds = orders.map((o) => o.id);

    if (orderIds.length === 0) {
      return res.json([]);
    }

    // Join in print size and image details
    const orderItems = await db("order_items as oi")
      .join("images as img", "oi.image_id", "img.id")
      .join("print_sizes as ps", "oi.print_size_id", "ps.id")
      .select(
        "oi.*",
        "img.filename",
        "img.title",
        "ps.label as print_size_label"
      )
      .whereIn("oi.order_id", orderIds);

    // Group items by order
    const grouped = orders.map((order) => {
      const formattedDate = new Date(order.order_date).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return {
        ...order,
        formatted_date: formattedDate,
        items: orderItems
          .filter((item) => item.order_id === order.id)
          .map((item) => ({
            id: item.id,
            image_id: item.image_id,
            title: item.title,
            preview_url: `https://media.joshuajeyphotography.com/${item.filename}`,
            quantity: item.quantity,
            price_at_purchase: item.price_at_purchase,
            print_size_label: item.print_size_label,
          })),
      };
    });

    res.json(grouped);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;