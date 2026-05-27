/**
 * High-level email actions for The Watchmen.
 *
 * Each function is fail-soft: if Resend isn't configured (no API key in env)
 * or the send fails, we log and return — we never throw from a hot path
 * like signup or approval. Email is best-effort.
 */

import { getResend, MAIL_FROM, MAIL_REPLY_TO, APP_URL } from "./client";
import {
  adminNewSignupTemplate,
  welcomeApprovedTemplate,
  eventReminderTemplate,
  calendarInviteTemplate,
  buildICS,
} from "./templates";

type SendResult = { ok: true; id?: string } | { ok: false; error: string };

async function send(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: string; contentType?: string }[];
}): Promise<SendResult> {
  const resend = getResend();
  if (!resend) {
    console.warn("[mail] RESEND_API_KEY not set — skipping send", {
      to: opts.to,
      subject: opts.subject,
    });
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: MAIL_FROM,
      to: opts.to,
      replyTo: MAIL_REPLY_TO,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      attachments: opts.attachments,
    });
    if (error) {
      console.error("[mail] resend error", error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[mail] send exception", msg);
    return { ok: false, error: msg };
  }
}

/* ----------------------------- Public API ----------------------------- */

/** Notify all admins that a new member is awaiting approval. */
export async function notifyAdminNewSignup(opts: {
  adminEmails: string[];
  newMemberName: string;
  newMemberEmail: string;
}): Promise<SendResult> {
  if (opts.adminEmails.length === 0) {
    return { ok: false, error: "No admin emails to notify" };
  }
  const tpl = adminNewSignupTemplate({
    newMemberName: opts.newMemberName,
    newMemberEmail: opts.newMemberEmail,
    appUrl: APP_URL,
  });
  return send({
    to: opts.adminEmails,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });
}

/** Welcome a member after an admin approves them. */
export async function welcomeApproved(opts: {
  to: string;
  fullName: string;
}): Promise<SendResult> {
  const tpl = welcomeApprovedTemplate({
    fullName: opts.fullName,
    appUrl: APP_URL,
  });
  return send({
    to: opts.to,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });
}

/** Reminder email for an upcoming event (no .ics attachment). */
export async function eventReminder(opts: {
  to: string;
  fullName: string;
  eventId: string;
  eventTitle: string;
  eventStartLabel: string;
  eventLocation?: string | null;
}): Promise<SendResult> {
  const tpl = eventReminderTemplate({
    fullName: opts.fullName,
    eventTitle: opts.eventTitle,
    eventStartLabel: opts.eventStartLabel,
    eventLocation: opts.eventLocation,
    eventUrl: `${APP_URL}/app/events/${opts.eventId}`,
  });
  return send({
    to: opts.to,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });
}

/** Calendar invite — includes an .ics attachment so the recipient can add to their calendar. */
export async function calendarInvite(opts: {
  to: string;
  fullName: string;
  eventId: string;
  eventTitle: string;
  eventDescription?: string;
  eventStartLabel: string;
  eventStart: Date;
  eventEnd: Date;
  eventLocation?: string | null;
}): Promise<SendResult> {
  const eventUrl = `${APP_URL}/app/events/${opts.eventId}`;
  const tpl = calendarInviteTemplate({
    fullName: opts.fullName,
    eventTitle: opts.eventTitle,
    eventStartLabel: opts.eventStartLabel,
    eventLocation: opts.eventLocation,
    eventUrl,
  });
  const ics = buildICS({
    uid: opts.eventId,
    title: opts.eventTitle,
    description: opts.eventDescription,
    location: opts.eventLocation,
    start: opts.eventStart,
    end: opts.eventEnd,
    url: eventUrl,
  });
  // Resend expects base64 content for attachments.
  const icsB64 = Buffer.from(ics, "utf8").toString("base64");
  return send({
    to: opts.to,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    attachments: [
      {
        filename: "invite.ics",
        content: icsB64,
        contentType: "text/calendar; charset=utf-8; method=PUBLISH",
      },
    ],
  });
}
