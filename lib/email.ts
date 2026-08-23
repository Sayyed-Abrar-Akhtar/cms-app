import { Resend } from "resend";

interface SendEditorInviteEmailOptions {
  to: string;
  organizationName: string;
  name?: string;
}

export type SendEmailResult = {
  success: boolean;
  error?: string;
};

export async function sendEditorInviteEmail({
  to,
  organizationName,
  name,
}: SendEditorInviteEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "CMS <cms@sayyedabrarakhtar.com.np>";

  if (!apiKey) {
    const msg = "RESEND_API_KEY environment variable is missing";
    console.error(`[email] ${msg}`);
    return { success: false, error: msg };
  }

  try {
    const resend = new Resend(apiKey);
    const subject = `You've been added to ${organizationName}`;

    const cleanName = name?.trim();
    const greeting = cleanName
      ? `Hi ${cleanName},`
      : `You've been invited to ${organizationName}`;

    const html = `
      <div style="font-family: sans-serif; line-height: 1.5; color: #111;">
        <h2>${greeting}</h2>
        <p>You have been added as an editor for <strong>${organizationName}</strong> on the CMS.</p>
        <p>You can log in to your dashboard to start managing content:</p>
        <p><a href="https://cms.sayyedabrarakhtar.com.np/login" style="color: #0066cc;">Log in to CMS Dashboard</a></p>
        <br />
        <p style="font-size: 12px; color: #666;">If you were not expecting this invitation, you can safely ignore this email.</p>
      </div>
    `.trim();

    const text = `${greeting}

You have been added as an editor for ${organizationName} on the CMS.

You can log in to your dashboard at:
https://cms.sayyedabrarakhtar.com.np/login

If you were not expecting this invitation, you can safely ignore this email.`.trim();

    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[email] Resend API error:", error);
      return { success: false, error: error.message || "Failed to send email via Resend" };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error sending email";
    console.error("[email] Exception while sending email:", err);
    return { success: false, error: errorMessage };
  }
}
