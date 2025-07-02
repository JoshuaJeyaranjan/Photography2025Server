const express = require("express");
const router = express.Router();
const db = require("../db");
const fs = require("fs");
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
  
      const orderItems = await db("order_items").whereIn("order_id", orderIds).select("*");
  
      const grouped = orders.map((order) => ({
        ...order,
        items: orderItems.filter((item) => item.order_id === order.id),
      }));
  
      res.json(grouped);
    } catch (err) {
      console.error("Error fetching orders:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  module.exports = router;