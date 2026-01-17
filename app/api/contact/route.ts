import { NextResponse } from "next/server";

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const message = String(body?.message ?? "").trim();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Please fill in all fields." }, { status: 400 });
    }
    if (!isEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.CONTACT_TO_EMAIL; // muratot79@gmail.com
    const from = process.env.CONTACT_FROM_EMAIL; // domain dogrulanmissa: EnglishMeter <no-reply@englishmeter.net>

    if (!apiKey || !to || !from) {
      return NextResponse.json(
        { error: "Mail settings are missing (env vars)." },
        { status: 500 }
      );
    }

    const subject = `EnglishMeter Contact: ${name}`;
    const text = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject,
        text,
      }),
    });

    const data = await r.json().catch(() => ({} as any));

    if (!r.ok) {
      return NextResponse.json(
        { error: data?.message || data?.error || "Email provider error." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}