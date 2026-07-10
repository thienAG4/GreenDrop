const HttpError = require('../utils/http-error');
const { PRODUCT_STATUS } = require('../utils/constants');

// All functions here take an open transaction connection (conn) so callers can
// wrap "check order + adjust stock + write order rows" atomically.

async function decrementProductStock(conn, productId, quantity) {
  const [result] = await conn.query(
    `UPDATE PRODUCTS SET stock_quantity = stock_quantity - ?
     WHERE product_id = ? AND stock_quantity >= ? AND status = 'active'`,
    [quantity, productId, quantity]
  );
  if (!result.affectedRows) {
    throw new HttpError(409, 'One of the items in your cart just went out of stock');
  }
  await syncOutOfStockFlag(conn, productId);
}

async function decrementComboStock(conn, comboId, comboQuantity) {
  const [components] = await conn.query('SELECT * FROM COMBO_ITEMS WHERE combo_id = ?', [
    comboId,
  ]);
  for (const component of components) {
    await decrementProductStock(conn, component.product_id, component.quantity * comboQuantity);
  }
}

async function restoreProductStock(conn, productId, quantity) {
  await conn.query('UPDATE PRODUCTS SET stock_quantity = stock_quantity + ? WHERE product_id = ?', [
    quantity,
    productId,
  ]);
  await syncOutOfStockFlag(conn, productId);
}

async function restoreComboStock(conn, comboId, comboQuantity) {
  const [components] = await conn.query('SELECT * FROM COMBO_ITEMS WHERE combo_id = ?', [
    comboId,
  ]);
  for (const component of components) {
    await restoreProductStock(conn, component.product_id, component.quantity * comboQuantity);
  }
}

// Keeps the denormalized `status` column consistent with `stock_quantity`, without
// touching products an admin has deliberately marked `inactive`.
async function syncOutOfStockFlag(conn, productId) {
  const [rows] = await conn.query('SELECT stock_quantity, status FROM PRODUCTS WHERE product_id = ?', [
    productId,
  ]);
  if (!rows.length) return;
  const { stock_quantity, status } = rows[0];
  if (stock_quantity <= 0 && status === PRODUCT_STATUS.ACTIVE) {
    await conn.query('UPDATE PRODUCTS SET status = ? WHERE product_id = ?', [
      PRODUCT_STATUS.OUT_OF_STOCK,
      productId,
    ]);
  } else if (stock_quantity > 0 && status === PRODUCT_STATUS.OUT_OF_STOCK) {
    await conn.query('UPDATE PRODUCTS SET status = ? WHERE product_id = ?', [
      PRODUCT_STATUS.ACTIVE,
      productId,
    ]);
  }
}

module.exports = {
  decrementProductStock,
  decrementComboStock,
  restoreProductStock,
  restoreComboStock,
};
