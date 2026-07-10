const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/error-handler');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const categoryRoutes = require('./routes/categories.routes');
const productRoutes = require('./routes/products.routes');
const comboRoutes = require('./routes/combos.routes');
const cartRoutes = require('./routes/cart.routes');
const voucherRoutes = require('./routes/vouchers.routes');
const promotionRoutes = require('./routes/promotions.routes');
const bannerRoutes = require('./routes/banners.routes');
const orderRoutes = require('./routes/orders.routes');
const returnRoutes = require('./routes/returns.routes');
const reviewRoutes = require('./routes/reviews.routes');
const auditLogRoutes = require('./routes/audit-logs.routes');
const uploadRoutes = require('./routes/uploads.routes');
const blogRoutes = require('./routes/blog.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

app.use(cors());
// Default 100kb is too small for the Combo Builder's saveDesign/checkoutDesign
// payload, which can carry a base64-encoded AI preview image (see combos.service.js).
app.use(express.json({ limit: '15mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ data: { status: 'ok' } }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/combos', comboRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

module.exports = app;
