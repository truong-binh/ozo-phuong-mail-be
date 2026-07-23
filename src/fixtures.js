// Hai email mẫu do người dùng cung cấp — dùng để test trích xuất/hiển thị
// mà chưa cần cấu hình Google/Gmail. Gọi POST /api/sync/demo để nạp.

export const DEMO_EMAILS = [
  {
    id: 'demo-phuong-lien',
    subject: 'THƯ MỜI NHẬN VIỆC_NV Kế toán bán hàng_Phương Liên',
    from: 'HCNS X-Trading <hcns@x-trading.example>',
    date: 'Wed, 08 Jul 2026 09:00:00 +0700',
    body: `Thân gửi bạn Trịnh Thị Phương Liên,
Phòng Hành chính - Nhân sự Công ty Cổ phần X - Trading cảm ơn bạn đã tham gia phỏng vấn cho vị trí Nhân viên kế toán bán hàng của chúng tôi thời gian vừa qua. Thông qua buổi phỏng vấn, chúng tôi đánh giá cao năng lực cũng như kinh nghiệm làm việc của bạn. Theo kết luận của Hội đồng Tuyển dụng, chúng tôi xin thông báo và chúc mừng bạn đã trúng tuyển vào vị trí Nhân viên kế toán bán hàng với các thông tin như sau:
- Vị trí công việc: Nhân viên kế toán bán hàng.
- Quản lý trực tiếp: Trưởng phòng Tài chính Kế toán.
- Nơi làm việc: Văn phòng tầng 3, Tòa Minori Building, Số 67A Trương Định, Tương Mai, Hà Nội và theo sự điều động của cấp trên.
- Ngày nhận việc: Thứ Hai, ngày 20/07/2026.
- Thời gian thử việc: 02 tháng kể từ ngày nhận việc.

Thông tin các khoản thu nhập:
- Thu nhập chính thức:
- Trong thời gian thử việc: hưởng 85% thu nhập.
- Hỗ trợ gửi xe miễn phí tại nơi làm việc.
- Trang thiết bị làm việc: công ty trang bị.
- Tham gia BHXH, BHYT ngay sau khi kết thúc thời gian thử việc.
- Thuế TNCN: Theo quy định của Pháp luật.

Những giấy tờ bạn cần nộp trong vòng 07 ngày kể từ ngày đến nhận việc như sau:
+ Điền thông tin trước ngày nhận việc theo link: Feelex -_Thông tin Nhân viên mới
+ Sơ yếu lý lịch có xác nhận của chính quyền địa phương: bản gốc công chứng trong vòng 06 tháng gần nhất.
+ Giấy khai sinh: bản photo công chứng trong vòng 06 tháng gần nhất.
+ CMT (nếu có) hoặc CCCD: bản photo công chứng trong vòng 06 tháng gần nhất.
+ Sổ hộ khẩu/ hoặc xác nhận thông tin về cư trú theo mẫu CT07: bản photo công chứng trong vòng 06 tháng gần nhất.
+ Phiếu khám sức khỏe trong thời hạn 6 tháng: bản gốc.
+ Các bằng cấp chứng chỉ chuyên môn: bản photo công chứng.

- Thông tin liên hệ: Mrs. Hương - Phòng HCNS
- Điện thoại: 0934 552 502

Bạn vui lòng xác nhận và gửi lại thông tin phản hồi qua email muộn nhất trước 17h00 ngày 10/07/2026.

Trân trọng!`,
  },
  {
    id: 'demo-ai-binh',
    subject: 'Thư mời nhận việc_TTS Trợ lý vận hành AI_Ái Bình',
    from: 'HCNS OZOVN <hcns@ozovn.com>',
    date: 'Fri, 26 Jun 2026 10:00:00 +0700',
    body: `Thân gửi bạn Trương Ái Bình,

Phòng Hành chính - Nhân sự Công ty TNHH Thương Mại Và Dịch Vụ OZOVN cảm ơn bạn đã tham gia phỏng vấn cho vị trí Thực tập sinh Trợ lý vận hành AI của chúng tôi thời gian vừa qua. Thông qua buổi phỏng vấn, chúng tôi đánh giá năng lực của bạn phù hợp với định hướng của Công ty chúng tôi. Theo kết luận của Hội đồng Tuyển dụng, chúng tôi xin thông báo và chúc mừng bạn đã trúng tuyển vào vị trí Thực tập sinh Trợ lý vận hành AI với các thông tin như sau:

- Vị trí công việc: Thực tập sinh Trợ lý vận hành AI.
- Quản lý trực tiếp: Ban Giám đốc.
- Nơi làm việc: Văn phòng tầng 3, Tòa Minori Building, Số 67A Trương Định, Hai Bà Trưng, Hà Nội và theo sự điều động của cấp trên.
- Ngày nhận việc: 01/07/2026.
- Thời gian thử thách: 01 tháng.

Thông tin các khoản thu nhập/hỗ trợ:
- Mức thu nhập/ hỗ trợ: 6.000.000 /tháng (gross).
- Hỗ trợ gửi xe miễn phí tại nơi làm việc.
- Trang thiết bị làm việc: cá nhân tự trang bị Laptop.
- Thuế TNCN: Theo quy định của Pháp luật.

Những giấy tờ bạn cần nộp trong vòng 07 ngày kể từ ngày đến nhận việc như sau:
+ Điền thông tin trước ngày nhận việc theo link: OZOVN_Thông tin Nhân viên mới
+ Sơ yếu lý lịch có xác nhận của chính quyền địa phương: bản gốc công chứng trong vòng 06 tháng gần nhất
+ Giấy khai sinh: bản photo công chứng trong vòng 06 tháng gần nhất
+ CMT (nếu có) hoặc CCCD: bản photo công chứng trong vòng 06 tháng gần nhất
+ Sổ hộ khẩu/ hoặc xác nhận thông tin về cư trú theo mẫu CT07: bản photo công chứng trong vòng 06 tháng gần nhất
+ Phiếu khám sức khỏe trong thời hạn 6 tháng: bản gốc có dấu đổ trong vòng 06 tháng gần nhất
+ Các bằng cấp chứng chỉ chuyên môn: bản photo công chứng

- Thông tin liên hệ: Mrs. Hương - Phòng HCNS
- Điện thoại: 0934 552 502

Bạn vui lòng xác nhận và gửi lại thông tin phản hồi qua email muộn nhất trước 12h00 ngày 30/06/2026.

Trân trọng!`,
  },
  {
    id: 'demo-pham-van',
    subject: 'Thư mời nhận việc_CV Kế toán thuế_Phạm Thị Vân',
    from: 'HCNS OZOVN <hcns@ozovn.com>',
    date: 'Mon, 23 Mar 2026 09:00:00 +0700',
    body: `Kính gửi Chị Phạm Thị Vân,
Phòng Hành chính - Nhân sự Công ty TNHH Thương Mại Và Dịch Vụ OZOVN cảm ơn Chị đã tham gia phỏng vấn cho vị trí Chuyên viên Kế toán thuế của chúng tôi thời gian vừa qua. Thông qua buổi phỏng vấn, chúng tôi đánh giá cao năng lực cũng như kinh nghiệm làm việc của Chị. Theo kết luận của Hội đồng Tuyển dụng, chúng tôi xin thông báo và chúc mừng Chị đã trúng tuyển vào vị trí Chuyên viên Kế toán thuế với các thông tin như sau:
- Vị trí công việc: Chuyên viên Kế toán thuế
- Quản lý trực tiếp: Kế toán trưởng
- Nơi làm việc: Văn phòng tầng 3, Tòa Minori Building, Số 67A Trương Định, Hai Bà Trưng, Hà Nội và theo sự điều động của cấp trên.
- Ngày nhận việc: 30/03/2026
- Thời gian thử việc: 2 tháng kể từ ngày nhận việc.

Thông tin các khoản thu nhập:
- Thu nhập chính thức: 16,000,000 / tháng (Mức thu nhập) (gross);
- Trong thời gian thử việc hưởng 85% thu nhập chính thức;
- Khi ký HĐLĐ chính thức áp dụng KPI theo Quy định của Công ty;
- Hỗ trợ gửi xe miễn phí tại nơi làm việc;
- Tham gia BHXH, BHYT sau khi kết thúc thời gian thử việc;
- Thuế TNCN: Theo quy định của Pháp luật.

Những giấy tờ Chị cần nộp trong vòng 07 ngày kể từ ngày đến nhận việc như sau:
+ Điền thông tin trước ngày nhận việc theo link: OZOVN_Thông tin Nhân viên mới
+ Sơ yếu lý lịch có xác nhận của chính quyền địa phương: bản gốc
+ Giấy khai sinh: bản photo
+ CMT (nếu có) hoặc CCCD: bản photo
+ Sổ hộ khẩu/ hoặc xác nhận thông tin về cư trú theo mẫu CT07: bản photo
+ Phiếu khám sức khỏe trong thời hạn 6 tháng: bản gốc
+ Các bằng cấp chứng chỉ chuyên môn: bản photo
(Các giấy tờ nêu trên được công chứng trong vòng 06 tháng gần nhất)

- Thông tin liên hệ: Ms. Ánh - Phòng HCNS
- Điện thoại: 0848481094

Chị vui lòng xác nhận và gửi lại thông tin phản hồi qua email muộn nhất trước 19h ngày 25/03/2026.
Trân trọng!`,
  },
];
