# Phase 10 — Payroll formula gaps và kịch bản UAT

## 1. Phạm vi payroll đã chốt

Portal không thay thế bảng tính lương của Kế toán. Luồng chính là:

1. HR/Kế toán chuẩn bị và kiểm tra file Excel.
2. Import file vào Portal thành các phiếu nháp.
3. HR/Kế toán gửi kỳ lương cho Admin duyệt.
4. Admin duyệt và Portal phát hành, tạo PDF cho từng nhân viên.

Portal giữ nguyên các khoản chi tiết từ Excel. Riêng `net_salary` là kết quả F01 được database tính lại để mọi kênh (Portal, PDF và API) dùng cùng một số thực lãnh cuối cùng.

## 2. Quy tắc công thức đã được TL Concepts xác nhận

### F01 — Định nghĩa số thực lĩnh cuối cùng

- `BẢNG LƯƠNG T7!P3` (Lương thực nhận): `18.000.750`.
- Tổng hoàn trả `Q3:S3`: `203.452`.
- `Phiếu lương mẫu!B43` tính: `18.800.000 - 799.250 + 203.452 = 18.204.202`.
- Portal hiện import cột P làm `net_salary`, nên hiển thị `18.000.750` trong khi phiếu mẫu hiển thị `18.204.202`.

```text
total_deductions = BHXH + BHYT + BHTN + PIT + advance + other deductions
total_adjustments = welfare refund + business-trip refund + PIT refund + prior adjustment
final_net = gross_income - total_deductions + total_adjustments
```

Đã áp dụng bằng generated columns và trigger database. Ví dụ chuẩn:
`18.800.000 - 799.250 + 203.452 = 18.204.202`. Không làm tròn số lẻ VND.

### F02 — Công thức cột P không đồng nhất giữa nhân viên

- `P3`, `P4`, `P8`: có trừ BHXH cột L.
- `P5`: `=SUM(G5:K5)-O5`, không trừ BHXH cột L nên cao hơn `735.000`.
- Một số dòng khác là số nhập tay, không phải công thức.

Portal không dùng cột P làm số cuối cùng nữa, nên sai khác công thức cột P không làm sai phiếu lương. Kế toán vẫn nên thống nhất cột này để đối soát nội bộ.

### F03 — Phiếu lương mẫu cộng trùng cột Thưởng lễ + OT

Trong phiếu mẫu:

- `B21` (OT/thưởng dự án) liên kết `K3`.
- `B22` (Thưởng lễ) cũng liên kết `K3`.
- `B23 = SUM(B17:B22)`.

Đã chốt: dùng một cột tổng hợp `OT/thưởng dự án`; `Thưởng lễ` giữ là một khoản riêng theo Excel. Portal/PDF không cộng trùng.

### F04 — Thu nhập chịu thuế đang loại trừ phụ cấp

Excel tính:

```text
taxable_income = workday_salary + KPI + holiday_OT - insurance - family_deduction
```

Thu nhập chịu thuế được database tính theo công thức đã chốt: `lương ngày công + KPI + OT/thưởng dự án + thưởng lễ − 10,5% lương cơ bản − giảm trừ gia cảnh`. Giảm trừ gia cảnh được cấu hình theo mức hiện hành: bản thân `15.500.000/tháng`, người phụ thuộc `6.200.000/tháng/người`. MVP vẫn chỉ lấy số PIT do Kế toán cung cấp, chưa tự tính thuế trên Portal.

### F05 — Biểu thuế TNCN trong Excel là quy tắc tùy chỉnh

Excel đang dùng 5 bậc với các ngưỡng `10m / 30m / 60m / 100m`. Portal hiện chỉ import kết quả cột Thuế TNCN và không tự tính lại.

Đã chốt MVP: giữ số PIT do Kế toán cung cấp, Portal không tự áp biểu thuế.

### F06 — Ngày công và ngày phép chưa có đủ nguồn

- Bảng lương chỉ có một cột `Ngày công/tháng`.
- Phiếu mẫu lại có `Ngày công chuẩn` và `Ngày công thực tế` riêng.
- `Phép còn lại` trong phiếu mẫu đang nhập tay, không liên kết bảng lương.

Đã áp dụng cho import: khi chỉ có `Ngày công/tháng`, Portal dùng cùng giá trị cho cả chuẩn và thực tế. Lịch hiển thị dùng phép tính động theo đúng số ngày của từng tháng/năm, gồm năm nhuận.

### F07 — Tháng trên phiếu mẫu không cùng kỳ dữ liệu

Phiếu mẫu ghi Tháng 8/2026 nhưng các ô tiền lại liên kết tab Bảng lương Tháng 7/2026. Portal lấy kỳ lương từ tiêu đề tab bảng lương và không dùng tháng hard-code của phiếu mẫu.

### F08 — Làm tròn

Đã chốt: giữ nguyên số lẻ từ Excel. Database dùng kiểu `numeric` và công thức F01 không làm tròn.

## 3. Kịch bản UAT ba vai trò

### Dữ liệu chuẩn bị

- Một tài khoản Admin.
- Một tài khoản HR/Kế toán.
- Hai User gắn với hai nhân viên khác nhau: User A và User B.
- Một file payroll test có ít nhất hai nhân viên.
- Một hợp đồng nháp có file đính kèm.
- Một Team Leader có `QC commission rate > 0` và một nhân viên thường có rate bằng 0.

Không dùng tài khoản hoặc payroll thật nếu chưa sao lưu dữ liệu test.

### U01 — User chỉ xem dữ liệu của mình

1. Đăng nhập User A.
2. Mở hồ sơ, hợp đồng, KPI và phiếu lương.
3. Thử truy cập ID phiếu/hợp đồng của User B nếu có thể chỉnh URL hoặc request.

Expected:

- Chỉ thấy dữ liệu User A.
- Không thấy menu quản trị.
- Request dữ liệu User B trả rỗng/403, không lộ thông tin.
- Mở phiếu lương yêu cầu nhập lại mật khẩu.

### U02 — User không thấy bản nháp/chờ duyệt

1. HR import payroll nhưng chưa gửi duyệt.
2. User đăng nhập kiểm tra.
3. HR gửi chờ duyệt, User kiểm tra lại.

Expected: User không thấy phiếu ở cả trạng thái `draft` và `pending_approval`.

### U03 — Quyền HR/Kế toán

1. Đăng nhập HR/Kế toán.
2. Xem và chỉnh sửa hồ sơ nhân viên.
3. Import payroll, KPI, OT, hợp đồng/phụ lục.
4. Gửi payroll/KPI/hợp đồng cho Admin duyệt.
5. Thử đổi role, khóa tài khoản, reset mật khẩu hoặc bấm final approval.

Expected:

- Bước 2–4 thành công.
- Không có màn hình quản lý tài khoản/phân quyền.
- Không thể final approve bằng UI hoặc gọi trực tiếp RPC.
- Sau khi gửi duyệt, HR không sửa/ghi đè kỳ payroll hoặc file hợp đồng đang chờ duyệt.

### U04 — Import đúng file Excel TL Concepts

1. HR chọn `BẢNG_LƯƠNG.xlsx`.
2. Chọn tab `BẢNG LƯƠNG T7` tự động.
3. Kiểm tra preview trước khi lưu.

Expected:

- Nhận đúng kỳ 07/2026 và đúng MSNV dù mã có khoảng trắng quanh dấu `-`.
- `Ngày công/tháng = 24` tạo `24 / 24 ngày`.
- `BHXH 10.5% = 735.000` hiển thị thành một dòng `BHXH / BHYT / BHTN`.
- Các khoản chi tiết giữ nguyên giá trị Excel; Net preview và database tính theo F01.
- Dữ liệu mẫu cho ra `18.204.202` từ `18.800.000 - 799.250 + 203.452`.
- Không cho lưu nếu trùng MSNV hoặc không tìm thấy nhân viên.

### U05 — Admin duyệt và tự tạo PDF

1. Đăng nhập Admin.
2. Mở kỳ payroll đang chờ duyệt.
3. Bấm `Duyệt & phát hành`.
4. User A đăng nhập, xác thực lại mật khẩu và tải PDF.

Expected:

- Trạng thái chuyển `published` và lưu người/thời điểm duyệt.
- User chỉ thấy phiếu của mình.
- PDF được tạo ngay cả khi email chưa cấu hình.
- PDF có công ty, địa chỉ, MST, họ tên, mã NV, phòng ban, chức vụ, ngày công, phép, người phụ thuộc, tài khoản nhận lương, các khoản thu nhập/khấu trừ/hoàn trả và Net.
- PDF tải lại sau retry có cùng SHA-256, không bị tạo phiên bản nội dung khác.

### U06 — Admin trả lại

1. Admin chọn `Trả lại`, nhập lý do ít nhất ba ký tự.
2. HR mở lại kỳ payroll.

Expected:

- Kỳ lương chuyển `rejected`.
- HR thấy lý do, sửa/import lại và gửi duyệt lần nữa.
- User vẫn không thấy phiếu.

### U07 — Cấu hình phép năm

1. Admin mở Cài đặt, kiểm tra mặc định là 12.
2. Đổi thành 14.
3. Kiểm tra quỹ phép nhân viên chưa tùy chỉnh.
4. Đặt riêng một nhân viên thành 15, sau đó đổi mặc định công ty sang 13.5.

Expected:

- Quỹ chưa tùy chỉnh đi theo 14 rồi 13.5.
- Nhân viên được đặt riêng 15 vẫn giữ 15.
- HR/User không sửa được cấu hình công ty.

### U08 — QC commission tùy chọn

1. Tạo bản nháp KPI tháng.
2. Với Team Leader có rate 120.000/view, nhập 10 QC views.
3. Với nhân viên rate 0, kiểm tra trường QC.

Expected:

- Team Leader có QC commission `1.200.000`.
- Tổng thưởng cập nhật bằng commission hiệu suất + QC commission + bù đảm bảo.
- Nhân viên rate 0 hiển thị `Không áp dụng` và không bắt buộc nhập.

### U09 — Tài liệu đã gửi duyệt/phát hành không bị thay thế

1. Upload hợp đồng nháp và gửi Admin duyệt.
2. Dùng session HR thử upload đè hoặc xóa đúng storage path của file.
3. Admin duyệt và thử lại.

Expected: Storage từ chối update/delete ở cả `pending_approval` và `published`; file nháp chưa gửi duyệt vẫn có thể thay thế bằng một version/path mới.

### U10 — Quản trị tài khoản chỉ dành cho Admin

1. Admin đổi một tài khoản test giữa Employee và HR/Kế toán.
2. Đăng xuất/đăng nhập lại tài khoản đó.
3. HR thử thực hiện cùng thao tác.

Expected:

- Quyền mới có hiệu lực sau phiên đăng nhập/token được làm mới.
- HR không xem hoặc gọi được chức năng đổi role/khóa tài khoản.

## 4. Technical debt đã hoãn

- Chưa khóa `kpi_job_items` và `kpi_adjustments` sau khi tổng KPI tháng được gửi duyệt/phát hành. Cần xử lý trước khi KPI trở thành nguồn tính lương tự động hoặc khi số người nhập KPI tăng lên.
- Chưa cấu trúc hóa quy tắc prorate phụ cấp/WFH trong phụ lục HĐLĐ.
- Chưa thực hiện đợt Supabase security hardening riêng theo Advisors.
