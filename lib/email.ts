import { Resend } from "resend";

export interface SendEditorInviteEmailParams {
  to: string;
  organizationName: string;
}

export interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * Sends a transactional email notification to an editor when invited to an organization.
 */
export async function sendEditorInviteEmail({
  to,
  organizationName,
}: SendEditorInviteEmailParams): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not defined in environment variables. Email sending skipped.");
    return {
      success: false,
      error: "RESEND_API_KEY is missing.",
    };
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || "CMS <cms@sayyedabrarakhtar.com.np>";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const loginUrl = `${appUrl.replace(/\/$/, "")}/login`;

  const subject = `You've been added to ${organizationName} on the CMS`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #e4e4e7; padding: 24px;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #111114; border: 1px solid #26262b; border-radius: 6px; padding: 24px;">
          <h2 style="color: #34d399; margin-top: 0;">CMS Organization Invitation</h2>
          <p style="font-size: 14px; line-height: 1.5; color: #e4e4e7;">
            Hello,
          </p>
          <p style="font-size: 14px; line-height: 1.5; color: #e4e4e7;">
            You have been added as an editor for <strong>${organizationName}</strong> on the CMS.
          </p>
          <div style="margin: 24px 0;">
            <a href="${loginUrl}" style="background-color: #34d399; color: #0a0a0a; font-weight: bold; padding: 10px 18px; border-radius: 4px; text-decoration: none; display: inline-block; font-size: 13px;">
              Log in to CMS
            </a>
          </div>
          <p style="font-size: 12px; color: #71717a; margin-bottom: 0;">
            If you do not recognize this request, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
  `;

  const textBody = `Hello,\n\nYou have been added as an editor for ${organizationName} on the CMS.\n\nLog in here: ${loginUrl}\n`;

  try {
    const { error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html: htmlBody,
      text: textBody,
    });

    if (error) {
      console.error("Resend send email error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error sending email via Resend:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email.",
    };
  }
}
