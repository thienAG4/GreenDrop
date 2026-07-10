// Self-contained FAQ section — no backend FAQ table exists at the site
// level (distinct from PRODUCT_FAQS), so this is static content.
angular.module('app').directive('gdFaqSection', function () {
  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'views/partials/section-faq.html',
    controllerAs: 'vm',
    controller: function (placeholderImagesService) {
      var vm = this;
      vm.accordionId = 'gdFaq' + Math.floor(Math.random() * 1000000);
      vm.image = placeholderImagesService.named('FAQ.png');
      vm.faqs = [
        { q: 'Terrarium có dễ chăm sóc không?', a: 'Terrarium đóng cần rất ít nước và ánh sáng gián tiếp, phù hợp với người mới bắt đầu.' },
        { q: 'GreenDrop có giao hàng toàn quốc không?', a: 'Có, chúng tôi giao hàng toàn quốc với đóng gói chống sốc chuyên dụng.' },
        { q: 'Tôi có thể tự thiết kế terrarium của riêng mình không?', a: 'Có, hãy thử Terrarium Builder để tự chọn phụ kiện và thiết kế theo ý thích.' },
        { q: 'Chính sách đổi trả như thế nào?', a: 'Bạn có thể yêu cầu đổi trả trong vòng 48 giờ nếu sản phẩm bị hư hỏng hoặc không đúng mô tả.' },
        { q: 'Tôi có thể thanh toán bằng những hình thức nào?', a: 'GreenDrop hỗ trợ COD, chuyển khoản ngân hàng, thẻ tín dụng và ví điện tử.' },
        { q: 'Làm sao để theo dõi đơn hàng của tôi?', a: 'Bạn có thể theo dõi đơn hàng qua mục "Theo dõi đơn hàng" trên thanh điều hướng.' },
      ];
    },
  };
});
