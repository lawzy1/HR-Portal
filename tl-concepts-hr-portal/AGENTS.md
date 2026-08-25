# AGENTS.md — TL Concepts HR Portal

Hướng dẫn cho AI agent (Claude Code hoặc tương tự) khi làm việc trên repo này. Đọc file này trước khi code. Xem [codebase.md](codebase.md) để biết trạng thái hiện tại / thay đổi gần nhất.

## 1. Dự án này là gì

HR Portal nội bộ cho **TL Concepts** — studio render nội thất/kiến trúc 3D (khách hàng chủ yếu ở châu Âu, xem tên dự án mẫu trong `kpi_job_items`). Đơn vị đo hiệu suất nhân viên là **view** (1 ảnh render hoàn thành = N views), quy đổi ra điểm KPI.

Stack: React 19 + TypeScript + Vite, Tailwind CSS, TanStack Query, React Router, Supabase (Postgres + Auth + Storage + RLS), react-hook-form + zod.

Không có backend riêng — mọi logic nghiệp vụ nằm ở (a) Postgres (RLS, trigger, function) hoặc (b) trực tiếp trong component/hook phía client gọi thẳng Supabase qua `src/lib/supabaseClient.ts`. Không có Express/Nest server.

## 2. Lệnh hay dùng

Chạy trong `tl-concepts-hr-portal/` (đây chính là project root, không phải root của git repo `HR-Portal`):

```bash
npm run dev         # vite --port=3000 --host=0.0.0.0
npm run build        # build production, cũng là cách nhanh nhất để bắt lỗi TS/import
npm run typecheck    # tsc --noEmit
npm run lint          # eslint . && typecheck — chạy cái này trước khi báo "xong"
```

Không có test suite (không có `npm test`). Verify = typecheck + build + click thật trong Browser pane + đối chiếu DB qua `mcp__supabase__execute_sql`.

### Supabase / migration workflow

1. Viết SQL, gọi `mcp__supabase__apply_migration` với `name` snake_case mô tả đúng nội dung (KHÔNG đặt tên chung chung như `update` hay `fix`).
2. **Lưu lại file migration xuống `supabase/migrations/` bằng đúng version mà tool trả về** (gọi `list_migrations` sau khi apply để lấy version chính xác, đừng tự đoán timestamp) — nếu không, DB và git sẽ lệch nhau.
3. Regenerate `src/lib/database.types.ts` bằng `mcp__supabase__generate_typescript_types` (hoặc copy tay như đã làm — xem lịch sử trong `codebase.md`).
4. Chạy `mcp__supabase__get_advisors({type:"security"})` sau mỗi migration để bắt RLS/permission thiếu.
5. **Trước khi viết file migration mới: kiểm tra `supabase/migrations/` xem có file untracked (`git status`) trùng chủ đề chưa** — có thể là bản nháp từ session trước chưa apply. Đọc nó trước khi ghi đè, đừng `Write` thẳng lên mà không `Read` trước (xem mục Lessons Learned #1).

## 3. Kiến trúc / cách đọc code

- **Không dùng React Router path-based cho nội dung chính** — `App.tsx` render 1 `MainContent` duy nhất, chuyển view bằng state (`activeTab` / `adminTab`) trong `HRContext`. Router chỉ dùng cho `/login` vs app.
- **2 role duy nhất**: `admin` và `employee` (enum `user_role` trong DB). `AuthContext` đọc `profiles.role` sau khi login → quyết định render `AdminSidebar`/admin views hay `Sidebar`/employee views. Component admin nằm trong `src/components/admin/`, component employee (self-service) nằm thẳng trong `src/components/`.
- **Multi-tenant qua `company_id`** — mọi bảng nghiệp vụ có cột `company_id`. RLS tự lọc theo `current_company_id()` (Postgres function), **không cần** filter `company_id` ở client. Khi viết query mới, đừng thêm `.eq('company_id', ...)` thủ công trừ khi đang INSERT (bắt buộc phải set khi insert).
- **Hooks theo pattern TanStack Query**: mỗi bảng có file `src/hooks/use<Table>.ts` xuất `Db<Table>` type (= `Tables<'table_name'>` từ `database.types.ts`), `use<Table>()` (query), `useCreate<Table>()`/`useUpdate<Table>()` (mutation, tự `invalidateQueries`). Theo đúng pattern này khi thêm bảng mới, đừng tạo cách gọi Supabase khác.
- **Modal toàn cục**: các modal lớn (`EditProfileModal`, `NewLeaveModal`, `ImportKpiModal`, `PayslipDetailModal`, `NewEmployeeModal`) được mount 1 lần trong `App.tsx` và tự ẩn/hiện qua state cờ (`isEditProfileModalOpen`, ...) + `selectedEmployeeIdForAdmin` trong `HRContext`. **`EditProfileModal` return `null` nếu `selectedEmployeeIdForAdmin` chưa được set** — nút "Chỉnh sửa hồ sơ" ở list chỉ mở được modal nếu nhân viên đã được chọn/click trước đó trong danh sách bên trái.
- **File cũ `src/types.ts` + `src/data/initialData.ts` là tàn dư từ bản mock-data ban đầu** (trước khi nối Supabase). Một số component cũ (`Sidebar.tsx`, `NewEmployeeModal.tsx`, `NewLeaveModal.tsx`, `AdminSidebar.tsx`) vẫn import từ đó cho type phụ trợ — không phải nguồn sự thật, đừng thêm field nghiệp vụ mới vào `types.ts`, luôn dùng `Tables<'...'>` từ `database.types.ts`.

## 4. Business logic cốt lõi (đọc kỹ trước khi đụng vào KPI/Payroll/Leave)

### KPI
- Mỗi nhân viên có **level** (`employees.kpi_level`, text tự do) và **chỉ tiêu/ngày** (`employees.kpi_target_per_day`, số view/ngày) — set trong hồ sơ nhân viên (Admin only), KHÔNG có bảng level cố định (xem Lessons #2).
- **Ngày công chuẩn của tháng** = (số ngày T2–T6 trong tháng × 1.0) + (số ngày T7 × 0.5) − (ngày lễ/Tết rơi vào T2–T7, quy đổi 1.0/0.5 tương ứng). Hàm gốc: `getMonthWorkDays(month, year, holidayDates)` trong `src/utils/workDays.ts` — hoạt động đúng cho bất kỳ tháng/năm nào (dùng `Date`, không hardcode lịch), holiday lấy từ `useCompanyHolidays()` (`company_holidays` table, quản lý ở màn Quản lý Ngày phép).
- **Chỉ tiêu KPI tháng của 1 nhân viên** = `kpi_target_per_day × standardWorkDays` (tính lại mỗi khi đổi tháng/thêm ngày lễ). KHÔNG còn định mức chung cho toàn công ty (`company_settings.kpi_rate_per_day` đã bỏ dùng — xem Lessons #4).
- `kpi_job_items` = từng "bài/dự án" (Order/Job) hoặc sub-task, gắn `employee_id`, `views_count`, `converted_kpi`, `category` (`new_render` | `reprocess` — phân biệt render dự án mới vs chỉnh sửa lại). `kpi_monthly` = bảng tổng hợp/kết quả cuối theo tháng cho từng nhân viên (kpi_target, kpi_converted_views, bonus_amount, ot_hours...) — nơi Payroll đọc để tính thưởng.
- Nút "Đồng bộ sang Bảng lương" ở `AdminKpiOtView` = upsert `kpi_monthly` cho toàn bộ nhân viên dựa trên `kpi_job_items` của tháng đang chọn + chỉ tiêu riêng từng người.

### Payroll
- `payroll_records`: 1 dòng/nhân viên/tháng, các field lương gộp/net/BHXH/BHYT/BHTN/thuế TNCN đã tính sẵn — được **nhập/paste hoặc import trực tiếp** (xem `AdminPayrollView.tsx`, có parser dán từ spreadsheet), KHÔNG tự động tính live từ `company_settings` rates trong frontend. `company_settings` (bhxh/bhyt/bhtn rate, PIT rate, family_deduction) hiện chủ yếu phục vụ tính **OT** và **KPI bonus** (`ot_hourly_rate = current_salary / standard_work_days / 8`, `kpi_bonus = max(kpi_bonus_min, converted_kpi × kpi_bonus_per_point)`).
- `publish_status`/`payment_status` trên `payroll_records` kiểm soát khi nào phiếu lương hiển thị cho nhân viên tự xem (publish trước khi employee thấy).

### Hợp đồng (Contracts)
- `contracts`: 1 nhân viên có thể có nhiều hợp đồng theo thời gian (`start_date`/`end_date`/`status`). **Phụ lục hợp đồng** = 1 row `contracts` khác với `type = 'Phụ lục hợp đồng'` và `parent_contract_id` trỏ về hợp đồng gốc — không phải bảng riêng.
- `contract_legal_warnings(employee_id)` (Postgres function, xem `phase3_contracts_salary.sql`) trả cảnh báo pháp lý xác định (Điều 20 BLLĐ 2019 — số lần ký HĐ xác định thời hạn) — cảnh báo cứng, không gọi AI/tra cứu sống.
- Khi hợp đồng `status = 'Đang hiệu lực'`, `ContractEditorModal` đồng thời ghi `employees.contract_type`/`current_salary` — hồ sơ nhân viên luôn phản ánh hợp đồng hiệu lực gần nhất.

### Leave (Ngày phép)
- `leave_balances` theo năm/nhân viên, có `annual_entitlement`, `used_days`, `manual_adjustment`, function `refresh_leave_accrual(employee_id, year)` để tính lại tích lũy.
- Ngày nghỉ trừ công thức tương tự KPI: T2–T6 = 1 ngày, T7 = 0.5, `company_holidays` không tính là ngày làm (nên leave request rơi vào ngày lễ không bị trừ phép).

### Auth / phân quyền
- `profiles.role` (`admin`/`employee`) + `profiles.employee_id` (null với admin thuần, hoặc trỏ employee nếu admin đồng thời là nhân viên) + `profiles.is_active`.
- RLS dùng 3 function: `current_company_id()`, `current_employee_id()`, `is_admin()` — luôn ưu tiên các function này thay vì check role ở client cho mọi thứ liên quan bảo mật (client chỉ dùng role để quyết định UI hiển thị gì, không phải nguồn bảo mật thật).
- **Có 1 luồng "tự đăng ký" (employee self-registration) đang xây dở, CHƯA hoàn thiện** — xem `codebase.md` mục "Việc dở dang".

## 5. Coding conventions đã thấy trong repo (follow theo)

- **Comment tối thiểu, chỉ giải thích lý do không hiển nhiên** (không comment mô tả code làm gì). Nhiều chỗ dùng prefix `// ponytail: <giới hạn cố ý> <khi nào nên nâng cấp>` khi cố tình đơn giản hoá — ví dụ `useLeave.ts:100`, migration `employee_self_registration.sql:8`. Theo đúng convention này khi cắt góc có chủ đích, đừng âm thầm không ghi chú.
- Tailwind utility classes trực tiếp trong JSX, không có file CSS riêng ngoài `index.css`. Màu chủ đạo: `primary-*` (cam/đỏ TL Concepts), `success-*` (xanh lá), `slate-*` (nền/text).
- Tiếng Việt cho MỌI text hiển thị cho user (label, toast, placeholder). Tiếng Anh cho code/biến/comment.
- Không có component test. "Test" = build sạch + tự thao tác qua Browser pane + query DB đối chiếu kết quả.

## 6. Lessons Learned (từ các session trước, đừng lặp lại)

1. **Đừng `Write` đè lên 1 file migration đã tồn tại mà chưa `Read` trước** — session 2026-08-25 phát hiện có sẵn 1 file migration untracked trùng tên (`phase7_kpi_target_level_and_contract_addendum.sql`) từ trước khi bắt đầu, và đã bị ghi đè bằng nội dung mới mà không kiểm tra nội dung cũ trước (file chưa từng `git add`/apply nên không cách nào khôi phục). Luôn `git status` + đọc file cũ trước khi đặt tên migration mới trùng chủ đề.
2. **Level nhân viên (`kpi_level`) cố tình để text tự do + `<datalist>` gợi ý**, không phải bảng `levels` riêng với giá trị `kpi_target_per_day` mặc định cố định — vì mock UI cho thấy 2 nhân viên cùng level 5 nhưng chỉ tiêu/ngày khác nhau (không phải suy ra cứng từ level). Đừng "sửa lại cho đúng chuẩn hoá" thành FK nếu không có yêu cầu rõ ràng.
3. **Browser pane: sau khi `scroll`, screenshot đôi khi trả về một mảng đen lớn dù trang render đúng** (đã confirm bằng `get_page_text` + kiểm tra không có phần tử nào có `background: black`/`position: fixed` phủ full màn hình — thuần là glitch capture của tool, không phải bug UI thật). Khi nghi ngờ, ưu tiên `get_page_text` hoặc `read_page` để xác minh nội dung thay vì chỉ tin ảnh chụp; resize viewport cao hơn (`resize_window`) để tránh phải scroll cũng là 1 cách né glitch này.
4. **`company_settings.kpi_rate_per_day` đã thành cột mồ côi** kể từ khi đổi sang chỉ tiêu KPI theo từng nhân viên (2026-08-25) — không còn UI/logic nào đọc field này. Đừng thêm tính năng mới dựa vào field này, cân nhắc xoá ở migration sau nếu chắc chắn không cần nữa.
5. **Nút "Chỉnh sửa hồ sơ" (`AdminEmployeeListView`) chỉ mở được modal nếu đã chọn nhân viên trong list bên trái trước** (`selectedEmployeeIdForAdmin` phải có giá trị) — dễ tưởng nhầm là bug UI khi test tự động click thẳng vào nút mà chưa click chọn dòng nhân viên trước.
6. Muốn login test bằng tài khoản admin thật trong Supabase (không phải tạo mới) → **hỏi user xin mật khẩu qua chat**, không tự ý reset password người dùng qua SQL (xem safety rule "Explicit permission required" — đổi mật khẩu = account settings change).
7. Sau khi test xong bằng data giả (contract/holiday/KPI test), **luôn `DELETE`/reset lại bằng `execute_sql` để không để rác trong DB thật** của user — dev DB này có data thật (nhân viên thật, không phải seed database).
