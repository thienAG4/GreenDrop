# 🪴 GreenDrop Terrarium

**Team 10**

Ứng dụng thương mại điện tử full-stack cho một cửa hàng terrarium (bể cảnh
mini): danh mục sản phẩm, giỏ hàng, thanh toán, đơn hàng, Builder (thiết kế
terrarium bằng AI/3D), đổi trả & hoàn tiền, đánh giá, và khuyến mãi — cùng
một trang quản trị (admin) riêng biệt. Backend dùng **Node.js/Express +
MySQL 8** (Routes → Controllers → Services) và frontend dùng **AngularJS
1.x + Bootstrap 5**. Quy ước code và triết lý kiến trúc được ghi trong
`AGENTS.md` — đọc file đó trước khi viết bất kỳ đoạn code nào.

## 📁 Cấu trúc thư mục

```
docker-compose.yml      # MySQL 8 + backend API, được cấu hình sẵn với nhau
backend/
  create_database.sql   # schema (24 bảng) — xem mục "Cơ sở dữ liệu" bên dưới
  init.sql               # dữ liệu seed (dữ liệu mẫu)
  app.js, server.js
  config/db.js           # connection pool của mysql2/promise
  routes/ controllers/ services/   # Routes → Controllers → Services
  middleware/            # xác thực (JWT), upload file (multer), xử lý lỗi
  utils/constants.js     # hằng số nghiệp vụ & ánh xạ enum (nên đọc đầu tiên)
  uploads/               # ảnh sản phẩm/đánh giá/đổi trả/blog (hoặc docker volume)
client/
  index.html             # điểm vào duy nhất, load AngularJS + Bootstrap qua CDN
  app.js, app.routes.js   # khai báo module, cấu hình ngRoute (toàn bộ route)
  services/ controllers/ directives/ filters/   # một module ('app'), phẳng theo tính năng
  views/                 # các HTML partial tương ứng với từng route
  css/                   # tokens.css (design token) + components.css + layout.css
admin/
  Trang quản trị độc lập, tách riêng khỏi client/ - có module AngularJS
  riêng ('adminApp'), có index.html/port/trang đăng nhập riêng, dùng chung
  quy ước/design token với client/ nhưng không dùng chung module Angular.
  Xem mục "Trang quản trị" bên dưới.
```

## 🚀 Khởi động nhanh (Docker Compose — khuyến nghị)

Yêu cầu đã cài Docker.

```bash
docker compose up -d --build
```

Lệnh này build image cho backend, khởi động MySQL 8, và tự động nạp
`backend/create_database.sql` rồi đến `backend/init.sql` ở lần khởi động
đầu tiên (thông qua `docker-entrypoint-initdb.d`). API sẽ chạy tại
**http://localhost:4000**.

```bash
curl http://localhost:4000/api/health
# {"data":{"status":"ok"}}
```

Reset lại database (xóa toàn bộ dữ liệu và nạp lại từ các file SQL):

```bash
docker compose down -v && docker compose up -d --build
```

## 💻 Chạy frontend

Là các file tĩnh thuần túy, không cần bước build (AngularJS 1.x, không phải
Angular hiện đại) — nhưng các partial `templateUrl` của `ngRoute` bị chặn
bởi CORS khi mở qua `file://`, nên **phải chạy qua HTTP**:

```bash
cd client
npm install
npm start   # chạy http-server tại http://localhost:8080, đã tắt cache
```

Mở **http://localhost:8080/** trong khi backend đang chạy ở cổng 4000. Base
URL của API được cấu hình trong `client/app.js` (hằng số `API_BASE_URL`).

## 🛠️ Trang quản trị (Admin)

Là một **ứng dụng độc lập, tách riêng** nằm ở `admin/` — có module
AngularJS riêng (`adminApp`), màn hình đăng nhập riêng, cổng riêng. Dùng
chung backend API và tài khoản nhân viên/admin, nhưng không dùng chung
origin trình duyệt với `client/` (đăng nhập ở app này không đăng nhập app kia).

```bash
cd admin
npm install
npm start   # http://localhost:8081
```

Bao gồm: sản phẩm, Combo Builder (thiết kế do admin tạo), danh mục, đơn
hàng, đổi trả & hoàn tiền, khách hàng, kiểm duyệt đánh giá, voucher, sự
kiện khuyến mãi, banner, và CRUD cho blog, cùng một dashboard doanh
thu/sản phẩm bán chạy.

## 🔑 Tài khoản mẫu (seed data)

Tất cả tài khoản mẫu đều dùng chung một mật khẩu đã băm bằng bcrypt:
**`greendrop123`**.

- Admin: `admin@greendrop.com`
- Nhân viên: `lily@greendrop.com`, `tom@greendrop.com`
- Khách hàng: `alice@example.com`, `bob@example.com`, `carol@example.com`,
  `dave@example.com`, hoặc `customerN@example.com` (N = 8-37)

Có thể đăng ký tài khoản mới qua frontend hoặc `POST /api/auth/register`,
hoặc dùng chức năng "Quên mật khẩu" (mã xác minh sẽ được in ra console log
của backend — giả lập gửi email).

## 🗄️ Cơ sở dữ liệu

`backend/create_database.sql` định nghĩa **24 bảng / 34 quan hệ khóa ngoại
(FK)**, được nhóm theo tính năng:

- **Định danh**: `USERS`, `ADDRESS`
- **Danh mục sản phẩm**: `CATEGORIES`, `PRODUCTS`, `IMAGES`, `PRODUCT_ATTRIBUTES`, `PRODUCT_FAQS`
- **Combo Builder**: `COMBOS`, `COMBO_ITEMS`
- **Giỏ hàng**: `CARTS`, `CART_ITEMS`
- **Đơn hàng**: `ORDERS`, `ORDER_ITEMS`, `ORDER_ITEM_COMPONENTS`
- **Đổi trả & hoàn tiền**: `RETURN_REQUESTS`, `RETURN_ITEMS`, `REFUNDS`
- **Đánh giá**: `REVIEWS`
- **Khuyến mãi**: `VOUCHERS`, `PROMOTION_EVENTS`, `PROMOTION_EVENT_PRODUCTS`, `BANNERS`
- **Vận hành**: `AUDIT_LOGS`, `BLOG_POSTS`

Hai điểm khác biệt so với bản schema gốc ban đầu:

- **`IMAGES` thay thế cho một bảng `PRODUCT_IMAGES` riêng.** Đây là một
  bảng dùng chung (`product_id` có thể NULL, `combo_id` có thể NULL, cờ
  `is_combo`) cho phép cả `PRODUCTS` và `COMBOS` có một thư viện ảnh
  1-nhiều (1-M) trên cùng một bảng; `sort_order = 1` luôn là ảnh đại diện
  (thumbnail). MySQL 8 không cho phép đặt ràng buộc CHECK trên một cột
  đồng thời có hành động FK `ON UPDATE/DELETE CASCADE`, nên quy tắc "chỉ
  một trong hai `product_id`/`combo_id` được đặt giá trị" được kiểm tra ở
  `backend/services/products.service.js`, không phải trong SQL.
- **`BLOG_POSTS` được thêm mới** để hỗ trợ một blog thực sự do admin quản
  lý (trước đây nội dung blog được viết cứng ở frontend) —
  `created_by_user_id → USERS`, `ON DELETE RESTRICT`.

## 📋 Quy trình & quy tắc nghiệp vụ

Ứng dụng triển khai 7 quy trình nghiệp vụ cốt lõi:

1. **Khám phá & mua sản phẩm** — khách vãng lai (guest) và khách hàng
   (customer) duyệt/tìm kiếm sản phẩm, thêm vào giỏ hàng, và thanh toán
   (COD hoặc cổng thanh toán online giả lập kèm mã QR). Mỗi đơn hàng chỉ
   áp dụng tối đa một voucher; với thanh toán online, mã QR có hiệu lực
   trong 15 phút.
2. **Mua hàng qua Builder (AI hoặc 3D)** — một thiết kế cần có ít nhất một
   chậu/bình và một loại đất nền (BR-02) trước khi có thể lưu hoặc thêm
   vào giỏ hàng; chỉ được dùng các thành phần còn hàng, và sản phẩm từ
   Builder sẽ có thêm phí lắp ráp khi thanh toán.
3. **Hủy đơn & hoàn tiền** — khách hàng chỉ có thể hủy đơn khi đơn đang ở
   trạng thái "đang chuẩn bị hàng" (trước khi giao vận); đơn COD bị hủy
   thì không cần hoàn tiền, đơn thanh toán online sẽ tự động kích hoạt
   hoàn tiền qua cổng thanh toán (nếu thất bại sẽ chuyển sang xử lý thủ
   công bởi admin).
4. **Đổi trả & hoàn tiền** — yêu cầu đổi trả phải được gửi trong một
   khoảng thời hạn tính từ khi đơn hàng chuyển sang trạng thái
   `DELIVERED` (48 giờ với lý do hư hỏng/lỗi vận chuyển, 7 ngày với lý do
   lỗi tiềm ẩn của sản phẩm) và phải kèm ít nhất một ảnh minh chứng; tài
   khoản có hơn 3 yêu cầu đổi trả trong 180 ngày sẽ bị gắn cờ để admin xét
   duyệt thủ công. Hoàn tiền chỉ được thực hiện sau khi sản phẩm trả lại
   được nhận và kiểm tra thực tế.
5. **Đánh giá sản phẩm** — chỉ áp dụng cho sản phẩm thuộc các đơn hàng đã
   `DELIVERED` của chính người đánh giá, mỗi đơn hàng chỉ được đánh giá
   một lần, thang điểm 1-5 sao, có kiểm duyệt spam/ngôn từ không phù hợp
   cơ bản trước khi hiển thị.
6. **Quản lý sản phẩm** — chỉ admin mới được CRUD; không thể xóa một sản
   phẩm nếu nó đang nằm trong đơn hàng ở trạng thái chờ xử lý/đang chuẩn
   bị hàng.
7. **Tạo khuyến mãi** — chỉ admin mới được tạo voucher/banner/sự kiện
   khuyến mãi, mỗi cái có khoảng thời gian bắt đầu/kết thúc riêng; các
   khuyến mãi hết hạn hoặc chưa đến thời gian áp dụng sẽ tự động bị ẩn
   hoặc từ chối.

Bản đặc tả gốc để ngỏ câu hỏi "một sản phẩm combo nên được mô hình hóa như
thế nào?" giữa ba lựa chọn; ở bản dựng này, câu trả lời được chốt là **cả
hai** — một combo vừa là một dòng sản phẩm thực sự (tên, giá) **vừa** được
định nghĩa bởi các thành phần cấu tạo nên nó.

## 🔌 Tổng quan API

Mọi response đều dùng dạng `{ data, message }` khi thành công hoặc
`{ error }` khi thất bại. Xác thực dùng header `Authorization: Bearer
<token>`. Khách vãng lai (guest) mang theo header `X-Session-Token` do
client tự sinh để định danh giỏ hàng/thanh toán xuyên suốt các request.

| Nhóm chức năng | Route |
|---|---|
| Xác thực | `POST /api/auth/register`, `/login`, `GET /me`, `/forgot-password`, `/verify-reset-code`, `/reset-password`, `/change-password` |
| Người dùng | `PUT /api/users/me`, CRUD địa chỉ tại `/api/users/me/addresses`, danh sách/trạng thái người dùng cho admin |
| Danh mục sản phẩm | `GET /api/categories`, `GET /api/products` (tìm kiếm/lọc/sắp xếp/phân trang), `GET /api/products/:id`, CRUD cho admin |
| Giỏ hàng | `GET/POST/PUT/DELETE /api/cart` (guest qua header, customer qua token) |
| Builder | `POST /api/combos` (thiết kế AI hoặc 3D), `/ai-preview`, `/mine`, cập nhật/xóa |
| Thanh toán/Đơn hàng | `POST /api/orders`, `GET /mine`, `/admin`, `/track`, `/:id`, xác nhận thanh toán, hủy đơn, chuyển trạng thái |
| Đổi trả/Hoàn tiền | `POST /api/returns` (kèm ảnh minh chứng), `/:id/tracking`, admin duyệt/từ chối/xác nhận đã nhận hàng, `/api/returns/refunds` xem + thử lại cho admin |
| Đánh giá | `POST /api/reviews` (multipart, ảnh tùy chọn), `GET /api/reviews/product/:id`, `/mine`, kiểm duyệt cho admin |
| Khuyến mãi | `GET /api/vouchers/active` (public), CRUD voucher/sự kiện khuyến mãi/banner cho admin |
| Nhật ký hệ thống | `GET /api/audit-logs` (admin) |

## 🧪 Các đơn giản hóa chính so với đặc tả gốc

Schema được xem là cố định (ngoại trừ hai điểm khác biệt nêu trên); ở
những chỗ quy tắc nghiệp vụ hoặc thiết kế cần một cột mà schema không có,
cách xử lý được tập trung tại **`backend/utils/constants.js`**:

- Các enum trạng thái đơn hàng/đổi trả
  (`pending/confirmed/shipping/delivered/cancelled/returned`,
  `pending/approved/rejected/completed`) đóng vai trò thay thế cho các tên
  trạng thái dài hơn trong tài liệu nghiệp vụ.
- `CART_ITEMS` không có cột `quantity` — thay vào đó mỗi đơn vị sản phẩm
  là một dòng riêng.
- `COMBOS.created_by_user_id` và `ORDERS.user_id` đều `NOT NULL`, nên việc
  lưu thiết kế Builder của khách vãng lai bắt buộc phải đăng nhập, còn
  checkout của khách vãng lai sẽ tự động tạo ngầm một dòng `USERS` tối
  giản phía sau.
- `REFUNDS.return_id` là `NOT NULL` — khoản hoàn tiền do hủy đơn được ghi
  nhận dưới dạng một dòng `RETURN_REQUESTS` do hệ thống tự tạo.
- Các cổng thanh toán (MoMo/VNPay/QR) và email/SMS đều được **giả lập**,
  chưa kết nối với nhà cung cấp thật.
- Mã xác minh đặt lại mật khẩu được lưu trong một `Map` trong bộ nhớ (mất
  khi backend khởi động lại).
- Wishlist và canvas của 3D Terrarium Studio là các đơn giản hóa chỉ chạy
  ở phía client (không có bảng lưu trữ tương ứng; "3D" Studio thực chất là
  một canvas kéo-thả 2D).
- Tính năng xem trước ảnh AI của Combo Builder gọi API SDXL Base 1.0 của
  Pixazo khi có `PIXAZO_API_KEY`, nếu không sẽ dùng ảnh placeholder thay thế.

## ⚙️ Biến môi trường (`backend/.env`)

| Biến | Công dụng |
|---|---|
| `PORT` | Cổng chạy API (mặc định 4000) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Kết nối MySQL |
| `JWT_SECRET` | Khóa ký cho token xác thực — cần đặt một giá trị ngẫu nhiên thật sự |
| `JWT_EXPIRES_IN` | Thời gian sống của token (mặc định `7d`) |
| `PUBLIC_UPLOADS_URL` | Base URL dùng để dựng link tới các ảnh đã upload |
| `PIXAZO_API_KEY` | Không bắt buộc. API key của Pixazo cho ảnh xem trước AI thật của Combo Builder. Không đặt = dùng ảnh placeholder giả lập. |

## 🔧 Cài đặt backend thủ công (không dùng Docker)

1. Đảm bảo MySQL 8 đang chạy ở máy local.
2. Nạp schema và dữ liệu mẫu:
   ```bash
   mysql -uroot -p < backend/create_database.sql
   mysql -uroot -p < backend/init.sql
   ```
3. Cấu hình backend:
   ```bash
   cd backend
   cp .env.example .env
   # chỉnh sửa .env với thông tin kết nối DB của bạn
   npm install
   npm start          # hoặc: npm run dev (tự khởi động lại khi file thay đổi)
   ```

## ✅ Tình trạng hiện tại

Đã hoàn thành: toàn bộ schema + dữ liệu mẫu, môi trường Docker Compose,
toàn bộ backend API (xác thực, danh mục sản phẩm, giỏ hàng, Builder,
thanh toán, hủy đơn/hoàn tiền, đổi trả, đánh giá, khuyến mãi, nhật ký hệ
thống), và toàn bộ frontend AngularJS (trang bán hàng, giỏ hàng/thanh
toán, khu vực tài khoản, luồng đơn hàng/đổi trả, Combo Builder, trang
quản trị, các trang nội dung tĩnh).

Các phần còn thiếu / chủ đích nằm ngoài phạm vi: render 3D thật, tích hợp
cổng thanh toán thật, gửi email/SMS thật, lưu trữ wishlist/blog được xử
lý ở phía client như đã ghi chú ở trên.
