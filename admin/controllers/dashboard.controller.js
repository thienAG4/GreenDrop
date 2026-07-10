angular.module('adminApp').controller('DashboardController', function (
  dashboardService, productsService, ordersService, returnsService, vouchersService, gdCurrencyFilter
) {
  var vm = this;
  vm.stats = {
    products: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    pendingReturns: 0,
    activeVouchers: 0,
  };
  vm.revenueChartData = null;
  vm.topProductsChartData = null;
  vm.orderStatusChartData = null;

  function formatDay(isoDay) {
    var d = new Date(isoDay);
    return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2);
  }

  // Chart.js gradient fills need the canvas's rendering context, which is only
  // available once the chart has an area to draw into - Chart.js calls
  // backgroundColor functions with that context at render/resize time.
  function verticalGradient(colorStart, colorEnd) {
    return function (context) {
      var chart = context.chart;
      var area = chart.chartArea;
      if (!area) return colorStart;
      var gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
      gradient.addColorStop(0, colorStart);
      gradient.addColorStop(1, colorEnd);
      return gradient;
    };
  }

  var TOP_PRODUCT_COLORS = ['#09AD2A', '#2F5B3B', '#78C27B', '#F5B83D', '#3498DB'];
  var ORDER_STATUS_LABELS = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã huỷ', returned: 'Đã trả hàng' };
  var ORDER_STATUS_COLORS = { pending: '#F39C12', confirmed: '#3498DB', shipping: '#78C27B', delivered: '#09AD2A', cancelled: '#E74C3C', returned: '#7F8C8D' };
  var ORDER_STATUS_ORDER = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled', 'returned'];

  productsService.list({ admin: true, limit: 1 }).then(function (res) { vm.stats.products = res.meta.total; });
  ordersService.adminStats().then(function (counts) {
    vm.stats.pendingOrders = counts.pending + counts.confirmed;

    vm.orderStatusChartData = {
      labels: ORDER_STATUS_ORDER.map(function (s) { return ORDER_STATUS_LABELS[s]; }),
      datasets: [{
        data: ORDER_STATUS_ORDER.map(function (s) { return counts[s]; }),
        backgroundColor: ORDER_STATUS_ORDER.map(function (s) { return ORDER_STATUS_COLORS[s]; }),
        borderWidth: 0,
        hoverOffset: 6,
      }],
    };
  });
  returnsService.listAll({ status: 'pending' }).then(function (returns) { vm.stats.pendingReturns = returns.length; });
  vouchersService.list().then(function (vouchers) {
    vm.stats.activeVouchers = vouchers.filter(function (v) { return v.status === 'active'; }).length;
  });

  dashboardService.getStats().then(function (stats) {
    vm.stats.totalRevenue = stats.total_revenue;
    vm.stats.totalCustomers = stats.total_customers;

    vm.revenueChartData = {
      labels: stats.revenue_by_day.map(function (r) { return formatDay(r.day); }),
      datasets: [{
        label: 'Doanh thu',
        data: stats.revenue_by_day.map(function (r) { return r.revenue; }),
        borderColor: '#09AD2A',
        backgroundColor: verticalGradient('rgba(9, 173, 42, 0.30)', 'rgba(9, 173, 42, 0)'),
        pointBackgroundColor: '#09AD2A',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
      }],
    };

    vm.topProductsChartData = {
      labels: stats.top_products.map(function (p) { return p.name; }),
      datasets: [{
        label: 'Doanh thu',
        data: stats.top_products.map(function (p) { return p.revenue; }),
        backgroundColor: stats.top_products.map(function (p, i) { return TOP_PRODUCT_COLORS[i % TOP_PRODUCT_COLORS.length]; }),
        borderRadius: 6,
        maxBarThickness: 26,
      }],
    };
  });

  vm.revenueChartOptions = {
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: function (ctx) { return 'Doanh thu: ' + gdCurrencyFilter(ctx.parsed.y); } } },
    },
    scales: {
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: function (v) { return gdCurrencyFilter(v); } } },
      x: { grid: { display: false } },
    },
  };
  vm.topProductsChartOptions = {
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: function (ctx) { return gdCurrencyFilter(ctx.parsed.x); } } },
    },
    scales: {
      x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: function (v) { return gdCurrencyFilter(v); } } },
      y: { grid: { display: false } },
    },
  };
  vm.orderStatusChartOptions = {
    cutout: '68%',
    plugins: {
      legend: { position: 'bottom' },
      tooltip: { callbacks: { label: function (ctx) { return ctx.label + ': ' + ctx.parsed; } } },
    },
  };
});
