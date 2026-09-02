// Shared branded wrapper for transactional emails sent via Resend. Keeps
// every outgoing email visually consistent with the payslip notification
// (the one branded email that was never flagged as landing in spam) instead
// of the bare <p> tags used elsewhere, which read as generic/spammy to mail
// filters.
export function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function brandedEmailHtml(options: {
  headerSubtitle: string;
  bodyHtml: string;
  footerNote?: string;
}) {
  const footer = options.footerNote ?? "Đây là email tự động từ TL Concepts HR Portal.";
  return `<!doctype html>
<html lang="vi"><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#1e293b">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:#f1f5f9"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <tr><td style="padding:22px 28px;background:#176363;color:#fff"><strong style="font-size:18px">TL Concepts HR Portal</strong><div style="margin-top:5px;font-size:12px;color:#ccfbf1">${escapeHtml(options.headerSubtitle)}</div></td></tr>
      <tr><td style="padding:28px">${options.bodyHtml}</td></tr>
      <tr><td style="padding:16px 28px;background:#f8fafc;color:#64748b;font-size:11px;line-height:1.5">${escapeHtml(footer)}</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export function brandedButton(href: string, label: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:11px 18px;border-radius:10px;background:#e7533a;color:#fff;text-decoration:none;font-weight:700">${escapeHtml(label)}</a>`;
}
