import { Resend } from "resend";
import { NextResponse } from "next/server";

type ContactPayload = {
  name: string;
  email: string;
  msg: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<ContactPayload> | null;

  const name = body?.name?.trim();
  const email = body?.email?.trim();
  const msg = body?.msg?.trim();

  if (!name || !email || !msg || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Datos de contacto inválidos." },
      { status: 400 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: "cegv@hotmail.es",
    replyTo: email,
    subject: `Nuevo mensaje de contacto — Arcade Vault (${name})`,
    text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${msg}`,
    html: `<p><strong>Nombre:</strong> ${name}</p><p><strong>Correo:</strong> ${email}</p><p><strong>Mensaje:</strong></p><p>${msg.replace(/\n/g, "<br/>")}</p>`,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "No se pudo enviar el mensaje." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
