// Central place mapping business-process vocabulary (BUSINESS_REQUIREMENTS.md)
// onto the actual ENUM values that exist in the fixed schema (create_database.sql).
// The schema is treated as immutable, so where the business doc names a status
// that has no literal column value, we document which schema value stands in for it.

const ORDER_STATUS = {
  PENDING: 'pending', // covers PENDING_CONFIRMATION and PENDING_PAYMENT (pre-confirmation)
  PREPARING: 'confirmed', // seller preparing goods -> this is the only cancellable state
  SHIPPING: 'shipping',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
};

// Only orders in this status may be cancelled by the customer (BR-01, section 1.3.2)
const CANCELLABLE_ORDER_STATUS = ORDER_STATUS.PREPARING;

const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PAID: 'paid',
  REFUNDED: 'refunded',
};

const PAYMENT_METHOD = {
  COD: 'cod',
  BANK_TRANSFER: 'bank_transfer',
  CREDIT_CARD: 'credit_card',
  E_WALLET: 'e_wallet',
};

const ONLINE_PAYMENT_METHODS = [
  PAYMENT_METHOD.BANK_TRANSFER,
  PAYMENT_METHOD.CREDIT_CARD,
  PAYMENT_METHOD.E_WALLET,
];

// RETURN_REQUESTS.status: pending -> RETURN_REQUESTED, approved -> RETURN_APPROVED,
// rejected -> RETURN_REJECTED, completed -> item received & inspection passed (ITEM_RECEIVED)
const RETURN_STATUS = {
  REQUESTED: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ITEM_RECEIVED: 'completed',
};

// REFUNDS.status: pending -> queued, processing -> sent to gateway,
// completed -> REFUNDED, failed -> REFUND_FAILED (manual admin processing)
const REFUND_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

const VOUCHER_STATUS = { ACTIVE: 'active', EXPIRED: 'expired', DISABLED: 'disabled' };
const PROMOTION_STATUS = { UPCOMING: 'upcoming', ACTIVE: 'active', ENDED: 'ended' };

const USER_ROLE = { CUSTOMER: 'customer', STAFF: 'staff', ADMIN: 'admin' };
const STAFF_ROLES = [USER_ROLE.STAFF, USER_ROLE.ADMIN];

// Return reason types and their submission deadlines (BR section 1.4.1 / 1.4.2)
// "Physical damage or shipping errors" -> 48h from delivery; "latent defects" -> 7 days.
const RETURN_REASON_DEADLINE = {
  damaged: { hours: 48 },
  wrong_item: { hours: 48 },
  shipping_error: { hours: 48 },
  defective: { hours: 24 * 7 },
  not_as_described: { hours: 24 * 7 },
  dead_plant: { hours: 24 * 7 },
  wrong_species: { hours: 24 * 7 },
};
const DEFAULT_RETURN_DEADLINE_HOURS = 24 * 7;

// Account is FLAGGED_ACCOUNT when it has more than 3 return requests within 180 days
const FLAGGED_ACCOUNT_RETURN_COUNT = 3;
const FLAGGED_ACCOUNT_WINDOW_DAYS = 180;

// Online payment QR/redirect is valid for a maximum of 15 minutes (BR section 1.1.2)
const QR_EXPIRY_MINUTES = 15;

// Flat shipping fee applied to every order (matches the seed data pattern).
const SHIPPING_FEE = 20000;

const ITEM_TYPE = { PRODUCT: 'product', COMBO: 'combo' };
const COMBO_TYPE = { AI_BUILDER: 'ai_builder', BUILDER_3D: '3d_builder' };

const PRODUCT_STATUS = { ACTIVE: 'active', INACTIVE: 'inactive', OUT_OF_STOCK: 'out_of_stock' };

// BR-06 (section 1.2.2): Builder products include an additional custom assembly service fee,
// folded into COMBOS.total_price since the schema has no separate fee column.
const BUILDER_ASSEMBLY_FEE = 30000;
const BUILDER_MAX_COMPONENTS = 20; // Exception 6: design exceeds allowed limits

// A very small local word list to simulate the "profanity / spam" pre-check
// mentioned in section 1.5.2. A production system would use a real moderation API.
const BANNED_WORDS = ['spam', 'scam', 'fuck', 'shit', 'asshole', 'bitch'];

module.exports = {
  ORDER_STATUS,
  CANCELLABLE_ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  ONLINE_PAYMENT_METHODS,
  RETURN_STATUS,
  REFUND_STATUS,
  VOUCHER_STATUS,
  PROMOTION_STATUS,
  USER_ROLE,
  STAFF_ROLES,
  RETURN_REASON_DEADLINE,
  DEFAULT_RETURN_DEADLINE_HOURS,
  FLAGGED_ACCOUNT_RETURN_COUNT,
  FLAGGED_ACCOUNT_WINDOW_DAYS,
  QR_EXPIRY_MINUTES,
  SHIPPING_FEE,
  ITEM_TYPE,
  COMBO_TYPE,
  PRODUCT_STATUS,
  BANNED_WORDS,
  BUILDER_ASSEMBLY_FEE,
  BUILDER_MAX_COMPONENTS,
};
