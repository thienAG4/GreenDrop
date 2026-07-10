angular.module('app').controller('HomeController', function (
  $scope, $location, $interval, $q,
  productsService, categoriesService, bannersService, promotionsService, placeholderImagesService
) {
  var vm = this;
  vm.searchTerm = '';

  // ---- Hero / search --------------------------------------------------
  vm.search = function () {
    $location.path('/san-pham').search('q', vm.searchTerm || '');
  };
  vm.heroImage = placeholderImagesService.named('hero-image.jpg');

  // ---- Full-width inspiration banner -----------------------------------
  vm.inspirationImage = placeholderImagesService.named('hero-image.jpg');

  // ---- Shop by Space -----------------------------------------------------
  vm.spaces = [
    { name: 'Phòng khách', image: placeholderImagesService.named('phong_khach.png') },
    { name: 'Phòng ngủ', image: placeholderImagesService.named('phong_ngu.png') },
    { name: 'Góc làm việc', image: placeholderImagesService.named('goc_lam_viec.png') },
    { name: 'Phòng tắm', image: placeholderImagesService.named('phong_tam.png') },
  ];

  // ---- About Us + stats --------------------------------------------------
  vm.aboutImage = placeholderImagesService.named('about_us.png');
  vm.stats = [
    { value: '25+', label: 'Danh mục' },
    { value: '500+', label: 'Sản phẩm' },
    { value: '99%', label: 'Khách hàng hài lòng' },
  ];
  categoriesService.list().then(function (cats) {
    vm.categories = cats;
    vm.stats[0].value = cats.length + '+';
  });
  productsService.list({ limit: 1 }).then(function (res) {
    vm.stats[1].value = res.meta.total + '+';
  });

  // ---- Categories + Best Sellers -----------------------------------------
  vm.featuredCategories = [];
  var categoryImages = placeholderImagesService.namedList(['reu.png', 'nhietdoi.png', 'rungmuanhietdoi.png', 'thien.png']);
  categoriesService.list().then(function (cats) {
    vm.featuredCategories = cats.slice(0, 4).map(function (c, i) {
      return angular.extend({}, c, { image: categoryImages[i] });
    });
  });
  vm.bestSellers = [];
  productsService.list({ sort: 'featured', limit: 8 }).then(function (res) { vm.bestSellers = res.items; });

  // ---- Flash Sale countdown -----------------------------------------------
  vm.flashSaleImage = placeholderImagesService.named('sales.png');
  vm.countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  var flashSaleTarget = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // fallback: 2 days out
  promotionsService.listActive().then(function (events) {
    if (events && events.length) {
      var soonest = events.reduce(function (a, b) {
        return new Date(a.end_at) < new Date(b.end_at) ? a : b;
      });
      flashSaleTarget = new Date(soonest.end_at);
    }
    tickCountdown();
  });
  function tickCountdown() {
    var diff = flashSaleTarget.getTime() - Date.now();
    if (diff < 0) diff = 0;
    vm.countdown.days = Math.floor(diff / (24 * 60 * 60 * 1000));
    vm.countdown.hours = Math.floor((diff / (60 * 60 * 1000)) % 24);
    vm.countdown.minutes = Math.floor((diff / (60 * 1000)) % 60);
    vm.countdown.seconds = Math.floor((diff / 1000) % 60);
  }
  var countdownInterval = $interval(tickCountdown, 1000);
  $scope.$on('$destroy', function () { $interval.cancel(countdownInterval); });

  // ---- Highlighted Discounted Products ------------------------------------
  vm.discountedProducts = [];
  promotionsService.listActive().then(function (events) {
    var ids = [];
    (events || []).forEach(function (e) {
      (e.products || []).forEach(function (p) {
        if (ids.indexOf(p.product_id) === -1) ids.push(p.product_id);
      });
    });
    if (!ids.length) return;
    $q.all(ids.slice(0, 8).map(function (id) { return productsService.get(id); })).then(function (full) {
      vm.discountedProducts = full;
    });
  });

  // ---- Special Promo Banners (2-up) ---------------------------------------
  // Two alternating copy "stories": a %-off headline (banner 0) and a
  // minimum-order-value headline (banner 1) - same pattern regardless of
  // whether the images/dates come from real BANNERS rows or the placeholder
  // fallback below, so the two cards always read as distinct offers.
  var PROMO_COPY = [
    { line1: 'Ưu đãi mùa hè', line2: 'Giảm giá lên đến', highlightValue: '50%' },
    { line1: 'Giảm thêm 25%', line2: 'Cho đơn hàng từ', highlightValue: '2.000.000đ' },
  ];
  var PROMO_DISCLAIMER = '*Điều khoản áp dụng';

  function pad2(n) { return ('0' + n).slice(-2); }
  // BANNERS.start_at/end_at come back as MySQL "YYYY-MM-DD HH:MM:SS" strings
  // (config/db.js sets dateStrings: true, no 'T'/'Z') - parse explicitly as
  // UTC rather than handing them to `new Date(str)` directly, which browsers
  // read as local time (same bug class described in AGENTS.md for the
  // checkout payment countdown).
  function parseUtc(str) { return new Date(str.replace(' ', 'T') + 'Z'); }
  function formatDayMonth(d) { return pad2(d.getUTCDate()) + '/' + pad2(d.getUTCMonth() + 1); }
  function formatFullDate(d) { return formatDayMonth(d) + '/' + d.getUTCFullYear(); }
  function dateRangeFrom(startStr, endStr) {
    return 'Áp dụng từ ' + formatDayMonth(parseUtc(startStr)) + ' - ' + formatFullDate(parseUtc(endStr));
  }
  // Placeholder fallback (no real active banners yet) still shows a real,
  // rolling date range - the current calendar month - rather than a
  // hardcoded date that would go stale.
  function currentMonthRange() {
    var now = new Date();
    var start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    var end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    return 'Áp dụng từ ' + formatDayMonth(start) + ' - ' + formatFullDate(end);
  }

  vm.promoBanners = [];
  bannersService.listActive().then(function (banners) {
    if (banners && banners.length >= 2) {
      vm.promoBanners = banners.slice(0, 2).map(function (b, i) {
        return angular.extend({ image: b.image_url, dateRange: dateRangeFrom(b.start_at, b.end_at), disclaimer: PROMO_DISCLAIMER }, PROMO_COPY[i]);
      });
    } else {
      var imgs = placeholderImagesService.namedList(['spec_sales_1.png', 'spec_sales_2.png']);
      var range = currentMonthRange();
      vm.promoBanners = imgs.map(function (img, i) {
        return angular.extend({ image: img, dateRange: range, disclaimer: PROMO_DISCLAIMER }, PROMO_COPY[i]);
      });
    }
  });

  // ---- Personalized Offers -------------------------------------------------
  vm.personalizedProducts = [];
  productsService.list({ sort: 'rating', limit: 8 }).then(function (res) { vm.personalizedProducts = res.items; });

  // ---- Weekly Green Offer --------------------------------------------------
  vm.weeklyOfferImage = placeholderImagesService.named('weekly_offer.png');

  // ---- Testimonials ----------------------------------------------------
  vm.testimonialImage = placeholderImagesService.named('customer_perspective.png');
  vm.testimonials = [
    { quote: 'Sản phẩm đóng gói cẩn thận, cây khỏe mạnh, dịch vụ chăm sóc khách hàng rất tận tình. Mình sẽ ủng hộ GreenDrop dài dài!', name: 'Nguyễn Thảo', role: 'Khách hàng thân thiết' },
    { quote: 'Terrarium đẹp hơn cả mong đợi, đóng gói chắc chắn, giao hàng nhanh. Rất đáng tiền!', name: 'Trần Minh', role: 'Khách hàng mới' },
    { quote: 'Combo Builder cho mình tự thiết kế bể theo ý thích, trải nghiệm rất thú vị.', name: 'Lê Hương', role: 'Khách hàng thân thiết' },
  ];

  // Value Propositions, Social Media Feed, FAQ, App Promo, and Newsletter
  // are now self-contained directives (gd-value-props, gd-instagram-feed,
  // gd-faq-section, gd-app-promo, gd-newsletter) — see client/directives/ —
  // so they carry their own data/images and can be reused on other pages.
});
