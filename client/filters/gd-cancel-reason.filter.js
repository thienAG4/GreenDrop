// Customers shouldn't see internal/technical cancellation strings (e.g. the QR
// payment-expiry system message "Payment window expired (15 minutes)") -
// translate the known system-generated reasons into plain business language.
// A customer's own selected cancellation reason is already human-readable
// Vietnamese and passes through unchanged. Mirrors admin/filters/
// gd-cancel-reason.filter.js - keep the two in sync if a new system reason is
// added in orders.service.js.
angular.module('app').filter('gdCancelReason', function () {
  var SYSTEM_REASONS = [
    { match: /payment window expired/i, label: 'Tự động huỷ do chưa thanh toán trong thời gian quy định (tối đa 15 phút với thanh toán trực tuyến).' },
    { match: /payment gateway declined/i, label: 'Giao dịch bị cổng thanh toán từ chối.' },
    { match: /^cancelled by admin$/i, label: 'Đơn hàng được cửa hàng huỷ.' },
    { match: /^cancelled by customer$/i, label: 'Bạn đã yêu cầu huỷ đơn hàng.' },
  ];
  return function (reason) {
    if (!reason) return 'Không có';
    var found = SYSTEM_REASONS.filter(function (r) { return r.match.test(reason); })[0];
    return found ? found.label : reason;
  };
});
