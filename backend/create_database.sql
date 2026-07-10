-- =====================================================================
-- DATABASE CREATION SCRIPT (MySQL Workbench)
-- Project: E-commerce (Products / Combos / Orders / Returns / Promotions)
-- Note: Run on MySQL 8.0+ (supports CHECK constraint & ENUM)
-- =====================================================================

DROP DATABASE IF EXISTS ecommerce_db;
CREATE DATABASE ecommerce_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
USE ecommerce_db;

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- 1. USERS
-- =====================================================================
CREATE TABLE USERS (
    user_id      INT AUTO_INCREMENT PRIMARY KEY,
    full_name    VARCHAR(150)  NOT NULL,
    email        VARCHAR(255)  NOT NULL UNIQUE,
    phone        VARCHAR(20)   NULL,
    role         ENUM('customer','staff','admin') NOT NULL DEFAULT 'customer',
    status       ENUM('active','inactive','banned') NOT NULL DEFAULT 'active',
    gender       ENUM('male','female','other') NULL,
    password     VARCHAR(255)  NOT NULL,
    is_flagged   BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================================
-- 2. ADDRESS
-- =====================================================================
CREATE TABLE ADDRESS (
    address_id    INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL,
    address_line  VARCHAR(255) NOT NULL,
    city          VARCHAR(100) NULL,
    district      VARCHAR(100) NULL,
    is_default    BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_address_user FOREIGN KEY (user_id) REFERENCES USERS(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 3. CATEGORIES
-- =====================================================================
CREATE TABLE CATEGORIES (
    category_id  INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(150) NOT NULL
) ENGINE=InnoDB;

-- =====================================================================
-- 4. PRODUCTS
-- =====================================================================
CREATE TABLE PRODUCTS (
    product_id     INT AUTO_INCREMENT PRIMARY KEY,
    sku            VARCHAR(50)  NOT NULL UNIQUE,
    name           VARCHAR(255) NOT NULL,
    description    TEXT NULL,
    price          DECIMAL(12,2) NOT NULL,
    category_id    INT NULL,
    status         ENUM('active','inactive','out_of_stock') NOT NULL DEFAULT 'active',
    avg_rating     DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES CATEGORIES(category_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================================
-- 5. PRODUCT_ATTRIBUTES
-- =====================================================================
CREATE TABLE PRODUCT_ATTRIBUTES (
    attribute_id  INT AUTO_INCREMENT PRIMARY KEY,
    type          VARCHAR(100) NOT NULL,
    value         VARCHAR(255) NOT NULL,
    product_id    INT NOT NULL,
    CONSTRAINT fk_attr_product FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 6. PRODUCT_FAQS
-- =====================================================================
CREATE TABLE PRODUCT_FAQS (
    faq_id      INT AUTO_INCREMENT PRIMARY KEY,
    question    TEXT NOT NULL,
    answer      TEXT NULL,
    product_id  INT NOT NULL,
    CONSTRAINT fk_faq_product FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 7. COMBOS
-- =====================================================================
CREATE TABLE COMBOS (
    combo_id          INT AUTO_INCREMENT PRIMARY KEY,
    combo_type        VARCHAR(50) NOT NULL,
    name              VARCHAR(255) NOT NULL,
    total_price       DECIMAL(12,2) NOT NULL,
    created_by_user_id INT NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_combo_creator FOREIGN KEY (created_by_user_id) REFERENCES USERS(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================================
-- 8. IMAGES (replaces PRODUCT_IMAGES; shared 1-M target for PRODUCTS and
--    COMBOS — is_combo flags which FK is populated, sort_order 1 = thumbnail).
--    Placed after COMBOS since it FKs into it.
--    Note: "exactly one of product_id/combo_id is set, matching is_combo" is
--    enforced in the service layer, not a CHECK constraint — MySQL 8 rejects
--    CHECK constraints on columns that also carry an ON UPDATE/DELETE CASCADE
--    FK action (error 3823).
-- =====================================================================
CREATE TABLE IMAGES (
    image_id    INT AUTO_INCREMENT PRIMARY KEY,
    url         VARCHAR(500) NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    product_id  INT NULL,
    combo_id    INT NULL,
    is_combo    BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_image_product FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_image_combo FOREIGN KEY (combo_id) REFERENCES COMBOS(combo_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 9. COMBO_ITEMS
-- =====================================================================
CREATE TABLE COMBO_ITEMS (
    combo_item_id   INT AUTO_INCREMENT PRIMARY KEY,
    combo_id        INT NOT NULL,
    product_id      INT NOT NULL,
    quantity        INT NOT NULL DEFAULT 1,
    component_role  VARCHAR(50) NOT NULL,
    CONSTRAINT fk_comboitem_combo FOREIGN KEY (combo_id) REFERENCES COMBOS(combo_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_comboitem_product FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================================
-- 10. CARTS
-- =====================================================================
CREATE TABLE CARTS (
    cart_id       INT AUTO_INCREMENT PRIMARY KEY,
    session_token VARCHAR(255) NULL,
    user_id       INT NULL,
    CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES USERS(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================================
-- 11. CART_ITEMS
-- =====================================================================
CREATE TABLE CART_ITEMS (
    cart_item_id  INT AUTO_INCREMENT PRIMARY KEY,
    cart_id       INT NOT NULL,
    product_id    INT NULL,
    combo_id      INT NULL,
    item_type     ENUM('product','combo') NOT NULL,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cartitem_cart FOREIGN KEY (cart_id) REFERENCES CARTS(cart_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_cartitem_product FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_cartitem_combo FOREIGN KEY (combo_id) REFERENCES COMBOS(combo_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 12. VOUCHERS
-- =====================================================================
CREATE TABLE VOUCHERS (
    voucher_id          INT AUTO_INCREMENT PRIMARY KEY,
    created_by_user_id  INT NOT NULL,
    code                VARCHAR(50) NOT NULL UNIQUE,
    discount_type       ENUM('percent','fixed') NOT NULL,
    discount_value      DECIMAL(12,2) NOT NULL,
    min_order_value     DECIMAL(12,2) NOT NULL DEFAULT 0,
    max_usage           INT NOT NULL DEFAULT 0,
    used_count          INT NOT NULL DEFAULT 0,
    start_at            DATETIME NOT NULL,
    end_at              DATETIME NOT NULL,
    status              ENUM('active','expired','disabled') NOT NULL DEFAULT 'active',
    CONSTRAINT fk_voucher_creator FOREIGN KEY (created_by_user_id) REFERENCES USERS(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================================
-- 13. ORDERS
-- =====================================================================
CREATE TABLE ORDERS (
    order_id         INT AUTO_INCREMENT PRIMARY KEY,
    order_date       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status           ENUM('pending','confirmed','shipping','delivered','cancelled','returned') NOT NULL DEFAULT 'pending',
    subtotal         DECIMAL(12,2) NOT NULL,
    discount_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount     DECIMAL(12,2) NOT NULL,
    shipping_address VARCHAR(500) NOT NULL,
    shipping_fee     DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method   ENUM('cod','bank_transfer','credit_card','e_wallet') NOT NULL,
    voucher_id       INT NULL,
    user_id          INT NOT NULL,
    delivered_at     DATETIME NULL,
    payment_status   ENUM('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
    payment_txn_id   VARCHAR(100) NULL,
    cancel_reason    TEXT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_voucher FOREIGN KEY (voucher_id) REFERENCES VOUCHERS(voucher_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES USERS(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================================
-- 14. ORDER_ITEMS
-- =====================================================================
CREATE TABLE ORDER_ITEMS (
    order_item_id  INT AUTO_INCREMENT PRIMARY KEY,
    quantity       INT NOT NULL DEFAULT 1,
    combo_id       INT NULL,
    order_id       INT NOT NULL,
    product_id     INT NULL,
    unit_price     DECIMAL(12,2) NOT NULL,
    item_type      ENUM('product','combo') NOT NULL,
    is_reviewed    BOOLEAN NOT NULL DEFAULT FALSE,
    is_returned    BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_orderitem_combo FOREIGN KEY (combo_id) REFERENCES COMBOS(combo_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_orderitem_order FOREIGN KEY (order_id) REFERENCES ORDERS(order_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_orderitem_product FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================================
-- 15. ORDER_ITEM_COMPONENTS
-- =====================================================================
CREATE TABLE ORDER_ITEM_COMPONENTS (
    oic_id           INT AUTO_INCREMENT PRIMARY KEY,
    order_item_id    INT NOT NULL,
    product_id       INT NOT NULL,
    quantity         INT NOT NULL DEFAULT 1,
    allocatetd_price DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_oic_orderitem FOREIGN KEY (order_item_id) REFERENCES ORDER_ITEMS(order_item_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_oic_product FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================================
-- 16. RETURN_REQUESTS
-- =====================================================================
CREATE TABLE RETURN_REQUESTS (
    return_id          INT AUTO_INCREMENT PRIMARY KEY,
    reason_type        VARCHAR(100) NOT NULL,
    description         TEXT NULL,
    status              ENUM('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending',
    reject_reason       TEXT NULL,
    tracking_number     VARCHAR(100) NULL,
    customer_user_id    INT NOT NULL,
    handled_by_user_id  INT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_return_customer FOREIGN KEY (customer_user_id) REFERENCES USERS(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_return_handler FOREIGN KEY (handled_by_user_id) REFERENCES USERS(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================================
-- 17. RETURN_ITEMS
-- =====================================================================
CREATE TABLE RETURN_ITEMS (
    return_item_id  INT AUTO_INCREMENT PRIMARY KEY,
    quantity        INT NOT NULL DEFAULT 1,
    evidence_url    VARCHAR(500) NULL,
    return_id       INT NOT NULL,
    order_item_id   INT NOT NULL,
    CONSTRAINT fk_returnitem_return FOREIGN KEY (return_id) REFERENCES RETURN_REQUESTS(return_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_returnitem_orderitem FOREIGN KEY (order_item_id) REFERENCES ORDER_ITEMS(order_item_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================================
-- 18. REFUNDS
-- =====================================================================
CREATE TABLE REFUNDS (
    refund_id       INT AUTO_INCREMENT PRIMARY KEY,
    amount          DECIMAL(12,2) NOT NULL,
    status          ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
    gateway_ref_id  VARCHAR(100) NULL,
    return_id       INT NOT NULL,
    CONSTRAINT fk_refund_return FOREIGN KEY (return_id) REFERENCES RETURN_REQUESTS(return_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 19. REVIEWS
-- =====================================================================
CREATE TABLE REVIEWS (
    review_id      INT AUTO_INCREMENT PRIMARY KEY,
    order_item_id  INT NOT NULL,
    user_id        INT NOT NULL,
    rating         TINYINT NOT NULL,
    content        TEXT NULL,
    image_url      VARCHAR(500) NULL,
    is_visible     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_orderitem FOREIGN KEY (order_item_id) REFERENCES ORDER_ITEMS(order_item_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES USERS(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- =====================================================================
-- 20. PROMOTION_EVENTS
-- =====================================================================
CREATE TABLE PROMOTION_EVENTS (
    event_id            INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    discount_percent    DECIMAL(5,2) NOT NULL,
    start_at            DATETIME NOT NULL,
    end_at              DATETIME NOT NULL,
    status              ENUM('upcoming','active','ended') NOT NULL DEFAULT 'upcoming',
    created_by_user_id  INT NOT NULL,
    CONSTRAINT fk_promo_creator FOREIGN KEY (created_by_user_id) REFERENCES USERS(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================================
-- 21. PROMOTION_EVENT_PRODUCTS
-- =====================================================================
CREATE TABLE PROMOTION_EVENT_PRODUCTS (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    product_id  INT NOT NULL,
    event_id    INT NOT NULL,
    CONSTRAINT fk_pep_product FOREIGN KEY (product_id) REFERENCES PRODUCTS(product_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_pep_event FOREIGN KEY (event_id) REFERENCES PROMOTION_EVENTS(event_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT uq_pep UNIQUE (product_id, event_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 22. BANNERS
-- =====================================================================
CREATE TABLE BANNERS (
    banner_id           INT AUTO_INCREMENT PRIMARY KEY,
    created_by_user_id  INT NOT NULL,
    image_url           VARCHAR(500) NOT NULL,
    position             VARCHAR(50) NOT NULL,
    start_at             DATETIME NOT NULL,
    end_at               DATETIME NOT NULL,
    status               ENUM('active','inactive') NOT NULL DEFAULT 'active',
    CONSTRAINT fk_banner_creator FOREIGN KEY (created_by_user_id) REFERENCES USERS(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================================
-- 23. AUDIT_LOGS  (entity_id is a polymorphic key - no strict FK)
-- =====================================================================
CREATE TABLE AUDIT_LOGS (
    audit_id       INT AUTO_INCREMENT PRIMARY KEY,
    action         VARCHAR(100) NOT NULL,
    entity_type    VARCHAR(100) NOT NULL,
    entity_id      INT NOT NULL,
    from_status    VARCHAR(50) NULL,
    to_status      VARCHAR(50) NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor_user_id  INT NOT NULL,
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES USERS(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- =====================================================================
-- 24. BLOG_POSTS (added for admin blog management - improvement.md #12;
--     no BLOG table existed previously, content was hardcoded frontend data)
-- =====================================================================
CREATE TABLE BLOG_POSTS (
    post_id             INT AUTO_INCREMENT PRIMARY KEY,
    slug                VARCHAR(255) NOT NULL UNIQUE,
    title               VARCHAR(255) NOT NULL,
    excerpt             VARCHAR(500) NULL,
    content             TEXT NOT NULL,
    image_url           VARCHAR(500) NULL,
    author              VARCHAR(150) NULL,
    status              ENUM('draft','published') NOT NULL DEFAULT 'draft',
    created_by_user_id  INT NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_blogpost_author FOREIGN KEY (created_by_user_id) REFERENCES USERS(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- Helper INDEXES for frequently searched / filtered columns
-- =====================================================================
CREATE INDEX idx_products_category ON PRODUCTS(category_id);
CREATE INDEX idx_products_status ON PRODUCTS(status);
CREATE INDEX idx_images_product ON IMAGES(product_id);
CREATE INDEX idx_images_combo ON IMAGES(combo_id);
CREATE INDEX idx_orders_user ON ORDERS(user_id);
CREATE INDEX idx_orders_status ON ORDERS(status);
CREATE INDEX idx_orderitems_order ON ORDER_ITEMS(order_id);
CREATE INDEX idx_cartitems_cart ON CART_ITEMS(cart_id);
CREATE INDEX idx_returnrequests_status ON RETURN_REQUESTS(status);
CREATE INDEX idx_audit_entity ON AUDIT_LOGS(entity_type, entity_id);
CREATE INDEX idx_blogposts_status ON BLOG_POSTS(status);

-- END OF SCRIPT