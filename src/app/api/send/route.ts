import { NextResponse } from "next/server";
import { auth } from "@/auth";
import nodemailer from "nodemailer";

type Recipient = { name: string; email: string };

function personalize(template: string, r: Recipient) {
  return template
    .replace(/\{\{\s*name\s*\}\}/g, r.name ?? "")
    .replace(/\{\{\s*email\s*\}\}/g, r.email ?? "");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  const session = (await auth()) as any;
  if (!session?.user?.email || !session?.accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const recipients: Recipient[] = body.recipients ?? [];
  const subject: string = body.subject ?? "";
  const text: string = body.text ?? "";
  const html: string = body.html ?? "";
  const imageBase64: string | undefined = body.imageBase64;
  const imageMimeType: string | undefined = body.imageMimeType;
  const imageName: string | undefined = body.imageName;

  if (!recipients.length) {
    return NextResponse.json({ error: "No recipients" }, { status: 400 });
  }
  if (!subject.trim()) {
    return NextResponse.json({ error: "Subject required" }, { status: 400 });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: session.user.email,
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      refreshToken: session.refreshToken,
      accessToken: session.accessToken,
    },
  });

  const imageBuffer = imageBase64
    ? Buffer.from(imageBase64, "base64")
    : null;

  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (const r of recipients) {
    try {
      const mailSubject = personalize(subject, r);
      const mailText = personalize(text, r);
      const mailHtml = personalize(html, r);

      const attachments = imageBuffer
        ? [
            {
              filename: imageName || "image.png",
              content: imageBuffer,
              contentType: imageMimeType || "image/png",
              cid: "emailImage",
              contentDisposition: "inline" as const,
            },
          ]
        : [];

      await transporter.sendMail({
        from: session.user.email,
        to: r.email,
        subject: mailSubject,
        text: mailText,
        html: mailHtml,
        attachments,
      });

      results.push({ email: r.email, ok: true });
    } catch (e: any) {
      results.push({ email: r.email, ok: false, error: e?.message ?? String(e) });
    }
    // gentle rate limiting
    await sleep(300);
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  return NextResponse.json({ sent, failed, results });
}