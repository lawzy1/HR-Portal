import { brandedButton, brandedEmailHtml, escapeHtml } from "./email-template.ts";

export const EMPLOYEE_INVITATION_EXPIRY_MS = 60 * 60 * 1000;

export interface InvitationEmailResult {
  delivered: boolean;
  error: string | null;
  emailId: string | null;
}

export async function sendEmployeeInvitationEmail(
  to: string,
  employeeName: string,
  actionLink: string,
): Promise<InvitationEmailResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("NOTIFICATION_FROM_EMAIL");
  if (!apiKey || !from) {
    return {
      delivered: false,
      error: "Chưa cấu hình RESEND_API_KEY hoặc NOTIFICATION_FROM_EMAIL",
      emailId: null,
    };
  }

  const safeName = escapeHtml(employeeName);
  const text = [
    `Chào ${employeeName},`,
    "",
    "Admin đã gửi link kích hoạt tài khoản HR Portal cho bạn. Link có hiệu lực trong 1 giờ.",
    "Nếu bạn đã đặt mật khẩu trước đó, bạn cũng có thể đăng nhập trực tiếp để tiếp tục hồ sơ đang dang dở.",
    "",
    actionLink,
    "",
    "Nếu bạn không mong đợi email này, hãy liên hệ quản trị viên nội bộ.",
  ].join("\n");
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "[TL Concepts HR Portal] Link kích hoạt tài khoản mới",
        text,
        html: brandedEmailHtml({
          headerSubtitle: "Kích hoạt tài khoản nhân viên",
          bodyHtml: `<p style="margin:0 0 14px">Chào <strong>${safeName}</strong>,</p><p style="margin:0 0 14px;line-height:1.6">Admin đã gửi link kích hoạt tài khoản HR Portal cho bạn. Link có hiệu lực trong 1 giờ.</p><p style="margin:0 0 22px;line-height:1.6">Nếu bạn đã đặt mật khẩu trước đó, bạn cũng có thể đăng nhập trực tiếp để tiếp tục hồ sơ đang dang dở.</p>${brandedButton(actionLink, "Kích hoạt tài khoản")}`,
          footerNote: "Nếu bạn không mong đợi email này, hãy liên hệ quản trị viên nội bộ.",
        }),
      }),
    });
  } catch (error) {
    return {
      delivered: false,
      error: `Không kết nối được Resend: ${error instanceof Error ? error.message : "Lỗi không xác định"}`,
      emailId: null,
    };
  }

  const responseBody = await response.text();
  if (!response.ok) {
    return {
      delivered: false,
      error: `Resend trả về ${response.status}: ${responseBody.slice(0, 500)}`,
      emailId: null,
    };
  }

  let emailId: string | null = null;
  try {
    const parsed = JSON.parse(responseBody) as { id?: unknown };
    emailId = typeof parsed.id === "string" ? parsed.id : null;
  } catch {
    // A successful Resend response without JSON is still accepted for delivery.
  }
  return { delivered: true, error: null, emailId };
}
