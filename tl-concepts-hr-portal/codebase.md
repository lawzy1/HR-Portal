# codebase.md — Trạng thái hiện tại của TL Concepts HR Portal

Cập nhật lần cuối: **2026-08-25**. File này tóm tắt trạng thái repo + lịch sử thay đổi để nạp context nhanh cho session tiếp theo. Xem [AGENTS.md](AGENTS.md) để biết quy ước code / bài học / logic nghiệp vụ chi tiết.

> Quy ước: mỗi lần có thay đổi đáng kể, thêm 1 mục mới lên **đầu** phần "Lịch sử thay đổi" (mới nhất trên cùng), và cập nhật "Trạng thái hiện tại" nếu module liên quan đổi.

## Trạng thái hiện tại (snapshot)

**Đã hoàn thiện & apply vào DB thật, verify qua UI:**
- Auth 2 role (admin/employee), multi-tenant RLS qua `company_id`.
- Hồ sơ nhân viên đầy đủ (thông tin chung, CCCD/MST/BHXH, ngân hàng, người thân, upload ảnh) + **chỉ tiêu KPI theo level/ngày riêng từng người** (mới).
- Hợp đồng lao động + lịch sử tăng lương + **phụ lục hợp đồng** (mới) + cảnh báo pháp lý Điều 20 BLLĐ 2019.
- Nghỉ phép: quỹ phép theo năm, đơn xin nghỉ, duyệt, ngày lễ công ty (`company_holidays`), WFH/đi trễ.
- KPI/OT: nhập liệu bài/dự án theo Order+sub-task, **phân loại New Render / Re Process** (mới), **chỉ tiêu KPI tháng tính riêng theo từng nhân viên = chỉ tiêu/ngày × ngày công chuẩn (đã trừ lễ/Tết)** (mới), đồng bộ sang `kpi_monthly`, quản lý OT.
- Payroll: import/paste phiếu lương, publish/xem phiếu lương, audit log, reminders (HĐ sắp hết hạn, hồ sơ thiếu giấy tờ...), báo cáo & audit trail.

**Đã deploy Supabase, chờ deploy frontend lên Vercel:**
- Luồng **Admin mời → nhân viên đặt mật khẩu → onboarding → Admin duyệt** đã apply migration, deploy Edge Function `create-employee` và regenerate type từ DB thật. Đăng ký công khai đã bị tắt ở UI và Supabase Auth.
- `vercel.json` rewrite mọi route SPA về `index.html`; sau lần deploy Vercel kế tiếp, mở trực tiếp `/login` và `/auth/activate` sẽ không còn 404. `APP_URL` dùng production URL, CORS cho phép cả production và `http://127.0.0.1:3000`.

**Cắt góc có chủ đích (xem lý do trong AGENTS.md §Lessons):**
- `kpi_level` là text tự do + gợi ý, không phải bảng danh mục level.
- Phụ cấp hợp đồng (`allowance_amount`) là 1 số tổng, chưa tách loại phụ cấp.
- `company_settings.kpi_rate_per_day` không còn được dùng ở đâu (cột mồ côi).

**Gap đã biết, chưa fix (xem thảo luận 2026-08-25):**
- Export Excel bảng KPI (`AdminKpiOtView.handleDownloadExcel`) chưa có cột "Phân loại" (New Render/Re Process).
- Chưa có bảng xếp hạng/đánh giá hiệu suất riêng cho ban lãnh đạo (hiện chỉ có card tiến độ %/nhân viên, chưa xếp loại Xuất sắc/Đạt/Chưa đạt hay ranking toàn công ty).
- `ImportKpiModal` (import Excel vào `kpi_monthly`) vẫn cho admin gõ tay `kpi_target`, chưa tự tính theo công thức chỉ tiêu×ngày công mới.
- Màn tự xem KPI của nhân viên (`KpiRewardsView`) đã sửa code nhưng chưa test qua UI thật bằng tài khoản employee (chỉ verify logic).

## Schema hiện tại (bảng chính, `public` schema)

`companies`, `company_settings`, `company_holidays`, `profiles`, `employees`, `employee_sensitive_info`, `employee_relatives`, `contracts`, `salary_history`, `leave_balances`, `leave_balance_adjustments`, `leave_requests`, `work_events`, `kpi_job_items`, `kpi_monthly`, `kpi_adjustments`, `ot_records`, `payroll_records`, `audit_logs`.

Nguồn sự thật cho type: `src/lib/database.types.ts` (generate từ Supabase, đừng sửa tay trừ khi vừa migrate xong và chưa kịp regenerate).

## Lịch sử thay đổi

### 2026-08-25 — Vercel SPA deep-link + production Auth URL

- Thêm `vercel.json` rewrite `/(.*) → /index.html` cho Vite dùng BrowserRouter.
- Cấu hình Supabase Auth dùng Site URL `https://hr-portal-tl.vercel.app`; allow redirect kích hoạt cho cả production và local.
- Edge Function `create-employee` dùng `APP_URL` production để tạo link invite; thêm `ALLOWED_ORIGINS` để CORS chấp nhận cả Vercel và local dev.

### 2026-08-25 — Invitation-first employee onboarding (chờ deploy Supabase)

**Migration local:** `20260825100000_invitation_first_employee_onboarding.sql`.
- Thêm state machine `invited → in_progress → submitted → needs_changes → approved` vào `profiles`; `is_active` chỉ thành `true` sau bước Admin duyệt.
- Thêm `employee_invitations`, unique email theo công ty, RPC bắt đầu/gửi/duyệt onboarding.
- `current_company_id()` và `current_employee_id()` chỉ trả dữ liệu cho tài khoản active; exception RLS giới hạn tài khoản onboarding vào đúng hồ sơ, CCCD/ngân hàng/người thân và thư mục Storage của chính họ.
- Gỡ trigger self-registration của `auth.users`; không còn điểm vào public `auth.signUp`.

**Code:**
- `create-employee` Edge Function xác thực Admin, gọi `inviteUserByEmail` với redirect `/auth/activate`, rồi gọi RPC tạo nhân viên/profiles/invitation. Cần secret `APP_URL` (ví dụ `http://127.0.0.1:3000` khi dev), đồng thời URL `/auth/activate` phải nằm trong Supabase Auth Redirect URLs.
- `NewEmployeeModal` chỉ còn 6 field công việc: mã NV, họ tên, email, phòng ban, chức danh, ngày vào làm.
- `ActivateAccountPage` cho nhân viên đặt mật khẩu lần đầu; `EmployeeOnboardingPage` yêu cầu thông tin cá nhân, CCCD hai mặt, ngân hàng, liên hệ khẩn cấp và gửi hồ sơ; `AdminSettingsView` duyệt hoặc yêu cầu bổ sung hồ sơ đã submit.

**Verify local:** TypeScript typecheck sạch. Chưa thể E2E email/RLS do remote Supabase chưa được link trong checkout này.

### 2026-08-25 — Cho phép self-registration bằng mọi email trong dev

**Migration local:** `20260825075157_allow_any_email_self_registration.sql` (chưa apply remote do checkout chưa link Supabase project).
- Bỏ giới hạn domain `@tlconceptsltd.com` trong trigger `handle_employee_self_registration`.
- Giữ tài khoản mới ở trạng thái chờ Admin duyệt (`employees.status = 'Chờ duyệt'`, `profiles.is_active = false`).
- Harden trigger function bằng `search_path = ''` và thu hồi quyền gọi trực tiếp từ `public`, `anon`, `authenticated`.

**Code:**
- [LoginPage.tsx](src/pages/LoginPage.tsx) — form đăng ký nhận mọi email hợp lệ; cập nhật label, placeholder và mô tả đúng luồng onboarding/Admin duyệt.
- [AuthContext.tsx](src/context/AuthContext.tsx) — chuẩn hóa email bằng `trim().toLowerCase()` khi đăng ký và đăng nhập.

**Verify:** typecheck và production build sạch; ESLint không có error (còn 6 warning cũ); test UI local xác nhận `dev.user@gmail.com` không còn bị lỗi domain. Chưa tạo tài khoản test và chưa apply migration lên remote dev.

### 2026-08-25 — Chỉ tiêu KPI theo nhân viên + Phụ lục hợp đồng + Phân loại KPI job (phase7)

**Migration:** `20260824173333_phase7_kpi_target_level_and_contract_addendum.sql` (đã apply + verify qua UI + DB).
- `employees`: + `kpi_level text`, + `kpi_target_per_day numeric`.
- `contracts`: + `signed_date date`, + `kpi_target_month numeric`, + `allowance_amount numeric default 0`, + `parent_contract_id uuid → contracts.id` (dùng cho phụ lục), + index trên `parent_contract_id`.
- `kpi_job_items`: + `category text default 'new_render'` với `check (category in ('new_render','reprocess'))`.

**Code:**
- [EditProfileModal.tsx](src/components/EditProfileModal.tsx) — thêm card "Chỉ tiêu KPI & Level Vị trí công việc" ở tab Thông tin Chung (input text + `<datalist>` gợi ý level, input số view/ngày).
- [ContractEditorModal.tsx](src/components/admin/ContractEditorModal.tsx) — thêm field Ngày ký / KPI-tháng / Phụ cấp; type mới `'Phụ lục hợp đồng'` kèm select "Phụ lục của hợp đồng gốc" (`parent_contract_id`).
- [AdminContractSalaryView.tsx](src/components/admin/AdminContractSalaryView.tsx) — tách `ContractCard`, nhóm hợp đồng gốc + phụ lục lồng nhau (indent + badge "Phụ lục").
- [workDays.ts](src/utils/workDays.ts) — `getMonthWorkDays(month, year, holidayDates)` giờ nhận mảng ngày lễ và trừ vào `standardWorkDays`; bỏ hẳn `kpiRatePerDay`/`calculatedKpiTarget` khỏi `MonthWorkDaysInfo` (không còn định mức chung).
- [AdminKpiOtView.tsx](src/components/admin/AdminKpiOtView.tsx) — thay đổi lớn nhất:
  - Bỏ stepper "Định mức KPI/ngày công" + card "Định mức Cơ sở Tháng"; thêm card "Nghỉ Lễ/Tết" (dùng `useCompanyHolidays()`).
  - Bảng mới **"KPI tiêu chuẩn tháng cho từng nhân viên"** (level, chỉ tiêu/ngày, ngày công tháng, KPI chuẩn tháng = tích 2 số).
  - Bảng nhập liệu KPI: thêm cột "Phân loại" (badge New Render/Re Process) + 3 stat card tổng hợp theo phân loại + select phân loại trong modal thêm/sửa job.
  - Card "Tiến độ KPI từng nhân viên": đổi target dùng riêng từng người + breakdown Render Dự Án vs Chỉnh Sửa.
  - `handleSyncKpiToProfiles`: đồng bộ `kpi_monthly.kpi_target` theo target riêng từng nhân viên thay vì 1 số chung.
- [KpiRewardsView.tsx](src/components/KpiRewardsView.tsx) — màn tự xem KPI của nhân viên đồng bộ theo cùng logic (target riêng + holiday-aware).

**Verify:** `npm run lint`/`typecheck`/`build` sạch. Test tay qua Browser: lưu KPI level/target trên hồ sơ → check DB đúng; tạo hợp đồng + phụ lục → hiển thị lồng nhau đúng; thêm ngày lễ giữa tháng → ngày công tự trừ, chỉ tiêu tự tính lại đúng công thức, sync Payroll ghi đúng `kpi_target` vào `kpi_monthly`. Đã dọn data test khỏi DB.

### Trước 2026-08-25 (context từ session trước, suy ra từ git log + working tree, chưa xác minh chi tiết)

- `22ff516` "feat: implement audit logs, expand HR reminders system, and add contract management features" — audit log system, reminders mở rộng, base contract management (trước khi có phase7 ở trên).
- `ebc1587` "update", `602a320` merge, `3bc9aad` "Update HR Portal project", `a863c57`/`14c4f50`/`ba01fc8` — khởi tạo project (từ AI Studio scaffold ban đầu, xem `README.md` cũ nhắc tới Gemini API — không còn liên quan, app hiện tại chạy hoàn toàn trên Supabase).
- **Việc dở dang phát hiện trong working tree (chưa commit, KHÔNG phải do session 2026-08-25 tạo ra):** luồng employee self-registration — sửa `AuthContext.tsx` (thêm `signUp`), `LoginPage.tsx` (form đăng ký), `useProfiles.ts` (`useUpdateProfileAccess` để admin bật/tắt tài khoản), `AdminEmployeeListView.tsx` (UI duyệt). Migration tương ứng (`20260825050000_employee_self_registration.sql`) đã viết nhưng **chưa apply**. Session tiếp theo nên hỏi user có muốn hoàn thiện luồng này không trước khi động vào các file trên.
