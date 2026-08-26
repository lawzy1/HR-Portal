# TL Concepts HR Portal — Demo BRD / Kịch bản high-level

**Mục tiêu:** trình diễn nhanh các module đã có, kiểm tra đúng quyền và xác nhận luồng nghiệp vụ chính trước UAT.

## 1. Vai trò và nguyên tắc

| Vai trò | Được làm | Không được làm |
|---|---|---|
| User | Xem dữ liệu đã phát hành của chính mình; tạo yêu cầu nghỉ phép, OT, work-event | Xem dữ liệu người khác; tự duyệt; xem payroll nháp/chờ duyệt |
| HR/Kế toán | Xem/sửa dữ liệu HR, hợp đồng, KPI, payroll; import và gửi duyệt | Quản lý account/role; reset mật khẩu người khác; duyệt request; final approve/publish |
| Admin | Quản lý account/role; duyệt request; final approve/publish; cấu hình công ty | — |

Mọi quyền quan trọng đều được kiểm tra ở Supabase RLS/RPC/Edge Function, không chỉ ẩn nút trên giao diện.

## 2. Chuẩn bị demo

- 01 Admin, 01 HR/Kế toán, 02 User gắn với 02 nhân viên khác nhau.
- Một mailbox test nhận được email Supabase Auth.
- Một file payroll test theo mẫu `BẢNG_LƯƠNG.xlsx`, có ít nhất hai nhân viên.
- Một hợp đồng/phụ lục và một file hồ sơ test; không dùng dữ liệu thật nếu chưa sao lưu.
- Frontend đã deploy; Supabase Auth URL Configuration có `/auth/activate` và `/auth/reset-password` của domain đang dùng.

## 3. Kịch bản demo theo thứ tự

### Bước 1 — Đăng nhập và phân quyền

1. Đăng nhập lần lượt bằng Admin, HR và User.
2. Kiểm tra menu hiển thị: Admin có `Báo cáo & Audit`, `Cài đặt Phân quyền`; HR không có; User chỉ có menu self-service.
3. User thử mở dữ liệu của User khác; HR thử mở quản lý account/final approval.

**Kết quả mong đợi:** User chỉ thấy dữ liệu của mình; HR vận hành nghiệp vụ nhưng không có quyền quản trị account hoặc phê duyệt cuối; Admin có đầy đủ quyền.

### Bước 2 — Hồ sơ tài khoản, mời và onboarding

1. Admin mở `Hồ sơ tài khoản`, xem email/role/trạng thái và đổi mật khẩu của chính mình.
2. Admin vào `Hồ sơ Nhân viên` → tạo nhân viên → gửi lời mời.
3. User mở email → đặt mật khẩu → điền onboarding → gửi hồ sơ.
4. Admin mở thông báo/hồ sơ chờ duyệt → kiểm tra → `Duyệt hồ sơ` hoặc `Yêu cầu bổ sung`.

**Kết quả mong đợi:** chỉ Admin tạo lời mời và duyệt onboarding; User không truy cập Portal đầy đủ trước khi hồ sơ được duyệt.

### Bước 3 — Hồ sơ nhân viên và tài liệu

1. Admin/HR mở `Hồ sơ Nhân viên`, cập nhật thông tin chung, CCCD, ngân hàng, người thân, ảnh.
2. Tạo HĐLĐ; nếu cần, tạo phụ lục và liên kết HĐLĐ gốc.
3. Upload file, gửi duyệt; Admin duyệt hoặc trả lại.

**Kết quả mong đợi:** phụ lục được quản lý cùng hợp đồng gốc; file đã gửi duyệt/phát hành không bị ghi đè hoặc xóa trái phép; thay đổi có audit trail.

### Bước 4 — Ngày phép, ngày lễ và ngày công

1. Admin vào `Quản lý Ngày phép`, kiểm tra mặc định công ty 12 ngày và lưu một giá trị mới.
2. Đặt entitlement riêng cho một nhân viên để kiểm tra override.
3. Thêm một kỳ nghỉ lễ dạng từ ngày–đến ngày (ví dụ 02–03/09); kiểm tra hệ thống tách thành từng ngày.
4. Dùng `+ ngày`/`− ngày` cho một nhân viên và kiểm tra bảng quỹ phép.

**Kết quả mong đợi:** ngày lễ được trừ khỏi ngày công chuẩn; phép đã duyệt được trừ khỏi ngày công KPI cá nhân; ngày chờ duyệt chưa ảnh hưởng KPI. Lưu ý đối soát: `Hạn mức năm` là entitlement cả năm còn `Tổng quỹ` hiện là số đã tích lũy đến thời điểm xem.

### Bước 5 — User tạo request, Admin duyệt

1. User tạo một đơn nghỉ phép, một request OT và một work-event (WFH/đi trễ).
2. Đăng nhập HR: chỉ xem danh sách, không tạo/sửa/duyệt request.
3. Đăng nhập Admin: duyệt một request, từ chối một request và nhập lý do.

**Kết quả mong đợi:** request mới luôn `Chờ duyệt`; chỉ Admin thay đổi trạng thái. Đơn nghỉ được duyệt mới tác động đến quỹ phép/ngày công KPI.

### Bước 6 — KPI, OT và thưởng

1. Chọn kỳ đánh giá; mặc định là tháng/năm hiện tại, có lịch các năm tiếp theo.
2. Kiểm tra ngày công tháng sau khi trừ lễ và phép đã duyệt.
3. Nhập bài/dự án, chọn `New Render` hoặc `Re Process`, nhập OT nếu có.
4. Kiểm tra chỉ tiêu tháng = chỉ tiêu/ngày của từng nhân viên × ngày công KPI cá nhân.
5. Với Team Leader, nhập QC views để kiểm tra QC commission tùy chọn; nhân viên rate 0 không bị bắt buộc.
6. HR gửi KPI chờ duyệt; Admin duyệt/phát hành.

**Kết quả mong đợi:** KPI theo đúng nhân viên và kỳ; dữ liệu bị khóa sau publish hiện vẫn là backlog cần xử lý trước khi KPI trở thành nguồn payroll tự động.

### Bước 7 — Import payroll và duyệt phát hành

1. HR vào `Quản lý Payroll` → import workbook `BẢNG_LƯƠNG.xlsx`.
2. Kiểm tra preview: kỳ lấy từ tiêu đề bảng lương, MSNV, ngày công, BHXH/BHYT/BHTN, các khoản thu nhập/khấu trừ/hoàn trả.
3. Lưu thành `draft` → HR gửi `pending_approval`.
4. Admin kiểm tra và `Duyệt & phát hành`; nếu sai, `Trả lại` để HR sửa và gửi lại.

**Kết quả mong đợi:** User không thấy draft/pending. Net cuối cùng luôn theo công thức:

```text
Thực lãnh = Tổng thu nhập − Tổng khấu trừ + Điều chỉnh & hoàn trả
```

Case chuẩn: `18.800.000 − 799.250 + 203.452 = 18.204.202`.

### Bước 8 — Phiếu lương PDF và email

1. Sau khi publish, mở phiếu lương của User và nhập lại mật khẩu để xem.
2. Tải PDF chính thức/in; kiểm tra thông tin công ty, nhân viên, ngày công, phép, thu nhập, khấu trừ, điều chỉnh và Net.
3. Kiểm tra trạng thái outbox/PDF. Nếu chưa cấu hình Resend/provider, trạng thái email `skipped` là hợp lệ nhưng PDF vẫn phải tạo được.

**Kết quả mong đợi:** Portal và PDF dùng cùng số Net; retry không đổi checksum nội dung; subject email có tiền tố `[TL Concepts HR Portal]` khi provider được cấu hình.

### Bước 9 — Quên mật khẩu và audit

1. Tại Login chọn `Quên mật khẩu?`, nhập email test và mở link trong mailbox.
2. Đặt mật khẩu mới tại `/auth/reset-password`, đăng nhập lại.
3. Admin mở `Báo cáo & Audit`, xem các thao tác mời, duyệt, payroll và phát hành.

**Kết quả mong đợi:** form quên mật khẩu không tiết lộ email có tồn tại; link hết hạn/đã dùng hoặc không có recovery session không đổi được mật khẩu; audit lưu actor, thời gian và đối tượng.

## 4. Tiêu chí kết thúc demo/UAT

- Ba vai trò thực hiện đúng phạm vi; không có cách bypass qua API/RLS.
- Payroll import được file mẫu, lấy đúng kỳ và cho ra Net chuẩn F01.
- Chỉ Admin approve/publish; User chỉ thấy dữ liệu published của mình.
- Ngày lễ, phép đã duyệt và ngày công KPI khớp cùng một công thức.
- PDF khớp Portal; email reset hoạt động trên domain production.
- Các mục còn lại được ghi nhận là backlog, không đánh dấu “đã pass” nếu chưa chạy UAT thật.

## 5. Gap còn lại cần theo dõi

**P0 trước vận hành thật:** deploy frontend; cấu hình/kiểm tra Auth redirect và email provider; chạy UAT end-to-end với dữ liệu test; đối soát payroll import/PDF/F01; chặn import nếu không đọc được kỳ từ tiêu đề bảng lương (không fallback về tháng đang chọn).

**P1:** chốt lại nhãn và chính sách accrual quỹ phép (đặc biệt `pending_days`); khóa KPI sau submit/publish; security hardening Supabase Advisors; cấu trúc hóa phụ cấp/WFH trong phụ lục; sửa các câu hướng dẫn UI còn nói về self-registration hoặc “chưa trừ phép” không đúng trạng thái hiện tại.

**P2:** bổ sung category vào KPI export; tự tính target trong Import KPI; rating/ranking hiệu suất; dọn field KPI legacy, README và tối ưu bundle; nếu tiếp tục hỗ trợ CSV thì cần xử lý rõ dấu phân cách hàng nghìn bằng dấu phẩy.
