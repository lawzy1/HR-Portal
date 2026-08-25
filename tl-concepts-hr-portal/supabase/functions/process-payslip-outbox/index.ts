import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFICATION_FROM_EMAIL = Deno.env.get("NOTIFICATION_FROM_EMAIL");
const APP_URL = (Deno.env.get("APP_URL") ?? "https://hr-portal-tl.vercel.app").replace(/\/$/, "");
const FONT_URL = Deno.env.get("PAYSLIP_FONT_URL")
  ?? "https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf";

let fontBytesPromise: Promise<Uint8Array> | null = null;

function getFontBytes() {
  fontBytesPromise ??= fetch(FONT_URL).then(async (response) => {
    if (!response.ok) throw new Error(`Không tải được font PDF (${response.status}).`);
    return new Uint8Array(await response.arrayBuffer());
  });
  return fontBytesPromise;
}

function money(value: unknown) {
  return `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)} đ`;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

type PayrollRecord = Record<string, unknown> & {
  id: string;
  company_id: string;
  employee_id: string;
  month: number;
  year: number;
  employees: { full_name: string; employee_code: string; email: string | null; job_title: string | null; department: string | null } | null;
  companies: { name: string } | null;
};

async function createPayslipPdf(record: PayrollRecord) {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  // Preserve Vietnamese diacritics. A missing Unicode font should fail and
  // retry the job instead of creating a PDF with broken glyphs.
  const fontBytes = await getFontBytes();
  const font = await document.embedFont(fontBytes, { subset: true });
  const page = document.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const teal = rgb(0.08, 0.39, 0.39);
  const coral = rgb(0.89, 0.32, 0.23);
  const ink = rgb(0.12, 0.16, 0.22);
  const muted = rgb(0.38, 0.43, 0.5);
  const line = rgb(0.86, 0.88, 0.91);
  const employee = record.employees;
  let y = height - 54;

  const draw = (text: string, x: number, size = 10, color = ink) => {
    page.drawText(text, { x, y, size, font, color });
  };
  const row = (label: string, value: string, tone = ink) => {
    page.drawText(label, { x: 52, y, size: 9, font, color: muted });
    const valueWidth = font.widthOfTextAtSize(value, 9);
    page.drawText(value, { x: width - 52 - valueWidth, y, size: 9, font, color: tone });
    page.drawLine({ start: { x: 52, y: y - 8 }, end: { x: width - 52, y: y - 8 }, thickness: 0.5, color: line });
    y -= 24;
  };
  const section = (title: string, color = teal) => {
    page.drawRectangle({ x: 42, y: y - 8, width: width - 84, height: 27, color });
    page.drawText(title, { x: 52, y, size: 10, font, color: rgb(1, 1, 1) });
    y -= 38;
  };

  draw((record.companies?.name ?? "CÔNG TY TNHH TL CONCEPTS").toUpperCase(), 42, 13, teal);
  y -= 28;
  const title = "PHIẾU LƯƠNG NHÂN VIÊN";
  draw(title, (width - font.widthOfTextAtSize(title, 20)) / 2, 20, teal);
  y -= 24;
  const period = `Kỳ tính lương: Tháng ${String(record.month).padStart(2, "0")}/${record.year}`;
  draw(period, (width - font.widthOfTextAtSize(period, 10)) / 2, 10, coral);
  y -= 38;

  draw(`Họ và tên: ${employee?.full_name ?? "—"}`, 52, 10);
  draw(`Mã NV: ${employee?.employee_code ?? "—"}`, 330, 10);
  y -= 20;
  draw(`Phòng ban: ${employee?.department ?? "—"}`, 52, 9, muted);
  draw(`Chức vụ: ${employee?.job_title ?? "—"}`, 330, 9, muted);
  y -= 28;

  section("I. THU NHẬP (GROSS)");
  row("Lương cơ bản", money(record.base_salary));
  row("Lương theo ngày công", money(record.workday_salary));
  row("Phụ cấp ăn trưa", money(record.lunch_allowance));
  row("Phụ cấp điện thoại", money(record.phone_allowance));
  row("KPI / commission", money(record.kpi_bonus), teal);
  row("OT / thưởng dự án / thưởng lễ", money(Number(record.ot_pay) + Number(record.project_bonus_amount) + Number(record.holiday_bonus_amount)), teal);
  row("TỔNG THU NHẬP", money(record.gross_income), teal);

  section("II. CÁC KHOẢN KHẤU TRỪ", coral);
  row("BHXH / BHYT / BHTN", money(Number(record.bhxh_deduction) + Number(record.bhyt_deduction) + Number(record.bhtn_deduction)), coral);
  row("Thuế thu nhập cá nhân", money(record.personal_income_tax), coral);
  row("Tạm ứng / khấu trừ khác", money(Number(record.advance_payment) + Number(record.other_deductions)), coral);

  section("III. ĐIỀU CHỈNH & HOÀN TRẢ");
  row("Hoàn phúc lợi / công tác phí / thuế", money(Number(record.welfare_refund) + Number(record.business_trip_refund) + Number(record.personal_income_tax_refund)), teal);
  row("Truy lĩnh / điều chỉnh kỳ trước", money(record.prior_month_adjustment));

  page.drawRectangle({ x: 42, y: y - 16, width: width - 84, height: 56, color: teal });
  page.drawText("THỰC LĨNH (NET)", { x: 56, y: y + 6, size: 13, font, color: rgb(1, 1, 1) });
  const net = money(record.net_salary);
  page.drawText(net, { x: width - 56 - font.widthOfTextAtSize(net, 18), y: y + 2, size: 18, font, color: rgb(1, 1, 1) });
  page.drawText("Tài liệu được phát hành sau khi Admin phê duyệt trên TL Concepts HR Portal.", {
    x: 52, y: 38, size: 7.5, font, color: muted,
  });
  return new Uint8Array(await document.save());
}

async function sendPayslipEmail(to: string, employeeName: string, month: number, year: number, pdf: Uint8Array) {
  if (!RESEND_API_KEY || !NOTIFICATION_FROM_EMAIL) {
    return { status: "skipped" as const, id: null, error: "Chưa cấu hình RESEND_API_KEY hoặc NOTIFICATION_FROM_EMAIL." };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: NOTIFICATION_FROM_EMAIL,
      to: [to],
      subject: `[TL Concepts HR] Phiếu lương Tháng ${String(month).padStart(2, "0")}/${year}`,
      html: `<p>Chào ${escapeHtml(employeeName)},</p><p>Phiếu lương Tháng ${String(month).padStart(2, "0")}/${year} đã được Admin phê duyệt và phát hành.</p><p>Bạn có thể xem chi tiết tại <a href="${escapeHtml(APP_URL)}">TL Concepts HR Portal</a>. File PDF chính thức được đính kèm email này.</p>`,
      attachments: [{ filename: `Phieu-luong-${month}-${year}.pdf`, content: bytesToBase64(pdf) }],
    }),
  });
  const body = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok) throw new Error(`Resend ${response.status}: ${body.message ?? "Không gửi được email."}`);
  return { status: "sent" as const, id: body.id ?? null, error: null };
}

export default {
  fetch: withSupabase({ auth: "user" }, async (request, ctx) => {
    if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
    const actorId = ctx.userClaims?.id;
    const { data: actor } = await ctx.supabaseAdmin
      .from("profiles")
      .select("company_id, role, is_active")
      .eq("id", actorId ?? "")
      .maybeSingle();
    if (!actor || actor.role !== "admin" || !actor.is_active) {
      return Response.json({ error: "Chỉ Admin đang hoạt động mới xử lý thông báo phiếu lương." }, { status: 403 });
    }

    const input = await request.json().catch(() => ({})) as { limit?: number; payrollId?: string };
    const limit = Math.min(Math.max(Number(input.limit) || 10, 1), 25);
    let query = ctx.supabaseAdmin
      .from("notification_outbox")
      .select("*")
      .eq("company_id", actor.company_id)
      .eq("event_type", "payslip_published")
      .in("status", ["pending", "failed"])
      .lte("available_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(limit);
    if (typeof input.payrollId === "string") query = query.eq("entity_id", input.payrollId);
    const { data: jobs, error: jobsError } = await query;
    if (jobsError) return Response.json({ error: jobsError.message }, { status: 500 });

    const results: Array<{ id: string; status: string; error?: string }> = [];
    for (const job of jobs ?? []) {
      const attempt = Number(job.attempts) + 1;
      const { data: claimed } = await ctx.supabaseAdmin
        .from("notification_outbox")
        .update({ status: "processing", attempts: attempt, updated_at: new Date().toISOString() })
        .eq("id", job.id)
        .in("status", ["pending", "failed"])
        .select("id")
        .maybeSingle();
      if (!claimed) continue;

      try {
        const { data, error } = await ctx.supabaseAdmin
          .from("payroll_records")
          .select("*, employees(full_name, employee_code, email, job_title, department), companies(name)")
          .eq("id", job.entity_id)
          .eq("company_id", actor.company_id)
          .eq("publish_status", "published")
          .single();
        if (error || !data) throw new Error(error?.message ?? "Không tìm thấy phiếu lương đã phát hành.");
        const payroll = data as unknown as PayrollRecord;
        const pdf = await createPayslipPdf(payroll);
        const path = `${payroll.company_id}/${payroll.employee_id}/payslips/${payroll.year}-${String(payroll.month).padStart(2, "0")}-${payroll.id}.pdf`;
        const { error: uploadError } = await ctx.supabaseAdmin.storage
          .from("employee-documents")
          .upload(path, pdf, { contentType: "application/pdf", upsert: true });
        if (uploadError) throw new Error(`Không lưu được PDF: ${uploadError.message}`);

        const recipient = job.recipient_email || payroll.employees?.email;
        const delivery = recipient
          ? await sendPayslipEmail(recipient, payroll.employees?.full_name ?? "bạn", payroll.month, payroll.year, pdf)
          : { status: "skipped" as const, id: null, error: "Nhân viên chưa có email." };
        const now = new Date().toISOString();
        await Promise.all([
          ctx.supabaseAdmin.from("notification_outbox").update({
            status: delivery.status, processed_at: now, provider_message_id: delivery.id,
            last_error: delivery.error, updated_at: now,
          }).eq("id", job.id),
          ctx.supabaseAdmin.from("payroll_records").update({
            payslip_pdf_path: path, notification_status: delivery.status,
            notification_sent_at: delivery.status === "sent" ? now : null,
          }).eq("id", payroll.id),
        ]);
        results.push({ id: job.id, status: delivery.status, ...(delivery.error ? { error: delivery.error } : {}) });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Lỗi không xác định.";
        const retryAt = new Date(Date.now() + Math.min(60, 2 ** attempt) * 60_000).toISOString();
        await Promise.all([
          ctx.supabaseAdmin.from("notification_outbox").update({
            status: "failed", last_error: message.slice(0, 1000), available_at: retryAt,
            updated_at: new Date().toISOString(),
          }).eq("id", job.id),
          ctx.supabaseAdmin.from("payroll_records").update({ notification_status: "failed" }).eq("id", job.entity_id),
        ]);
        results.push({ id: job.id, status: "failed", error: message });
      }
    }
    return Response.json({ processed: results.length, results });
  }),
};
