const db = require('../config/db');
const HttpError = require('../utils/http-error');
const { ITEM_TYPE } = require('../utils/constants');

// NOTE on schema: CART_ITEMS has no `quantity` column (intentional, not an oversight).
// We treat quantity as "number of CART_ITEMS rows sharing the same cart/product(or combo)"
// so the fixed schema is respected as-is: adding 2 units inserts 2 rows, and the
// cart view groups rows back into a quantity per line.

async function getOrCreateCart({ userId, sessionToken }) {
  if (userId) {
    const [rows] = await db.query('SELECT * FROM CARTS WHERE user_id = ?', [userId]);
    if (rows.length) return rows[0];
    const [result] = await db.query('INSERT INTO CARTS (user_id, session_token) VALUES (?, ?)', [
      userId,
      null,
    ]);
    return { cart_id: result.insertId, user_id: userId, session_token: null };
  }

  if (!sessionToken) throw new HttpError(400, 'A session token is required for guest carts');
  const [rows] = await db.query('SELECT * FROM CARTS WHERE session_token = ?', [sessionToken]);
  if (rows.length) return rows[0];
  const [result] = await db.query('INSERT INTO CARTS (user_id, session_token) VALUES (?, ?)', [
    null,
    sessionToken,
  ]);
  return { cart_id: result.insertId, user_id: null, session_token: sessionToken };
}

async function getCartView(cart) {
  const [items] = await db.query('SELECT * FROM CART_ITEMS WHERE cart_id = ?', [cart.cart_id]);

  const productIds = [...new Set(items.filter((i) => i.product_id).map((i) => i.product_id))];
  const comboIds = [...new Set(items.filter((i) => i.combo_id).map((i) => i.combo_id))];

  const products = productIds.length
    ? (await db.query('SELECT * FROM PRODUCTS WHERE product_id IN (?)', [productIds]))[0]
    : [];
  const combos = comboIds.length
    ? (await db.query('SELECT * FROM COMBOS WHERE combo_id IN (?)', [comboIds]))[0]
    : [];

  // Thumbnail per line (sort_order = 1 is the thumbnail, per the IMAGES table convention).
  const productImages = productIds.length
    ? (await db.query(
        'SELECT product_id, url FROM IMAGES WHERE is_combo = FALSE AND product_id IN (?) AND sort_order = 1',
        [productIds]
      ))[0]
    : [];
  const comboImages = comboIds.length
    ? (await db.query(
        'SELECT combo_id, url FROM IMAGES WHERE is_combo = TRUE AND combo_id IN (?) AND sort_order = 1',
        [comboIds]
      ))[0]
    : [];

  const productMap = Object.fromEntries(products.map((p) => [p.product_id, p]));
  const comboMap = Object.fromEntries(combos.map((c) => [c.combo_id, c]));
  const productImageMap = Object.fromEntries(productImages.map((i) => [i.product_id, i.url]));
  const comboImageMap = Object.fromEntries(comboImages.map((i) => [i.combo_id, i.url]));

  const grouped = {};
  for (const item of items) {
    const key = item.item_type === ITEM_TYPE.COMBO ? `combo-${item.combo_id}` : `product-${item.product_id}`;
    if (!grouped[key]) {
      const entity = item.item_type === ITEM_TYPE.COMBO ? comboMap[item.combo_id] : productMap[item.product_id];
      grouped[key] = {
        item_type: item.item_type,
        product_id: item.product_id,
        combo_id: item.combo_id,
        name: entity ? entity.name : '(no longer available)',
        image_url: item.item_type === ITEM_TYPE.COMBO ? comboImageMap[item.combo_id] : productImageMap[item.product_id],
        unit_price: entity ? Number(entity.price ?? entity.total_price) : 0,
        stock_quantity: item.item_type === ITEM_TYPE.PRODUCT && entity ? entity.stock_quantity : null,
        available: !!entity && (item.item_type === ITEM_TYPE.COMBO || entity.status !== 'inactive'),
        quantity: 0,
        row_ids: [],
      };
    }
    grouped[key].quantity += 1;
    grouped[key].row_ids.push(item.cart_item_id);
  }

  const lines = Object.values(grouped).map((l) => ({ ...l, line_total: l.unit_price * l.quantity }));
  const subtotal = lines.reduce((sum, l) => sum + l.line_total, 0);

  return { cart_id: cart.cart_id, session_token: cart.session_token, items: lines, subtotal };
}

async function addItem(cart, { product_id, combo_id, item_type, quantity = 1 }) {
  quantity = Math.max(1, Number(quantity) || 1);

  if (item_type === ITEM_TYPE.PRODUCT) {
    const [rows] = await db.query('SELECT * FROM PRODUCTS WHERE product_id = ?', [product_id]);
    if (!rows.length) throw new HttpError(404, 'Product not found');
    if (rows[0].status !== 'active') throw new HttpError(409, 'This product is not available');
  } else if (item_type === ITEM_TYPE.COMBO) {
    const [rows] = await db.query('SELECT * FROM COMBOS WHERE combo_id = ?', [combo_id]);
    if (!rows.length) throw new HttpError(404, 'Combo not found');

    // Exception 2: a component may have sold out since the design was created/saved.
    const [components] = await db.query(
      `SELECT ci.quantity, p.status, p.stock_quantity, p.name FROM COMBO_ITEMS ci
       JOIN PRODUCTS p ON p.product_id = ci.product_id WHERE ci.combo_id = ?`,
      [combo_id]
    );
    const unavailable = components.filter(
      (c) => c.status !== 'active' || c.stock_quantity < c.quantity
    );
    if (unavailable.length) {
      throw new HttpError(
        409,
        `This design can't be added to the cart: ${unavailable.map((c) => c.name).join(', ')} is out of stock`
      );
    }
  } else {
    throw new HttpError(400, 'item_type must be "product" or "combo"');
  }

  const values = Array.from({ length: quantity }, () => [
    cart.cart_id,
    item_type === ITEM_TYPE.PRODUCT ? product_id : null,
    item_type === ITEM_TYPE.COMBO ? combo_id : null,
    item_type,
  ]);
  await db.query(
    'INSERT INTO CART_ITEMS (cart_id, product_id, combo_id, item_type) VALUES ?',
    [values]
  );
  return getCartView(cart);
}

async function setItemQuantity(cart, { product_id, combo_id, item_type }, quantity) {
  quantity = Math.max(0, Number(quantity) || 0);
  const idColumn = item_type === ITEM_TYPE.COMBO ? 'combo_id' : 'product_id';
  const idValue = item_type === ITEM_TYPE.COMBO ? combo_id : product_id;

  await db.query(`DELETE FROM CART_ITEMS WHERE cart_id = ? AND ${idColumn} = ? AND item_type = ?`, [
    cart.cart_id,
    idValue,
    item_type,
  ]);
  if (quantity > 0) {
    const values = Array.from({ length: quantity }, () => [
      cart.cart_id,
      item_type === ITEM_TYPE.PRODUCT ? idValue : null,
      item_type === ITEM_TYPE.COMBO ? idValue : null,
      item_type,
    ]);
    await db.query('INSERT INTO CART_ITEMS (cart_id, product_id, combo_id, item_type) VALUES ?', [
      values,
    ]);
  }
  return getCartView(cart);
}

async function removeItem(cart, { product_id, combo_id, item_type }) {
  const idColumn = item_type === ITEM_TYPE.COMBO ? 'combo_id' : 'product_id';
  const idValue = item_type === ITEM_TYPE.COMBO ? combo_id : product_id;
  await db.query(`DELETE FROM CART_ITEMS WHERE cart_id = ? AND ${idColumn} = ? AND item_type = ?`, [
    cart.cart_id,
    idValue,
    item_type,
  ]);
  return getCartView(cart);
}

async function clearCart(cartId) {
  await db.query('DELETE FROM CART_ITEMS WHERE cart_id = ?', [cartId]);
}

// Called right after login: pulls any guest-session cart items into the customer's cart.
async function mergeGuestCartIntoUser(sessionToken, userId) {
  if (!sessionToken) return;
  const [guestCarts] = await db.query('SELECT * FROM CARTS WHERE session_token = ?', [
    sessionToken,
  ]);
  if (!guestCarts.length) return;
  const guestCart = guestCarts[0];

  const userCart = await getOrCreateCart({ userId });
  await db.query('UPDATE CART_ITEMS SET cart_id = ? WHERE cart_id = ?', [
    userCart.cart_id,
    guestCart.cart_id,
  ]);
  await db.query('DELETE FROM CARTS WHERE cart_id = ?', [guestCart.cart_id]);
}

module.exports = {
  getOrCreateCart,
  getCartView,
  addItem,
  setItemQuantity,
  removeItem,
  clearCart,
  mergeGuestCartIntoUser,
};
