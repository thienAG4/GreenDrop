const db = require('../config/db');
const HttpError = require('../utils/http-error');
const { PRODUCT_STATUS } = require('../utils/constants');

const ACTIVE_ORDER_STATUSES = ['pending', 'confirmed']; // PENDING_CONFIRMATION/PENDING_PAYMENT/PREPARING

async function attachChildren(products) {
  if (!products.length) return products;
  const ids = products.map((p) => p.product_id);

  const [images] = await db.query(
    `SELECT * FROM IMAGES WHERE is_combo = FALSE AND product_id IN (?) ORDER BY sort_order ASC`,
    [ids]
  );
  const [attributes] = await db.query(
    `SELECT * FROM PRODUCT_ATTRIBUTES WHERE product_id IN (?)`,
    [ids]
  );

  const byProduct = (rows) =>
    rows.reduce((acc, row) => {
      (acc[row.product_id] = acc[row.product_id] || []).push(row);
      return acc;
    }, {});
  const imagesByProduct = byProduct(images);
  const attrsByProduct = byProduct(attributes);

  return products.map((p) => ({
    ...p,
    images: imagesByProduct[p.product_id] || [],
    attributes: attrsByProduct[p.product_id] || [],
  }));
}

async function listProducts({
  q,
  category_id,
  min_price,
  max_price,
  status,
  sort,
  page = 1,
  limit = 20,
  includeInactive = false,
} = {}) {
  const where = [];
  const params = [];

  if (!includeInactive) {
    where.push(`p.status != 'inactive'`);
  } else if (status) {
    where.push('p.status = ?');
    params.push(status);
  }
  if (q) {
    where.push('(p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (category_id) {
    where.push('p.category_id = ?');
    params.push(category_id);
  }
  if (min_price) {
    where.push('p.price >= ?');
    params.push(min_price);
  }
  if (max_price) {
    where.push('p.price <= ?');
    params.push(max_price);
  }

  const sortMap = {
    price_asc: 'p.price ASC',
    price_desc: 'p.price DESC',
    rating: 'p.avg_rating DESC',
    newest: 'p.product_id DESC',
    // Default landing sort: Terrariums (the hero category) first, then best
    // rated within each bucket. Avoids the newest-imported category
    // (Accessories, which happened to get the highest product_ids) always
    // showing ahead of Terrariums when no explicit sort is chosen.
    featured: 'CASE WHEN p.category_id = 1 THEN 0 ELSE 1 END ASC, p.avg_rating DESC, p.product_id DESC',
  };
  const orderBy = sortMap[sort] || sortMap.featured;

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const pageSize = Math.min(Number(limit) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * pageSize;

  const [rows] = await db.query(
    `SELECT p.*, c.name AS category_name
     FROM PRODUCTS p
     LEFT JOIN CATEGORIES c ON c.category_id = p.category_id
     ${whereSql}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM PRODUCTS p ${whereSql}`,
    params
  );

  const items = await attachChildren(rows);
  return { items, total, page: Number(page) || 1, limit: pageSize };
}

async function getProductDetail(productId) {
  const [rows] = await db.query(
    `SELECT p.*, c.name AS category_name FROM PRODUCTS p
     LEFT JOIN CATEGORIES c ON c.category_id = p.category_id
     WHERE p.product_id = ?`,
    [productId]
  );
  if (!rows.length) throw new HttpError(404, 'Product not found');
  const product = rows[0];

  const [images] = await db.query(
    'SELECT * FROM IMAGES WHERE is_combo = FALSE AND product_id = ? ORDER BY sort_order',
    [productId]
  );
  const [attributes] = await db.query('SELECT * FROM PRODUCT_ATTRIBUTES WHERE product_id = ?', [
    productId,
  ]);
  const [faqs] = await db.query('SELECT * FROM PRODUCT_FAQS WHERE product_id = ?', [productId]);
  const [reviews] = await db.query(
    `SELECT r.*, u.full_name AS reviewer_name
     FROM REVIEWS r JOIN ORDER_ITEMS oi ON oi.order_item_id = r.order_item_id
     JOIN USERS u ON u.user_id = r.user_id
     WHERE oi.product_id = ? AND r.is_visible = TRUE
     ORDER BY r.created_at DESC`,
    [productId]
  );
  const [relatedRows] = await db.query(
    `SELECT product_id, name, price, avg_rating, stock_quantity FROM PRODUCTS
     WHERE category_id = ? AND product_id != ? AND status != 'inactive'
     LIMIT 4`,
    [product.category_id, productId]
  );
  const related = await attachChildren(relatedRows);
  const [activePromo] = await db.query(
    `SELECT pe.discount_percent FROM PROMOTION_EVENT_PRODUCTS pep
     JOIN PROMOTION_EVENTS pe ON pe.event_id = pep.event_id
     WHERE pep.product_id = ? AND pe.status = 'active' AND NOW() BETWEEN pe.start_at AND pe.end_at
     ORDER BY pe.discount_percent DESC LIMIT 1`,
    [productId]
  );

  return {
    ...product,
    images,
    attributes,
    faqs,
    reviews,
    related_products: related,
    active_discount_percent: activePromo.length ? Number(activePromo[0].discount_percent) : 0,
  };
}

function validateProductInput(body, { partial = false } = {}) {
  const { name, category_id, price, status } = body;
  if (!partial || name !== undefined) {
    if (!name) throw new HttpError(400, 'Product name is required');
  }
  if (!partial || category_id !== undefined) {
    if (!category_id) throw new HttpError(400, 'Category is required');
  }
  if (!partial || price !== undefined) {
    if (price === undefined || Number(price) < 0) {
      throw new HttpError(400, 'Price must be zero or greater');
    }
  }
  if (status !== undefined && !Object.values(PRODUCT_STATUS).includes(status)) {
    throw new HttpError(400, 'Invalid product status');
  }
}

async function createProduct(body) {
  validateProductInput(body);
  const {
    sku,
    name,
    description,
    price,
    category_id,
    status = PRODUCT_STATUS.ACTIVE,
    stock_quantity = 0,
    images = [],
    attributes = [],
    faqs = [],
  } = body;
  if (!sku) throw new HttpError(400, 'SKU is required');

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [existingSku] = await conn.query('SELECT product_id FROM PRODUCTS WHERE sku = ?', [
      sku,
    ]);
    if (existingSku.length) throw new HttpError(409, 'A product with this SKU already exists');

    const [result] = await conn.query(
      `INSERT INTO PRODUCTS (sku, name, description, price, category_id, status, stock_quantity)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sku, name, description || null, price, category_id, status, stock_quantity]
    );
    const productId = result.insertId;

    for (const [i, img] of images.entries()) {
      await conn.query(
        'INSERT INTO IMAGES (url, sort_order, product_id, is_combo) VALUES (?, ?, ?, FALSE)',
        [img.url, img.sort_order ?? i, productId]
      );
    }
    for (const attr of attributes) {
      await conn.query(
        'INSERT INTO PRODUCT_ATTRIBUTES (type, value, product_id) VALUES (?, ?, ?)',
        [attr.type, attr.value, productId]
      );
    }
    for (const faq of faqs) {
      await conn.query('INSERT INTO PRODUCT_FAQS (question, answer, product_id) VALUES (?, ?, ?)', [
        faq.question,
        faq.answer || null,
        productId,
      ]);
    }

    await conn.commit();
    return getProductDetail(productId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateProduct(productId, body) {
  validateProductInput(body, { partial: true });
  const [existing] = await db.query('SELECT * FROM PRODUCTS WHERE product_id = ?', [productId]);
  if (!existing.length) throw new HttpError(404, 'Product not found');

  if (body.sku && body.sku !== existing[0].sku) {
    const [dup] = await db.query('SELECT product_id FROM PRODUCTS WHERE sku = ? AND product_id != ?', [
      body.sku,
      productId,
    ]);
    if (dup.length) throw new HttpError(409, 'A product with this SKU already exists');
  }

  const fields = ['sku', 'name', 'description', 'price', 'category_id', 'status', 'stock_quantity'];
  const sets = [];
  const params = [];
  for (const field of fields) {
    if (body[field] !== undefined) {
      sets.push(`${field} = ?`);
      params.push(body[field]);
    }
  }
  if (sets.length) {
    params.push(productId);
    await db.query(`UPDATE PRODUCTS SET ${sets.join(', ')} WHERE product_id = ?`, params);
  }

  if (body.images) {
    await db.query('DELETE FROM IMAGES WHERE is_combo = FALSE AND product_id = ?', [productId]);
    for (const [i, img] of body.images.entries()) {
      await db.query(
        'INSERT INTO IMAGES (url, sort_order, product_id, is_combo) VALUES (?, ?, ?, FALSE)',
        [img.url, img.sort_order ?? i, productId]
      );
    }
  }
  if (body.attributes) {
    await db.query('DELETE FROM PRODUCT_ATTRIBUTES WHERE product_id = ?', [productId]);
    for (const attr of body.attributes) {
      await db.query('INSERT INTO PRODUCT_ATTRIBUTES (type, value, product_id) VALUES (?, ?, ?)', [
        attr.type,
        attr.value,
        productId,
      ]);
    }
  }
  if (body.faqs) {
    await db.query('DELETE FROM PRODUCT_FAQS WHERE product_id = ?', [productId]);
    for (const faq of body.faqs) {
      await db.query('INSERT INTO PRODUCT_FAQS (question, answer, product_id) VALUES (?, ?, ?)', [
        faq.question,
        faq.answer || null,
        productId,
      ]);
    }
  }

  return getProductDetail(productId);
}

async function deleteProduct(productId) {
  const [existing] = await db.query('SELECT product_id FROM PRODUCTS WHERE product_id = ?', [
    productId,
  ]);
  if (!existing.length) throw new HttpError(404, 'Product not found');

  const [activeOrders] = await db.query(
    `SELECT 1 FROM ORDER_ITEMS oi JOIN ORDERS o ON oi.order_id = o.order_id
     WHERE oi.product_id = ? AND o.status IN (?)
     LIMIT 1`,
    [productId, ACTIVE_ORDER_STATUSES]
  );
  if (activeOrders.length) {
    throw new HttpError(409, 'Cannot delete: product is part of an active (unfulfilled) order');
  }

  try {
    await db.query('DELETE FROM PRODUCTS WHERE product_id = ?', [productId]);
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      throw new HttpError(
        409,
        'Cannot delete: product is referenced by a combo or historical order and cannot be removed'
      );
    }
    throw err;
  }
}

module.exports = {
  listProducts,
  getProductDetail,
  createProduct,
  updateProduct,
  deleteProduct,
  ACTIVE_ORDER_STATUSES,
};
