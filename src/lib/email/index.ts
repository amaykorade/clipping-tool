/**
 * Email notification system.
 * Uses a pluggable transport — defaults to console.log in dev,
 * set EMAIL_PROVIDER=resend and RESEND_API_KEY for production.
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function sendViaResend(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Kllivo <notifications@kllivo.com>",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[Email] Resend error:", res.status, text);
    throw new Error(`Email send failed: ${res.status}`);
  }
}

async function sendViaConsole(payload: EmailPayload): Promise<void> {
  console.log("[Email] (dev) Would send:", payload.subject, "to", payload.to);
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  try {
    if (process.env.EMAIL_PROVIDER === "resend") {
      await sendViaResend(payload);
    } else {
      await sendViaConsole(payload);
    }
  } catch (e) {
    console.error("[Email] Failed to send:", e);
    // Don't throw — email failures should not break the main flow
  }
}

// --- Notification templates ---

export async function sendVideoReadyEmail(email: string, videoTitle: string, videoId: string): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  await sendEmail({
    to: email,
    subject: `Your video "${videoTitle}" is ready`,
    html: `
      <h2>Your video is ready!</h2>
      <p>"<strong>${videoTitle}</strong>" has been transcribed and clips have been generated.</p>
      <p><a href="${baseUrl}/videos/${videoId}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:white;text-decoration:none;border-radius:8px;">View clips</a></p>
      <p style="color:#64748b;font-size:13px;">— Kllivo</p>
    `,
  });
}

export async function sendClipsRenderedEmail(email: string, videoTitle: string, videoId: string, clipCount: number): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  await sendEmail({
    to: email,
    subject: `${clipCount} clips rendered for "${videoTitle}"`,
    html: `
      <h2>Your clips are ready!</h2>
      <p>${clipCount} clip${clipCount !== 1 ? "s" : ""} for "<strong>${videoTitle}</strong>" ${clipCount !== 1 ? "have" : "has"} been rendered and ${clipCount !== 1 ? "are" : "is"} ready to download.</p>
      <p><a href="${baseUrl}/videos/${videoId}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:white;text-decoration:none;border-radius:8px;">Download clips</a></p>
      <p style="color:#64748b;font-size:13px;">— Kllivo</p>
    `,
  });
}

export async function sendQuotaWarningEmail(email: string, used: number, limit: number): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  await sendEmail({
    to: email,
    subject: `You've used ${used}/${limit} videos`,
    html: `
      <h2>Quota update</h2>
      <p>You've used <strong>${used} of ${limit}</strong> videos on your current plan.</p>
      ${used >= limit ? '<p>You\'ve reached your limit. <a href="' + baseUrl + '/pricing">Upgrade your plan</a> to continue uploading.</p>' : '<p>Consider <a href="' + baseUrl + '/pricing">upgrading</a> if you need more.</p>'}
      <p style="color:#64748b;font-size:13px;">— Kllivo</p>
    `,
  });
}
