/**
 * Branded HTML email templates for The Watchmen.
 *
 * Self-contained, table-based layouts — no external CSS. Renders well in
 * Gmail, Apple Mail, Outlook. Dark background with bronze-gold accents to
 * match the app.
 */

const GOLD = "#c59852";
const GOLD_DEEP = "#b68d40";
const INK_900 = "#0a0a0b";
const INK_800 = "#141416";
const INK_700 = "#1d1d20";
const INK_200 = "#a3a3a8";
const WHITE = "#ffffff";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shell(opts: {
  preheader: string;
  bodyHtml: string;
  footerNote?: string;
}): string {
  const { preheader, bodyHtml, footerNote } = opts;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark only" />
<meta name="supported-color-schemes" content="dark" />
<title>The Watchmen</title>
</head>
<body style="margin:0;padding:0;background:${INK_900};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${WHITE};">
<span style="display:none !important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${INK_900};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${INK_800};border:1px solid rgba(255,255,255,0.06);border-radius:16px;overflow:hidden;">
      <!-- Header -->
      <tr><td style="padding:28px 28px 8px 28px;text-align:center;">
        <div style="font-size:10px;letter-spacing:0.32em;text-transform:uppercase;color:${GOLD};font-weight:600;">The Watchmen</div>
        <div style="font-size:11px;color:${INK_200};margin-top:4px;letter-spacing:0.18em;text-transform:uppercase;">Got Your 6</div>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:8px 28px 28px 28px;color:${WHITE};font-size:15px;line-height:1.55;">
        ${bodyHtml}
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:20px 28px 28px 28px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;color:${INK_200};font-size:11px;line-height:1.5;">
        ${footerNote ? `<div style="margin-bottom:10px;">${footerNote}</div>` : ""}
        <div>The Watchmen · A private brotherhood network · gy6.me</div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;"><tr><td style="background:${GOLD};border-radius:10px;">
    <a href="${esc(href)}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:600;color:${INK_900};text-decoration:none;letter-spacing:0.02em;">${esc(label)}</a>
  </td></tr></table>`;
}

// -- Admin: new signup awaiting approval -----------------------------------

export function adminNewSignupTemplate(opts: {
  newMemberName: string;
  newMemberEmail: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const { newMemberName, newMemberEmail, appUrl } = opts;
  const approveUrl = `${appUrl}/admin/pending`;
  return {
    subject: `New signup: ${newMemberName} is waiting for approval`,
    text: `${newMemberName} (${newMemberEmail}) just signed up and is waiting for approval.\n\nReview at: ${approveUrl}`,
    html: shell({
      preheader: `${newMemberName} is waiting for approval`,
      bodyHtml: `
        <h1 style="margin:8px 0 14px 0;font-size:22px;font-weight:600;color:${WHITE};">New member awaiting approval</h1>
        <p style="margin:0 0 6px 0;color:${INK_200};">A new brother just signed up:</p>
        <div style="background:${INK_700};border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 16px;margin:14px 0;">
          <div style="font-size:16px;font-weight:600;color:${WHITE};">${esc(newMemberName)}</div>
          <div style="font-size:13px;color:${INK_200};margin-top:2px;">${esc(newMemberEmail)}</div>
        </div>
        <p style="margin:14px 0 0 0;color:${INK_200};">Review their profile and approve or reject them.</p>
        ${button(approveUrl, "Review pending members")}
      `,
    }),
  };
}

// -- New member: welcome after approval ------------------------------------

export function welcomeApprovedTemplate(opts: {
  fullName: string;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const { fullName, appUrl } = opts;
  const firstName = fullName.split(" ")[0] || fullName;
  const homeUrl = `${appUrl}/app/home`;
  return {
    subject: `Welcome to The Watchmen, ${firstName}`,
    text: `${firstName},\n\nYou're in. The Watchmen network is now open to you.\n\nGot Your 6.\n\nOpen the app: ${homeUrl}`,
    html: shell({
      preheader: `You're in, ${firstName}. Welcome to The Watchmen.`,
      bodyHtml: `
        <h1 style="margin:8px 0 14px 0;font-size:24px;font-weight:600;color:${WHITE};">You're in, ${esc(firstName)}.</h1>
        <p style="margin:0 0 14px 0;">Your account has been approved. Welcome to The Watchmen — a private network of brothers who've got each other's six.</p>
        <p style="margin:0 0 14px 0;">Here's what's worth doing first:</p>
        <ul style="margin:0 0 14px 18px;padding:0;color:${WHITE};">
          <li style="margin-bottom:8px;">Finish your profile — add your Venmo, CashApp, Instagram, and a photo.</li>
          <li style="margin-bottom:8px;">Browse upcoming events and meetups.</li>
          <li style="margin-bottom:8px;">Introduce yourself in the Feed.</li>
        </ul>
        ${button(homeUrl, "Open the app")}
        <p style="margin:18px 0 0 0;color:${GOLD};font-size:13px;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;">Got Your 6</p>
      `,
    }),
  };
}

// -- Event reminder --------------------------------------------------------

export function eventReminderTemplate(opts: {
  fullName: string;
  eventTitle: string;
  eventStartLabel: string; // already formatted, e.g. "Fri, Jun 12 · 7:00 PM"
  eventLocation?: string | null;
  eventUrl: string;
}): { subject: string; html: string; text: string } {
  const { fullName, eventTitle, eventStartLabel, eventLocation, eventUrl } = opts;
  const firstName = fullName.split(" ")[0] || fullName;
  const where = eventLocation ? ` at ${eventLocation}` : "";
  return {
    subject: `Reminder: ${eventTitle} — ${eventStartLabel}`,
    text: `${firstName},\n\nQuick reminder — ${eventTitle} is coming up.\n\nWhen: ${eventStartLabel}${where}\n\nDetails: ${eventUrl}`,
    html: shell({
      preheader: `${eventTitle} — ${eventStartLabel}`,
      bodyHtml: `
        <h1 style="margin:8px 0 14px 0;font-size:22px;font-weight:600;color:${WHITE};">${esc(eventTitle)}</h1>
        <div style="background:${INK_700};border:1px solid ${GOLD_DEEP}40;border-radius:12px;padding:16px;margin:14px 0;">
          <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${GOLD};font-weight:600;margin-bottom:6px;">When</div>
          <div style="font-size:15px;color:${WHITE};font-weight:500;">${esc(eventStartLabel)}</div>
          ${eventLocation ? `
            <div style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${GOLD};font-weight:600;margin:14px 0 6px 0;">Where</div>
            <div style="font-size:14px;color:${WHITE};">${esc(eventLocation)}</div>
          ` : ""}
        </div>
        <p style="margin:14px 0 0 0;">${esc(firstName)}, see you there.</p>
        ${button(eventUrl, "View event")}
      `,
    }),
  };
}

// -- Calendar invite (used with .ics attachment) ---------------------------

export function calendarInviteTemplate(opts: {
  fullName: string;
  eventTitle: string;
  eventStartLabel: string;
  eventLocation?: string | null;
  eventUrl: string;
}): { subject: string; html: string; text: string } {
  const { fullName, eventTitle, eventStartLabel, eventLocation, eventUrl } = opts;
  const firstName = fullName.split(" ")[0] || fullName;
  return {
    subject: `Calendar invite: ${eventTitle}`,
    text: `${firstName},\n\nHere's a calendar invite for ${eventTitle}.\n\nWhen: ${eventStartLabel}${eventLocation ? `\nWhere: ${eventLocation}` : ""}\n\nDetails: ${eventUrl}\n\nOpen the attached .ics file to add it to your calendar.`,
    html: shell({
      preheader: `Add ${eventTitle} to your calendar`,
      bodyHtml: `
        <h1 style="margin:8px 0 14px 0;font-size:22px;font-weight:600;color:${WHITE};">Add to calendar</h1>
        <p style="margin:0 0 14px 0;">${esc(firstName)}, here's the calendar invite for <strong style="color:${WHITE};">${esc(eventTitle)}</strong>.</p>
        <div style="background:${INK_700};border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;margin:14px 0;">
          <div style="font-size:14px;color:${WHITE};">${esc(eventStartLabel)}</div>
          ${eventLocation ? `<div style="font-size:13px;color:${INK_200};margin-top:4px;">${esc(eventLocation)}</div>` : ""}
        </div>
        <p style="margin:0 0 14px 0;color:${INK_200};font-size:13px;">Open the attached <code style="background:${INK_700};padding:2px 6px;border-radius:4px;font-size:12px;">invite.ics</code> file to add this to Apple Calendar, Google Calendar, or Outlook.</p>
        ${button(eventUrl, "View event in app")}
      `,
    }),
  };
}

// -- .ics file builder ------------------------------------------------------

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toICSDate(d: Date): string {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function icsEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildICS(opts: {
  uid: string;
  title: string;
  description?: string;
  location?: string | null;
  start: Date;
  end: Date;
  url?: string;
}): string {
  const { uid, title, description, location, start, end, url } = opts;
  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Watchmen//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@gy6.me`,
    `DTSTAMP:${toICSDate(now)}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${icsEscape(title)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`);
  if (location) lines.push(`LOCATION:${icsEscape(location)}`);
  if (url) lines.push(`URL:${icsEscape(url)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  // CRLF line endings per RFC 5545.
  return lines.join("\r\n");
}
