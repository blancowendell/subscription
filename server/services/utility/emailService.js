const { SendEmailAsync } = require("../repository/mailer"); // ADJUST PATH

const appName = () => process.env._APP_NAME || "";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Builds a link into the client portal, e.g. PortalLink("/verify-email", { token })
const PortalLink = (path, params = {}) => {
  const base = String(process.env._CLIENT_PORTAL_URL || "").replace(/\/$/, "");
  const query = new URLSearchParams(params).toString();
  return `${base}${path}${query ? `?${query}` : ""}`;
};

// One layout for every system email.
// { greeting, paragraphs: [string], action: { label, url }, note }
// All text is escaped; pass plain text, not HTML.
const EmailLayout = ({ greeting, paragraphs = [], action, note }) => {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 12px;">${escapeHtml(p)}</p>`)
    .join("");

  const button = action
    ? `<p style="margin:20px 0;">
         <a href="${escapeHtml(action.url)}"
            style="background:#1677ff;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">
           ${escapeHtml(action.label)}
         </a>
       </p>
       <p style="margin:0 0 12px;font-size:12px;color:#888888;">
         If the button doesn't work, copy this link: ${escapeHtml(action.url)}
       </p>`
    : "";

  const noteHtml = note
    ? `<p style="margin:12px 0 0;font-size:12px;color:#888888;">${escapeHtml(note)}</p>`
    : "";

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;max-width:560px;">
      ${greeting ? `<p style="margin:0 0 12px;">${escapeHtml(greeting)}</p>` : ""}
      ${body}
      ${button}
      ${noteHtml}
      <p style="margin:24px 0 0;">${escapeHtml(appName())}</p>
    </div>`;
};

// Sends a templated email. Resolves on success, rejects if sending fails.
const SendTemplateEmail = (to, subject, content) =>
  SendEmailAsync(to, `${subject} - ${appName()}`, EmailLayout(content));

// ==========================================
// Ready-made emails
// ==========================================

const SendVerifyEmail = (to, fullname, token, ttlHours) =>
  SendTemplateEmail(to, "Verify your email", {
    greeting: `Hi ${fullname},`,
    paragraphs: ["Please verify your email to activate your account."],
    action: { label: "Verify email", url: PortalLink("/verify-email", { token }) },
    note: `This link expires in ${ttlHours} hour${ttlHours === 1 ? "" : "s"}.`,
  });

const SendResetPasswordEmail = (to, fullname, token, ttlHours) =>
  SendTemplateEmail(to, "Reset your password", {
    greeting: `Hi ${fullname},`,
    paragraphs: ["We received a request to reset your password."],
    action: { label: "Reset password", url: PortalLink("/reset-password", { token }) },
    note: `This link expires in ${ttlHours} hour${ttlHours === 1 ? "" : "s"}. If you didn't ask for this, you can ignore this email.`,
  });

module.exports = {
  escapeHtml,
  PortalLink,
  EmailLayout,
  SendTemplateEmail,
  SendVerifyEmail,
  SendResetPasswordEmail,
};