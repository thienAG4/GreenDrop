const db = require('../config/db');

// Orders that never became a completed sale (still pending, or cancelled)
// are excluded from revenue so the chart reflects actual sales, not carts.
const REVENUE_STATUSES = ['confirmed', 'shipping', 'delivered'];

async function getStats() {
  const [[revenueRow]] = await db.query(
    `SELECT COALESCE(SUM(total_amount), 0) AS total_revenue, COUNT(*) AS order_count
     FROM ORDERS WHERE status IN (?)`,
    [REVENUE_STATUSES]
  );

  const [revenueByDay] = await db.query(
    `SELECT DATE(order_date) AS day, SUM(total_amount) AS revenue
     FROM ORDERS WHERE status IN (?) AND order_date >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
     GROUP BY DATE(order_date) ORDER BY day ASC`,
    [REVENUE_STATUSES]
  );

  const [topProducts] = await db.query(
    `SELECT p.product_id, p.name, SUM(oi.unit_price * oi.quantity) AS revenue, SUM(oi.quantity) AS units_sold
     FROM ORDER_ITEMS oi
     JOIN ORDERS o ON o.order_id = oi.order_id
     JOIN PRODUCTS p ON p.product_id = oi.product_id
     WHERE o.status IN (?) AND oi.item_type = 'product'
     GROUP BY p.product_id, p.name
     ORDER BY revenue DESC
     LIMIT 5`,
    [REVENUE_STATUSES]
  );

  const [[customerRow]] = await db.query(
    `SELECT COUNT(*) AS total_customers FROM USERS WHERE role = 'customer'`
  );

  return {
    total_revenue: Number(revenueRow.total_revenue),
    order_count: revenueRow.order_count,
    total_customers: customerRow.total_customers,
    revenue_by_day: revenueByDay.map((r) => ({ day: r.day, revenue: Number(r.revenue) })),
    top_products: topProducts.map((p) => ({
      product_id: p.product_id,
      name: p.name,
      revenue: Number(p.revenue),
      units_sold: p.units_sold,
    })),
  };
}

module.exports = { getStats };
