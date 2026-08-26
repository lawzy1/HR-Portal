# Handoff Report — TL Concepts HR Portal

**Ngày cập nhật:** 2026-08-26  
**Mục đích:** bàn giao đầy đủ business context, trạng thái production và các việc còn lại cho một account Codex khác tiếp tục phân tích/code.  
**Nguồn ưu tiên:** file này → `AGENTS.md` → `docs/phase10-business-acceptance.md` → migration tương ứng. `codebase.md` hữu ích cho kiến trúc cũ nhưng **chưa được cập nhật Phase 8–10**, nên không được coi là snapshot hiện hành cho RBAC/payroll.

---

## 1. Tóm tắt điều hành

TL Concepts HR Portal là HR portal nội bộ cho studio render nội thất/kiến trúc 3D. Hệ thống quản lý hồ sơ nhân viên, hợp đồng/phụ lục, ngày phép, KPI/OT, payroll, tài liệu và quy trình phê duyệt.

Production Supabase hiện đã có Phase 1–10, bao gồm workflow 3 vai trò và payroll approval. Mốc mới nhất đã deploy:

- **Phase 10 migration:** `20260825153557_phase10_business_alignment.sql` — đã apply production ngày 2026-08-26.
- **Onboarding RLS repair:** `20260826034008_fix_onboarding_employee_read_rls.sql` — đã apply production, khôi phục quyền đọc đúng hồ sơ onboarding của chính User mà không mở dữ liệu nhân viên khác.
- **Request approval RBAC:** `20260826120000_employee_requests_admin_approval.sql` — đã apply production. Chỉ User active tạo request nghỉ phép/OT/work-event của chính mình; HR chỉ xem; Admin duyệt hoặc từ chối.
- **Invitation authorization repair:** `create-employee` Edge Function phải kiểm tra `admin` active trước mọi Auth/email side effect. Không bao giờ dựa vào UI để bảo vệ endpoint.
- **Edge Function:** `process-payslip-outbox` — `ACTIVE`, version 2.
- **Project ref:** `xtyjeduckvopbdeokhfn`.
- **Frontend Phase 10:** source đã commit nhưng **chưa deploy theo yêu cầu business**. Người dùng sẽ tự deploy frontend.
- **Git commit mới nhất:** `e17450f fix: align phase 10 payroll business rules`.

Không có backend Node/Express riêng. Logic tin cậy nằm ở Supabase Postgres (RLS, trigger, function, RPC) và Edge Functions; React client chỉ là UI/data access layer.

---

## 2. Stack, cấu trúc và lệnh làm việc

### Stack

- React 19, TypeScript, Vite, Tailwind CSS 4.
- TanStack Query; `react-hook-form` + Zod; Radix Dialog.
- Supabase: Postgres 17, Auth, Storage, RLS, Edge Functions.
- Excel import: `read-excel-file`.
- Edge PDF: `pdf-lib` + Noto Sans Unicode font tải qua `PAYSLIP_FONT_URL`.

### Điểm vào chính

| Mục | Nơi cần đọc |
|---|---|
| Quy ước và lessons | `AGENTS.md` |
| Snapshot cũ của dự án | `codebase.md` (có nội dung outdated, xem cảnh báo trên) |
| React app / state view | `src/App.tsx`, `src/context/HRContext.tsx`, `src/context/AuthContext.tsx` |
| Supabase client / types | `src/lib/supabaseClient.ts`, `src/lib/database.types.ts` |
| Migrations | `supabase/migrations/` |
| Edge functions | `supabase/functions/` |
| Payroll acceptance/UAT | `docs/phase10-business-acceptance.md` |
| Handoff này | `docs/codex-handoff-2026-08-26.md` |

### Lệnh local

Chạy trong thư mục `tl-concepts-hr-portal/`:

```bash
npm run dev
npm run typecheck
npm run build
npm run lint
```

Không có automated test suite. Kiểm tra tiêu chuẩn hiện tại là `typecheck`, `build`, `lint`, Browser UAT có dữ liệu test an toàn, và query DB/RLS bằng công cụ Supabase.

---

## 3. Nguyên tắc bắt buộc khi code tiếp

1. **RLS là nguồn quyền hạn, UI không phải security boundary.** Dùng các function `current_company_id()`, `current_employee_id()`, `is_admin()`, `is_hr_accounting()`, `is_backoffice()`.
2. **Multi-tenant qua `company_id`.** Client không cần filter `company_id` khi SELECT (RLS tự lọc); INSERT phải có `company_id`.
3. **Không tự reset password hoặc thay đổi account người thật.** Cần quyền rõ ràng từ user.
4. **Không để dữ liệu test tồn tại trong production.** Không import payroll thật để thử workflow; tạo data test đã được business đồng ý, rồi dọn sạch.
5. **Đọc migration đã tồn tại trước khi sửa/đặt tên migration mới.** Không ghi đè migration chưa tracked.
6. **Migrations là imperative.** Tạo migration mới, apply production, rồi cập nhật `src/lib/database.types.ts`; không sửa migration đã apply.
7. **Function/RPC `SECURITY DEFINER` phải có `search_path = ''`, có authorization rõ ràng và revoke/grant tối thiểu.** Không tự ý revoke các function hiện hữu chỉ để làm sạch Advisor vì một số được RLS gọi hợp lệ.
8. User-facing text dùng tiếng Việt. Dialog xác nhận dùng `ConfirmationDialog`, không dùng `window.confirm/alert/prompt`.

---

## 4. Business model và phân quyền hiện hành

### Vai trò

| Vai trò DB | Phạm vi |
|---|---|
| `employee` (User) | Xem dữ liệu của chính mình và chỉ thấy item `published`; chỉ được tạo yêu cầu nghỉ phép, OT, work-event của chính mình. Mọi yêu cầu phải bắt đầu `Chờ duyệt`; không tự approve/chỉnh chi trả OT. |
| `hr` (HR/Kế toán) | Xem/sửa dữ liệu toàn công ty phục vụ HR/payroll/KPI/hợp đồng; tạo nháp và gửi duyệt các workflow đó. Được xem nhưng không tạo/sửa/duyệt yêu cầu phép, OT, work-event; không reset password, không quản lý account/role, không final approve/publish. |
| `admin` | Toàn quyền account/role/dữ liệu; duyệt/từ chối yêu cầu phép, OT, work-event và final approval/publish. |

### Approval state áp dụng cho payroll, contracts, `kpi_monthly`

```text
draft / rejected → pending_approval → published
                     ↑ Admin reject ──┘
```

- HR không sửa/xóa item `pending_approval` hoặc `published`.
- Chỉ Admin publish từ `pending_approval`; trigger/RPC lưu người gửi, người duyệt và timestamps.
- Employee chỉ đọc `published` của chính họ.
- Payroll publish tạo `notification_outbox` để Edge Function tạo PDF và gửi email nếu có cấu hình provider.

### Lưu ý tài liệu

- HĐLĐ và Phụ lục HĐLĐ cùng nằm trong `contracts`.
- Phụ lục dùng `type = 'Phụ lục hợp đồng'` và `parent_contract_id` trỏ HĐLĐ gốc.
- Phase 10 lưu SHA-256 của contract file và payslip PDF. File được tham chiếu bởi contract `pending_approval`/`published` hoặc payslip `published` không được Storage update/delete qua authenticated user.

---

## 5. Roadmap đã triển khai theo phase

| Phase | Migration chính | Nội dung business / trạng thái |
|---|---|---|
| 1 | `20260822105256_foundation.sql` | Company, profile, company settings, RLS foundation. |
| 2 | `20260822111424_phase2_employees.sql`, storage/self-edit followups | Employee, sensitive info, relatives, storage, onboarding self-edit. |
| 3 | `20260824062526_phase3_contracts_salary.sql` | HĐLĐ, salary history, legal warning Điều 20 BLLĐ 2019. |
| 4 | `20260824063435_phase4_leave.sql` | Leave balance/request, holiday, WFH/late work events. |
| 5 | `20260824074243_phase5_kpi_ot.sql` | KPI job/monthly/adjustment, OT. |
| 6 | `20260824080000_phase6_payroll.sql` | `payroll_records` và payslip base. |
| 7 | `20260824173333_phase7_kpi_target_level_and_contract_addendum.sql` | KPI target riêng mỗi nhân viên, level text tự do, category New Render/Re Process, addendum. |
| Invitation/onboarding | `20260825050000` đến `20260825114132` | Invitation-first onboarding, lifecycle invitation, atomic onboarding; public signup hiện bị tắt trong config. |
| 8 | `20260825124902_phase8_hr_accounting_payroll_approval.sql` | Role `hr`, backoffice policies, payroll approval, income/KPI commission fields. |
| 9 | `20260825133919_phase9_contract_kpi_notifications.sql` | Approval gates cho contract/KPI, notification outbox, payslip PDF metadata, workflow guards. |
| 10 | `20260825153557_phase10_business_alignment.sql` | Payroll formula, leave default 12, document immutability/hash, company info và official PDF alignment. **Đã deploy production.** |

### Phase 8–10 không được bỏ qua

`AGENTS.md` cũ ghi “2 roles admin/employee”; thông tin này không còn đúng. Phase 8 đã thêm `hr` và toàn bộ policy/workflow liên quan. `codebase.md` cũng chưa phản ánh Phase 8–10; khi sửa RLS, payroll, contract hoặc KPI phải đọc migrations 8–10 trước.

---

## 6. Quy tắc payroll đã chốt với business

### Luồng chuẩn

1. HR/Kế toán chuẩn bị Excel payroll.
2. Import/paste vào Portal thành `draft` theo kỳ lấy từ tiêu đề bảng lương.
3. HR/Kế toán submit approval.
4. Admin approve/publish.
5. Edge Function tạo PDF chính thức; gửi email nếu provider đã có secrets. User chỉ thấy sau publish.

Portal **không thay thế bảng tính lương của Kế toán**. Các khoản chi tiết lấy từ Excel. Database chỉ cưỡng chế các công thức tổng đã được business chốt.

### F01 — Final net pay (đã làm ở DB)

```text
total_deductions = BHXH + BHYT + BHTN + PIT + advance + other deductions
total_adjustments = welfare refund + business-trip refund + PIT refund + prior adjustment
net_salary = gross_income - total_deductions + total_adjustments
```

- `total_deductions` và `total_adjustments` là generated columns.
- Trigger `calculate_payroll_final_net()` tính lại `net_salary` mỗi INSERT/UPDATE liên quan; cột Net trong Excel không thể ghi đè kết quả cuối.
- PostgreSQL `numeric`, không làm tròn số lẻ VND.
- Case chuẩn để test: `18.800.000 - 799.250 + 203.452 = 18.204.202`.

### F03 — Hiển thị income

- Dùng **một dòng “OT / thưởng dự án”** = `ot_pay + project_bonus_amount`.
- `holiday_bonus_amount` hiển thị ở dòng **“Thưởng lễ”** riêng.
- Không được map/hiển thị khiến một khoản bị cộng hai lần.

### F04/F05 — Taxable income vs PIT

```text
taxable_income = workday_salary + kpi_bonus
               + ot_pay + project_bonus_amount + holiday_bonus_amount
               - (base_salary * 10.5%)
               - [15.500.000 + dependents_count * 6.200.000]
```

- `family_deduction` company default = 15.500.000; `dependent_deduction` default = 6.200.000.
- Trigger payroll stores total family deduction and taxable income above.
- **PIT (`personal_income_tax`) vẫn import từ Kế toán.** MVP không tự áp biểu thuế lũy tiến.

### F06/F07/F08

- Chỉ có Excel `Ngày công/tháng`: importer map cùng giá trị vào `standard_work_days` và `actual_work_days`.
- UI calendar dùng `getMonthWorkDays(month, year, holidayDates)`; đã kiểm tra 2027, 2028 (Feb 29) và 2029 đúng số ngày/năm nhuận, holiday weekday trừ 1 và Saturday trừ 0,5.
- Kỳ payroll luôn parse từ tiêu đề bảng payroll (không hard-code theo phiếu mẫu).
- Số tiền decimal giữ nguyên Excel, không round.

### Leave

- Leave entitlement company default hiện là **12 ngày/người/năm**.
- Admin có thể đổi company default; một nhân viên có thể có entitlement riêng (thưởng thêm phép) và giá trị override này phải được bảo toàn khi company default thay đổi.
- Leave accrual theo tháng và ngày bắt đầu làm việc; các ngày holiday không bị tính như ngày làm.

### PDF/email

- PDF includes: công ty, địa chỉ/MST, employee info, period, standard/actual days, leave, dependents, bank account, income, deductions, adjustments, total summary and final net.
- PDF retry tái dùng file hiện hữu và SHA-256 để tránh thay đổi nội dung vô ý.
- Subject/HTML mail trong Edge: `[TL Concepts HR Portal] Phiếu lương Tháng MM/YYYY`.
- Mặc định Edge **không gửi email** nếu thiếu `RESEND_API_KEY` hoặc `NOTIFICATION_FROM_EMAIL`; vẫn tạo PDF và đánh dấu `skipped`.
- Supabase default SMTP là Auth email, không phải cơ chế phù hợp để gửi payslip attachment từ Edge. Muốn email thật: cấu hình Resend/custom provider secrets; hoặc một SMTP/provider khác qua Edge.

---

## 7. Module map cho agent tiếp theo

| Module | UI/hook chính | DB/function quan trọng |
|---|---|---|
| Auth/RBAC | `AuthContext.tsx`, `AdminAccountManagementView.tsx` | `profiles`, `is_admin`, `is_hr_accounting`, `is_backoffice` |
| Employees | `AdminEmployeeListView.tsx`, `EditProfileModal.tsx`, `useEmployees.ts` | `employees`, sensitive info, relatives |
| Contracts | `AdminContractSalaryView.tsx`, `ContractEditorModal.tsx`, `useContracts.ts` | `contracts`, `salary_history`, legal warning RPC, approval guards |
| Leave | `AdminLeaveManagementView.tsx`, `useLeave.ts`, `workDays.ts` | leave tables, accrual functions, holidays |
| KPI/OT | `AdminKpiOtView.tsx`, `KpiRewardsView.tsx`, `useKpi.ts` | `kpi_job_items`, `kpi_monthly`, `kpi_adjustments`, `ot_records` |
| Payroll | `AdminPayrollView.tsx`, `PayslipDetailModal.tsx`, `usePayroll.ts` | `payroll_records`, approval RPC/trigger, outbox |
| PDF/email | — | `supabase/functions/process-payslip-outbox/index.ts` |
| Settings | `AdminSettingsView.tsx`, `useCompanySettings.ts` | `company_settings`, `companies` |

---

## 8. Verification đã làm và UAT chưa chạy

### Đã verify

- `npm run typecheck`: pass.
- `npm run build`: pass.
- `npm run lint`: 0 errors; còn 7 warnings cũ không thuộc Phase 10.
- `getMonthWorkDays` test: 2027/2028/2029 pass; February 2028 = 29 ngày; holiday weekday/Saturday đúng quy đổi.
- Supabase CLI dry-run trước deploy: chỉ migration Phase 10.
- Production migration list xác nhận remote có `20260825153557`.
- Production function list xác nhận `process-payslip-outbox` = `ACTIVE`, version 2.

### Chưa chạy UAT end-to-end — không được tự đánh dấu pass

UAT scenarios đã viết đầy đủ tại `docs/phase10-business-acceptance.md`, U01–U10. Cần tạo/sao lưu dữ liệu test và chạy:

1. **U01/U02:** employee A không đọc được employee B, draft/pending payroll vô hình với User.
2. **U03/U10:** HR có CRUD nghiệp vụ nhưng không role/account management hoặc final approval; Admin có quyền đó.
3. **U04:** import workbook thật `BẢNG_LƯƠNG.xlsx`, period/header/MSNV/day map/BHXH and F01 net chuẩn.
4. **U05:** publish một payroll test, PDF render/download đúng field + checksum stable; email `skipped` expected nếu chưa cấu hình provider.
5. **U06:** reject/resubmit payroll.
6. **U07:** company leave default + employee override.
7. **U08:** Team Leader QC optional vs employee rate 0.
8. **U09:** Storage cannot overwrite/delete pending/published contract/payslip paths.

Frontend Phase 10 source chưa lên production, vì vậy UI-specific portions của U04/U05/U07/U08 chỉ nên test sau deployment frontend do business thực hiện.

---

## 9. Backlog / known gaps theo ưu tiên

### P0 — cần làm trước khi payroll vận hành thật

- Chạy và ghi nhận UAT 3 vai trò + payroll import/publish/PDF bằng dữ liệu test.
- Xác nhận business xem số net preview/PDF đúng F01 trong UI sau frontend deploy.
- Nếu cần gửi payslip email: provision email provider secrets và test recipient; không dùng payroll thật để test.

### P1 — đã quyết định hoãn hoặc cần hardening

- **Supabase Security Hardening:** Advisors hiện vẫn báo các warning legacy, gồm SECURITY DEFINER functions callable (cần triage từng function, không revoke mù), leaked password protection đang disabled, RLS `auth.*` initialization-plan performance warnings, và multiple permissive policies. Đây là một workstream riêng.
- **KPI immutability:** chưa khóa `kpi_job_items`/`kpi_adjustments` sau khi tổng KPI tháng submit/publish. Bắt buộc làm trước khi KPI trở thành nguồn tự động tính lương hoặc nhiều người cùng nhập KPI.
- **Contract allowance/WFH:** chưa cấu trúc hóa prorate phụ cấp/WFH trong phụ lục; hiện phụ cấp là tổng số.
- Update `codebase.md` và `AGENTS.md` để phản ánh 3 roles/Phase 8–10, tránh account mới tin nhầm snapshot cũ.

### P2 / quality improvements

- KPI Excel export thiếu cột category New Render/Re Process.
- `ImportKpiModal` cho nhập tay `kpi_target`, chưa luôn tự tính target/day × workdays.
- Chưa có rating/ranking performance riêng cho management.
- `company_settings.kpi_rate_per_day` là legacy/orphan field, chỉ remove qua migration sau khi audit impact.
- README vẫn là AI Studio scaffold, không mô tả stack/deploy hiện hành; nên thay bằng onboarding guide thật.
- Tối ưu JS bundle (>500KB warning) bằng code splitting nếu performance UI là vấn đề.

---

## 10. Production/configuration notes

- `supabase/config.toml` dùng Postgres major 17; `site_url` là `https://hr-portal-tl.vercel.app`.
- Public signup đang `false`, invitation-first onboarding là intended flow.
- Auth redirect allow-list có production `/auth/activate` và local `http://127.0.0.1:3000/auth/activate`.
- `process-payslip-outbox` verify JWT enabled và tự kiểm tra actor là active Admin.
- Không đưa service-role key, Resend key, SMTP credentials vào frontend hoặc git.
- New public schema table/function cần explicit `GRANT`; RLS một mình không bảo đảm Data API access.

---

## 11. Prompt gợi ý để bàn giao cho Codex account khác

> Bạn đang tiếp quản TL Concepts HR Portal. Trước khi thay đổi bất kỳ code/DB nào, hãy đọc `docs/codex-handoff-2026-08-26.md`, `AGENTS.md`, `docs/phase10-business-acceptance.md`, và migrations Phase 8–10. Không tin phần RBAC/payroll trong `codebase.md` vì nó cũ hơn Phase 8. Dự án React/Vite + Supabase, không có backend riêng; RLS/trigger là security boundary. Production đã apply migration `20260825153557` và deploy `process-payslip-outbox` v2, frontend Phase 10 chưa deploy. Hãy bắt đầu bằng review worktree/migration history, sau đó đề xuất hoặc thực hiện đúng backlog được user chọn. Không dùng dữ liệu payroll thật để UAT, không reset password hay đổi role user thật khi chưa có xác nhận.

---

## 12. Lịch sử git gần nhất

```text
e17450f fix: align phase 10 payroll business rules
c3e1fd8 feat: Enhance contract management and payroll processing
86d6cdf feat: add HR approval workflows and payroll delivery
10f839d feat: update Supabase configuration for production deployment and enhance employee onboarding process
bfe0f12 feat: add employee self-registration flow, role-based access management, and KPI target tracking fields
```

Khi bắt đầu session mới, luôn chạy `git status`, `git log --oneline -10`, `supabase migration list`, và đọc các migration mới nhất trước khi code.
