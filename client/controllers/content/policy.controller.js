angular.module('app').controller('PolicyController', function () {
  var vm = this;
  vm.sections = [
    {
      id: 'doi-tra', title: 'Chính sách đổi trả',
      items: [
        'Khách hàng có thể yêu cầu trả hàng trong 48h (hư hỏng/giao sai) hoặc 7 ngày (lỗi sản phẩm) kể từ khi nhận hàng.',
        'Yêu cầu trả hàng cần có ít nhất một hình ảnh minh chứng.',
        'Chi phí vận chuyển ban đầu do khách hàng chi trả, được hoàn lại sau khi kiểm tra đạt yêu cầu.',
      ],
    },
    {
      id: 'bao-mat', title: 'Chính sách bảo mật',
      items: [
        'Thông tin cá nhân của khách hàng được bảo mật và chỉ sử dụng cho mục đích xử lý đơn hàng.',
        'GreenDrop không chia sẻ thông tin khách hàng cho bên thứ ba khi chưa có sự đồng ý.',
      ],
    },
    {
      id: 'dieu-khoan', title: 'Điều khoản dịch vụ',
      items: [
        'Đơn hàng chỉ được xác nhận sau khi hệ thống kiểm tra tồn kho thành công.',
        'Chỉ áp dụng 1 voucher cho mỗi đơn hàng.',
        'GreenDrop có quyền từ chối đơn hàng nếu phát hiện gian lận.',
      ],
    },
    {
      id: 'van-chuyen', title: 'Chính sách vận chuyển',
      items: [
        'Đơn hàng được giao trong 3-5 ngày làm việc trên toàn quốc.',
        'Phí vận chuyển đồng giá, được hiển thị rõ tại bước thanh toán.',
        'Terrarium được đóng gói chống sốc chuyên dụng để đảm bảo an toàn khi vận chuyển.',
      ],
    },
    {
      id: 'thanh-toan', title: 'Chính sách thanh toán',
      items: [
        'GreenDrop hỗ trợ thanh toán khi nhận hàng (COD), chuyển khoản ngân hàng, thẻ tín dụng và ví điện tử.',
        'Đơn hàng thanh toán online được giữ chỗ tối đa 15 phút để hoàn tất giao dịch.',
        'Mọi giao dịch được ghi nhận và đối soát đầy đủ trong hệ thống.',
      ],
    },
    {
      id: 'huy-don', title: 'Chính sách hủy đơn hàng',
      items: [
        'Khách hàng chỉ có thể hủy đơn khi đơn hàng đang ở trạng thái "Đã xác nhận" (đang chuẩn bị hàng).',
        'Đơn thanh toán COD không phát sinh hoàn tiền khi hủy.',
        'Đơn thanh toán online sẽ được hoàn tiền tự động sau khi hủy thành công.',
      ],
    },
    {
      id: 'bao-hanh', title: 'Chính sách bảo hành',
      items: [
        'Sản phẩm lỗi do nhà sản xuất được đổi mới miễn phí trong 7 ngày kể từ khi nhận hàng.',
        'Cây trồng trong terrarium được bảo hành sống trong 48 giờ đầu tiên.',
        'Chi phí vận chuyển bảo hành do GreenDrop chi trả nếu lỗi thuộc về sản phẩm.',
      ],
    },
    {
      id: 'khuyen-mai', title: 'Chính sách khuyến mãi & voucher',
      items: [
        'Mỗi đơn hàng chỉ được áp dụng 1 voucher.',
        'Voucher hết hạn hoặc đã đạt giới hạn sử dụng sẽ không thể áp dụng.',
        'Chương trình khuyến mãi có thể thay đổi mà không cần báo trước.',
      ],
    },
    {
      id: 'tai-khoan', title: 'Quy định về tài khoản',
      items: [
        'Khách hàng chịu trách nhiệm bảo mật thông tin đăng nhập của mình.',
        'Tài khoản có từ 3 yêu cầu trả hàng trở lên trong 180 ngày sẽ được đánh dấu để xem xét thủ công.',
        'GreenDrop có quyền tạm khóa tài khoản vi phạm điều khoản sử dụng.',
      ],
    },
    {
      id: 'ho-tro', title: 'Hỗ trợ khách hàng',
      items: [
        'Đội ngũ hỗ trợ khách hàng hoạt động 24/7 qua email, hotline và trang Liên hệ.',
        'Yêu cầu trả hàng sẽ được Admin phản hồi trong vòng 48 giờ.',
        'Mọi khiếu nại sẽ được ghi nhận và xử lý trong thời gian sớm nhất.',
      ],
    },
  ];
  vm.active = vm.sections[0].id;
  vm.setActive = function (id) { vm.active = id; };
});
