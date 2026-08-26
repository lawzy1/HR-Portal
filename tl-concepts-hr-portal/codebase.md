# codebase.md — Trạng thái hiện tại của TL Concepts HR Portal

Cập nhật lần cuối: **2026-08-26**. File này tóm tắt trạng thái repo + lịch sử thay đổi để nạp context nhanh cho session tiếp theo. Xem [AGENTS.md](AGENTS.md) để biết quy ước code / bài học / logic nghiệp vụ chi tiết.

> Quy ước: mỗi lần có thay đổi đáng kể, thêm 1 mục mới lên **đầu** phần "Lịch sử thay đổi" (mới nhất trên cùng), và cập nhật "Trạng thái hiện tại" nếu module liên quan đổi.

## Trạng thái hiện tại (snapshot)

**Đã hoàn thiện & apply vào DB thật, verify qua UI/RLS:**
- Auth 3 role (`admin`/`hr`/`employee`), multi-tenant RLS qua `company_id`. HR/Kế toán vận hành dữ liệu nhưng không quản lý account/role hoặc final approve; Admin là role duy nhất làm các thao tác này.
- Auth self-service: User/HR/Admin đều có thể xem hồ sơ tài khoản và đổi mật khẩu của chính mình; màn Login có luồng Quên mật khẩu gửi email reset qua Supabase Auth.
- Hồ sơ nhân viên đầy đủ (thông tin chung, CCCD/MST/BHXH, ngân hàng, người thân, upload ảnh) + **chỉ tiêu KPI theo level/ngày riêng từng người** (mới).
- Hợp đồng lao động + lịch sử tăng lương + **phụ lục hợp đồng** (mới) + cảnh báo pháp lý Điều 20 BLLĐ 2019.
- Nghỉ phép: quỹ phép theo năm, đơn xin nghỉ, duyệt, ngày lễ công ty (`company_holidays`), WFH/đi trễ; range ngày lễ được tách thành từng ngày để dùng trong công thức ngày công.
- KPI/OT: nhập liệu bài/dự án theo Order+sub-task, **phân loại New Render / Re Process** (mới), **chỉ tiêu KPI tháng tính riêng theo từng nhân viên = chỉ tiêu/ngày × ngày công cá nhân (đã trừ lễ/Tết và phép đã duyệt)** (mới), đồng bộ sang `kpi_monthly`, quản lý OT.
- Payroll: import/paste phiếu lương, publish/xem phiếu lương, audit log, reminders (HĐ sắp hết hạn, hồ sơ thiếu giấy tờ...), báo cáo & audit trail.
- User chỉ tự tạo request nghỉ phép, OT, WFH thêm/đi trễ của chính mình; tất cả bắt đầu `Chờ duyệt` và chỉ Admin được duyệt/từ chối. HR/Kế toán chỉ xem các request này.

**Đã deploy Supabase, chờ deploy frontend lên Vercel:**
- Luồng **Admin mời → nhân viên đặt mật khẩu → onboarding → Admin duyệt** đã apply migration, deploy Edge Function `create-employee` và regenerate type từ DB thật. Đăng ký công khai đã bị tắt ở UI và Supabase Auth.
- Khi nhân viên gửi onboarding, hồ sơ chuyển `Chờ duyệt hồ sơ` và xuất hiện trực tiếp tại `Thông báo & Cảnh báo` của Admin. Admin mở mục này để vào đúng Hồ sơ Nhân viên, kiểm tra CCCD/ngân hàng/người thân, rồi `Duyệt hồ sơ` hoặc `Yêu cầu bổ sung`. Không gửi email nội bộ cho Admin hoặc email thông báo kết quả cho nhân viên.
- `vercel.json` rewrite mọi route SPA về `index.html`; sau lần deploy Vercel kế tiếp, mở trực tiếp `/login` và `/auth/activate` sẽ không còn 404. `APP_URL` dùng production URL, CORS cho phép cả production và `http://127.0.0.1:3000`.

**Sẵn sàng deploy Supabase:**
- Quản lý vòng đời lời mời kích hoạt: admin thấy link đã gửi/đã mở/hết hạn/thu hồi, có thể gửi lại hoặc thu hồi ngay từ Hồ sơ Nhân viên. Migration và Edge Function mới cần deploy cùng nhau trước khi UI này hoạt động.

**Cắt góc có chủ đích (xem lý do trong AGENTS.md §Lessons):**
- `kpi_level` là text tự do + gợi ý, không phải bảng danh mục level.
- Phụ cấp hợp đồng (`allowance_amount`) là 1 số tổng, chưa tách loại phụ cấp.
- `company_settings.kpi_rate_per_day` không còn được dùng ở đâu (cột mồ côi).

**Gap đã biết, chưa fix (xem thảo luận 2026-08-25):**
- Bảng quỹ phép đang hiển thị `total_accumulated` (phép đã tích lũy đến thời điểm hiện tại), không phải toàn bộ `annual_entitlement`; tên “Tổng quỹ” dễ gây hiểu nhầm. `remaining_days` trong Phase 10 hiện chưa trừ `pending_days`, nên cần chốt lại cách hiển thị/khóa số ngày khi có đơn chờ duyệt.
- Export Excel bảng KPI (`AdminKpiOtView.handleDownloadExcel`) chưa có cột "Phân loại" (New Render/Re Process).
- Chưa có bảng xếp hạng/đánh giá hiệu suất riêng cho ban lãnh đạo (hiện chỉ có card tiến độ %/nhân viên, chưa xếp loại Xuất sắc/Đạt/Chưa đạt hay ranking toàn công ty).
- `ImportKpiModal` (import Excel vào `kpi_monthly`) vẫn cho admin gõ tay `kpi_target`, chưa tự tính theo công thức chỉ tiêu×ngày công mới.
- Màn tự xem KPI của nhân viên (`KpiRewardsView`) đã sửa code nhưng chưa test qua UI thật bằng tài khoản employee (chỉ verify logic).

## Schema hiện tại (bảng chính, `public` schema)

`companies`, `company_settings`, `company_holidays`, `profiles`, `employees`, `employee_sensitive_info`, `employee_relatives`, `contracts`, `salary_history`, `leave_balances`, `leave_balance_adjustments`, `leave_requests`, `work_events`, `kpi_job_items`, `kpi_monthly`, `kpi_adjustments`, `ot_records`, `payroll_records`, `audit_logs`.

Nguồn sự thật cho type: `src/lib/database.types.ts` (generate từ Supabase, đừng sửa tay trừ khi vừa migrate xong và chưa kịp regenerate).

## Lịch sử thay đổi

### 2026-08-26 — Phase 1 đồng bộ dữ liệu qua cache/refetch, không polling

- `QueryClient` dùng `staleTime: 0`, `refetchOnMount: 'always'`, `refetchOnWindowFocus: 'always'` và `refetchOnReconnect: 'always'` để mỗi lần mở lại module hoặc quay lại Portal đều đọc dữ liệu mới nhất từ Supabase.
- Thêm `src/lib/queryRefresh.ts`: mutation sau khi ghi thành công invalidate theo prefix và refetch cả query đang inactive, giúp các module khác không giữ cache cũ.
- Bổ sung invalidation cho các quan hệ phụ thuộc: hồ sơ nhân viên làm mới các danh sách có join nhân viên; hồ sơ nhạy cảm làm mới cả dashboard tổng hợp; ngày lễ làm mới số dư phép; onboarding/invitation làm mới danh sách nhân viên, profile và lời mời.
- Bỏ `useHrDataRefresh` và polling 60 giây. Không bật Supabase Realtime ở phase này; khi cần sẽ đánh giá lại theo nhu cầu đồng bộ giữa nhiều thiết bị.
- Đây là đồng bộ theo API/cache, không phải server push: tab hoặc thiết bị khác chỉ thấy dữ liệu mới khi focus/mount/refetch.

### 2026-08-26 — Thêm form nhập phiếu lương thủ công

- `AdminPayrollView` có nút **Thêm phiếu lương** mở form theo mẫu phiếu lương TL Concepts; form dùng upsert theo nhân viên + tháng/năm và luôn lưu bản ghi ở trạng thái Nháp.
- Form tự liên kết lương/phụ cấp từ hợp đồng hiện hành, ngày công chuẩn từ lịch lễ, phép đã duyệt từ `leave_requests`, quỹ phép từ `leave_balances`, KPI/OT từ dữ liệu cùng kỳ và tỷ lệ bảo hiểm từ `company_settings`.
- Tổng thu nhập, tổng khấu trừ, điều chỉnh/hoàn trả và thực lãnh được preview theo F01; `taxable_income`/`family_deduction` hiển thị tham chiếu, còn thuế TNCN vẫn nhập theo Kế toán (MVP). Trigger Phase 10 tiếp tục là nguồn sự thật khi lưu.
- Phiếu đã chờ duyệt hoặc phát hành bị khóa chỉnh sửa; cột trạng thái thanh toán, ngày thanh toán và ghi chú vẫn nhập được trong form nháp.

### 2026-08-26 — Gọn hóa bảng tài khoản và phân quyền

- Bỏ cột trạng thái onboarding khỏi bảng Tài khoản & Phân quyền vì đây là trạng thái quy trình nội bộ, không cần hiển thị thường xuyên.
- Giữ thao tác khóa quyền truy cập trong cột Thay đổi Vai trò để Admin vẫn quản lý được quyền đăng nhập.

### 2026-08-26 — Giữ tab khi auth refresh và mở rộng preview payroll

- Tab điều hướng User/HR/Admin được lưu trong query URL (`tab`/`adminTab`) và `sessionStorage`; khi `HRProvider` remount do auth refresh hoặc người dùng chuyển ứng dụng, Portal giữ nguyên màn hình đang mở.
- `AuthContext` giữ profile/route hiện tại trong lúc `TOKEN_REFRESHED` của cùng user được revalidate, tránh tháo `ProtectedRoute`/`HRProvider` chỉ vì refresh token nền.
- Không tách thành nhiều bundle/page độc lập: mỗi tab vẫn là SPA view nhưng có URL deep-link, ví dụ `/?adminTab=admin-payroll`.
- Preview import payroll hiển thị toàn bộ tên cột và giá trị theo đúng thứ tự file Excel, có scroll ngang; file chỉ có cột Tên nhân viên cũng được nhận.
- Preview không format lại cột tiền: hiển thị đúng chuỗi số nguồn từ Excel, không thêm dấu phân cách/`₫`/làm tròn; kiểu số trong bản ghi tính/lưu không đổi. Dòng `Tổng cộng` vẫn chỉ hiển thị, không được import thành nhân viên.
- Đối chiếu nhân viên ưu tiên họ tên chuẩn hóa nếu khớp duy nhất (mã legacy được cảnh báo), dùng MSNV khi không có tên; tên trùng hoặc tên/mã trỏ hai hồ sơ khác nhau vẫn bị chặn an toàn.
- Luồng chọn XLSX bắt buộc đọc được tháng/năm từ tiêu đề bảng lương trước khi tạo preview; không âm thầm dùng kỳ đang chọn trên UI khi file thiếu tiêu đề.

### 2026-08-26 — Sửa parser import bảng lương Excel

- Chuẩn hóa đúng ký tự `Đ/đ` trong header tiếng Việt, khôi phục map `Phụ cấp điện thoại` và các header có dấu tương tự.
- Loại nhiễu IEEE-754 từ giá trị công thức Excel (ví dụ `247204.55000000002`) trước khi tính Net.
- Map cột tổng hợp `Thưởng lễ + OT` vào một dòng OT/thưởng dự án, không cộng trùng.
- Nếu MSNV trong file là mã legacy nhưng họ tên khớp duy nhất với employee master, preview cho phép import kèm cảnh báo; tên trùng nhiều người vẫn bị chặn. Preview cũng tự dựng lại khi danh sách nhân viên tải xong.

### 2026-08-26 — Quên mật khẩu và hồ sơ tài khoản backoffice

- Thêm `ForgotPasswordPage` và `ResetPasswordPage`: gửi email reset với redirect URL theo origin hiện tại, cập nhật mật khẩu qua Supabase Auth rồi đóng recovery session trước khi đăng nhập lại.
- Thêm `requestPasswordReset` vào `AuthContext`; luồng đổi mật khẩu khi đã đăng nhập vẫn yêu cầu xác thực lại mật khẩu hiện tại và chỉ tác động lên session hiện tại.
- Admin/HR có menu `Hồ sơ tài khoản`; User dùng khối bảo mật trên `Hồ sơ cá nhân`. Bổ sung redirect URLs cho local, Vercel và `portal.tlconceptsltd.com` trong `supabase/config.toml`.

**Lưu ý triển khai:** sau khi deploy frontend, phải thêm các URL `/auth/reset-password` tương ứng vào Supabase Dashboard → Authentication → URL Configuration nếu project production chưa nạp `supabase/config.toml`.

### 2026-08-26 — Kỳ đánh giá KPI theo ngày hiện tại và mở rộng lịch năm

- `AdminKpiOtView` mặc định chọn tháng/năm hiện tại theo đồng hồ hệ thống thay vì giá trị hardcode.
- Bộ chọn năm KPI có năm trước để xem lịch sử, năm hiện tại và 10 năm tiếp theo; `KpiRewardsView` dùng cùng phạm vi để User xem dữ liệu tương lai.

### 2026-08-26 — Liên kết phép đã duyệt với ngày công KPI

- `workDays.ts` có hàm tính số ngày phép theo đúng lịch 5,5 ngày/tuần, loại trừ Chủ Nhật/ngày lễ và hỗ trợ request kéo dài qua tháng.
- `AdminKpiOtView` trừ phép đã duyệt theo từng nhân viên khi hiển thị ngày công và tạo `kpi_monthly.kpi_target`; `KpiRewardsView` hiển thị cùng kết quả cho User.
- `NewLeaveModal` dùng chung công thức để số ngày ghi vào đơn phép khớp với ngày công KPI/quỹ phép. Đơn `Chờ duyệt`/`Từ chối` không ảnh hưởng KPI.

### 2026-08-26 — User gửi request, Admin duyệt phép/OT/work-event

- Migration production `20260826120000_employee_requests_admin_approval.sql` tách quyền tạo request khỏi back-office: chỉ profile `employee` active được INSERT cho chính mình.
- RLS và trigger buộc request mới là `Chờ duyệt`, không có approver/comment; User không thể ghi tiền/loại chi trả OT hoặc đổi trạng thái. HR/Kế toán chỉ SELECT, còn UPDATE/approve/reject chỉ dành cho Admin.
- `NewLeaveModal` có thêm request OT cho User. Back-office không còn nút tạo OT trực tiếp; Admin xử lý request từ danh sách OT.

### 2026-08-26 — Chặn invitation Edge Function trước service-role side effect

- `create-employee` kiểm tra caller có profile `admin` đang active ngay sau khi xác thực JWT và **trước** `inviteUserByEmail`.
- User hoặc HR/Kế toán gọi trực tiếp endpoint sẽ nhận `403`; không tạo Auth user và không gửi email. Đây là backend boundary bắt buộc, không dựa vào việc UI có ẩn nút mời nhân viên.
- Business RBAC đã được đồng bộ trong `AGENTS.md`: User chỉ xem dữ liệu của mình; HR/Kế toán vận hành dữ liệu nhưng không quản lý account/role, không reset/đổi mật khẩu tài khoản khác, và không final approval; mọi role đều có thể tự đổi mật khẩu của chính mình.

### 2026-08-25 — Xóa vĩnh viễn nhân viên đã nghỉ việc

- `AdminEmployeeListView` chỉ hiển thị nút **Xóa vĩnh viễn** khi trạng thái là `Đã nghỉ việc`; Admin phải nhập đúng mã nhân viên trước khi nút xóa được mở.
- Edge Function `delete-offboarded-employee` xác thực Admin đang hoạt động cùng company, chặn xóa nhân viên chưa nghỉ việc hoặc nhân viên gắn tài khoản Admin, dọn tệp trong Storage, xóa Auth user và record nhân viên (các bảng nghiệp vụ liên quan cascade theo FK). Audit log chỉ giữ lại dấu vết thao tác xóa.
- Function đã deploy tới Supabase project `xtyjeduckvopbdeokhfn`.

**Verify local:** `npm run typecheck` sạch; function deploy thành công.

### 2026-08-25 — Duyệt hồ sơ onboarding ngay trong portal Admin

- `HRContext` tạo cảnh báo động theo các `profiles.onboarding_status = 'submitted'`; sidebar hiển thị badge số **hồ sơ chờ duyệt** và `Thông báo & Cảnh báo` có filter chuyên biệt.
- `AdminEmployeeListView` hiển thị khối **Hồ sơ đang chờ duyệt** cho nhân viên tương ứng, với nút `Duyệt hồ sơ`/`Yêu cầu bổ sung`; Admin kiểm tra trực tiếp các phần CCCD, ngân hàng và người thân bên dưới trước khi quyết định.
- Bỏ nút duyệt khỏi `AdminSettingsView` để tránh hai điểm xử lý; trạng thái profile sau khi duyệt sẽ tự làm cảnh báo biến mất. Mutation đồng thời làm mới danh sách nhân viên.
- Luồng này chỉ dùng portal/RPC sẵn có, **không gửi email** cho Admin hay nhân viên ở cả bước submit và duyệt.
- Các bước duyệt, yêu cầu bổ sung, thu hồi lời mời và đánh dấu nghỉ việc dùng `ConfirmationDialog` tái sử dụng (Radix Dialog), thay cho popup browser native; phản hồi sau thao tác vẫn dùng toast hệ thống.

**Verify local:** `npm run typecheck`, `npm run build`, `npm run lint` sạch error (còn 7 warning cũ không liên quan).

### 2026-08-25 — Quản lý vòng đời lời mời kích hoạt

**Migration local:** `20260825114132_invitation_lifecycle_management.sql`.
- `employee_invitations`: thêm hạn link, lần mở gần nhất, số lần gửi lại, trạng thái thu hồi, trạng thái hoàn tất và lỗi gửi mail cuối cùng; có index cho các lời mời đang chờ.
- Link chưa dùng chỉ có hiệu lực trong 1 giờ. Sau khi nhân viên đã đi vào luồng hợp lệ/đặt mật khẩu, họ có thể đăng nhập để tiếp tục onboarding dang dở dù link email cũ hết hạn. Thu hồi thì cắt ngay RLS onboarding và hiển thị màn báo rõ ràng cho nhân viên.

**Code:**
- `manage-employee-invitation` Edge Function xác thực Admin + company, tạo link recovery mới qua Supabase Auth, gửi email qua Resend, lưu audit log; nếu gửi email thất bại, UI cho Admin sao chép link để gửi qua kênh an toàn.
- `AdminEmployeeListView`: badge trạng thái lời mời, thông tin đã gửi/mở/hết hạn và nút Gửi lại/Thu hồi.
- `ActivateAccountPage`: xác thực lời mời ngay trước khi cho đặt mật khẩu; lời mời bị hết hạn/thu hồi có thông báo hướng dẫn liên hệ HR.

**Verify local:** `npm run typecheck`, `npm run build`, `npm run lint` sạch error (còn các warning cũ không liên quan).

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
