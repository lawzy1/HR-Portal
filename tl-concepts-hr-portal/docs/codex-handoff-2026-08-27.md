# Codex handoff — 2026-08-27

## Đọc trước khi tiếp tục

1. Đọc file này, sau đó [AGENTS.md](../AGENTS.md) và [codebase.md](../codebase.md).
2. Chạy `git status --short` trước khi sửa bất kỳ file nào: thay đổi của ngày 27/08 hiện chưa được commit.
3. Với Supabase, kiểm tra `supabase migration list --linked` hoặc MCP tương đương trước khi viết/apply migration. Không sửa migration đã apply.

## Trạng thái Supabase

- Project linked: `xtyjeduckvopbdeokhfn`.
- Local và remote đã đồng bộ toàn bộ 29 migration.
- Migration mới nhất đã chạy production: `20260827120000_admin_direct_time_entries.sql`.
- Migration chỉ thêm RLS INSERT cho Admin trong cùng công ty trên `leave_requests`, `ot_records`, `work_events`; không thay schema, không cần regenerate `src/lib/database.types.ts`.

## Thay đổi chưa commit

- `src/components/admin/AdminKpiOtView.tsx`
- `src/components/admin/AdminLeaveManagementView.tsx`
- `src/components/admin/ResourceCalendar.tsx` (mới)
- `src/hooks/useLeave.ts`
- `supabase/migrations/20260827120000_admin_direct_time_entries.sql`
- `AGENTS.md`, `codebase.md`, file handoff này

## Chức năng mới

### Admin tạo OT trực tiếp

- Page: **KPI, OT & Thưởng** → khối **Quản lý Tăng ca làm thêm giờ (OT)**.
- Nút **Tạo OT cho nhân viên** chỉ hiển thị với Admin.
- Form lưu vào `ot_records`; có preview số tiền OT theo lương, ngày công chuẩn và phần trăm OT.
- HR không thấy nút và không có RLS INSERT; User chỉ gửi request OT của bản thân với trạng thái `Chờ duyệt`.

### Admin quản lý hoạt động nghỉ/WFH/đi trễ

- Page: **Quản lý Ngày phép**.
- Khối **Ghi nhận trực tiếp** tạo nghỉ phép, WFH hoặc đi trễ cho nhân viên, luôn ở trạng thái `Đã duyệt` và lưu Admin tạo vào `approver_id`.
- Bảng quỹ phép có input **Hạn dùng quỹ phép** để sửa `leave_balances.expiry_date`.
- `ResourceCalendar` hiển thị nghỉ phép, WFH, đi trễ theo tháng; filter một nhân viên hoặc toàn công ty; click ô ngày để xem chi tiết.

## Verify đã thực hiện

- `npm run build` PASS sau thay đổi nút Admin tạo OT.
- `supabase db push --linked` đã apply migration `20260827120000` thành công.
- `supabase migration list --linked` sau đó xác nhận mọi migration local đều có remote tương ứng.

## Việc cần làm tiếp

1. UAT với Admin: tạo OT, nghỉ phép, WFH, đi trễ; xác nhận record và calendar cập nhật.
2. UAT role HR/employee: xác nhận UI/RLS không cho ghi trực tiếp.
3. Chạy `npm run lint` trước khi commit; build đã pass, nhưng chưa chạy lint sau bộ thay đổi docs/UI cuối.
4. Cập nhật `docs/phase10-business-acceptance.md` và `docs/demo-brd.md` chỉ khi đã thực hiện UAT và muốn chính thức hóa test case cho luồng Admin trực tiếp + calendar.

## Backlog chưa xử lý

- Truy vết nguồn tổng thưởng KPI/QC bất thường: Lý Anh Quân tháng 7/2026 (2.000.000) và Hồ Thị Vy tháng 9/2026 (3.200.000). Cần đối chiếu `kpi_monthly`, `kpi_adjustments`, `payroll_records` và UI Commission KPI & QC trước khi kết luận.
- Rà soát những chỗ hiển thị tiền và state `MoneyVisibility` theo yêu cầu UX toggle đồng bộ/persistent trước đó.
- Các gap cũ về `pending_days`, export KPI category và Employee KPI UAT vẫn xem trong `codebase.md`.
