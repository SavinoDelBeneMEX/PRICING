import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL || "notificaciones@savinodelbene.mx";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function sendMail(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn(`[notifications] RESEND_API_KEY no configurada, se omite envío a ${to}: ${subject}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("[notifications] error enviando correo", err);
  }
}

function wrap(title: string, body: string, ctaHref?: string, ctaLabel?: string) {
  return `
  <div style="font-family: 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto;">
    <div style="background:#132a4c; padding:20px 24px; border-bottom:4px solid #c9a227;">
      <span style="color:#fff; font-size:18px; font-weight:700;">Portal de Pricing SBM</span>
    </div>
    <div style="padding:24px; color:#1c2536;">
      <h2 style="margin-top:0;">${title}</h2>
      <p style="line-height:1.5;">${body}</p>
      ${
        ctaHref
          ? `<a href="${ctaHref}" style="display:inline-block; margin-top:16px; background:#132a4c; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none;">${ctaLabel}</a>`
          : ""
      }
    </div>
  </div>`;
}

export async function notifyPricingNuevaSolicitud(to: string, folio: string, servicioId: string) {
  await sendMail(
    to,
    `Nueva solicitud de pricing — ${folio}`,
    wrap(
      "Nueva solicitud para cotizar",
      `El vendedor envió una nueva solicitud (folio ${folio}) que requiere cotización de Pricing.`,
      `${APP_URL}/pricing/solicitud/${servicioId}`,
      "Ver solicitud"
    )
  );
}

export async function notifyVendedorCotizacionLista(to: string, folio: string, solicitudId: string) {
  await sendMail(
    to,
    `Pricing ya cotizó tu solicitud — ${folio}`,
    wrap(
      "Cotización disponible",
      `Pricing subió la cotización para el folio ${folio}. Ya puedes calcular el markup y enviarla al cliente.`,
      `${APP_URL}/vendedor/solicitud/${solicitudId}`,
      "Ver solicitud"
    )
  );
}

export async function notifyPricingConfirmacionVendedor(to: string, folio: string, servicioId: string) {
  await sendMail(
    to,
    `Cliente aceptó la cotización — ${folio}`,
    wrap(
      "Confirmación del vendedor",
      `El cliente aceptó la cotización del folio ${folio}. Ya puedes invitar al proveedor operador.`,
      `${APP_URL}/pricing/solicitud/${servicioId}`,
      "Invitar proveedor"
    )
  );
}

export async function notifyProveedorInvitacion(to: string, folio: string, inviteToken: string) {
  await sendMail(
    to,
    `Invitación a subir documentación — SBM (${folio})`,
    wrap(
      "Te invitamos a registrar tu expediente",
      `Savino del Bene México te invita a crear tu cuenta de proveedor y subir la documentación requerida para el servicio del folio ${folio}.`,
      `${APP_URL}/proveedor/registro?token=${inviteToken}`,
      "Crear mi cuenta"
    )
  );
}

export async function notifyPricingDocumentosSubidos(to: string, folio: string, proveedorId: string) {
  await sendMail(
    to,
    `Proveedor subió su documentación — ${folio}`,
    wrap(
      "Documentación lista para revisión",
      `El proveedor del folio ${folio} terminó de subir su expediente. Legal ya fue notificado para revisarlo.`,
      `${APP_URL}/pricing`,
      "Ver en Pricing"
    )
  );
}

export async function notifyLegalExpedienteListo(to: string, folio: string, proveedorId: string) {
  await sendMail(
    to,
    `Expediente listo para revisión legal — ${folio}`,
    wrap(
      "Nuevo expediente por revisar",
      `El proveedor del folio ${folio} está listo para revisión de documentación legal.`,
      `${APP_URL}/legal/proveedor/${proveedorId}`,
      "Revisar expediente"
    )
  );
}

export async function notifyComentariosLegal(
  to: string,
  folio: string,
  proveedorId: string,
  esProveedor: boolean
) {
  await sendMail(
    to,
    `Legal dejó comentarios en tu expediente — ${folio}`,
    wrap(
      "Comentarios de Legal",
      `Legal revisó el expediente del folio ${folio} y dejó comentarios sobre uno o más documentos.`,
      esProveedor ? `${APP_URL}/proveedor` : `${APP_URL}/pricing`,
      "Ver expediente"
    )
  );
}

export async function notifyFinanzasAltaPendiente(to: string, folio: string, proveedorId: string) {
  await sendMail(
    to,
    `Expediente aprobado, listo para alta — ${folio}`,
    wrap(
      "Alta de proveedor pendiente",
      `Legal aprobó el expediente del folio ${folio}. Ya puedes darlo de alta en Finanzas.`,
      `${APP_URL}/finanzas/proveedor/${proveedorId}`,
      "Ver expediente"
    )
  );
}

export async function notifyAltaCompletada(to: string, folio: string) {
  await sendMail(
    to,
    `Alta completada — ${folio}`,
    wrap("Proveedor dado de alta", `Finanzas completó el alta del proveedor para el folio ${folio}. El ciclo quedó completo.`)
  );
}
