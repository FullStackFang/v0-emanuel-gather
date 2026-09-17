// Email transport. Provider-agnostic seam so paid checkout, reminders, etc. can
// reuse it, and so the ticket flow is testable before Resend is provisioned.
//
//   * RESEND_API_KEY + EMAIL_FROM set  -> send for real via Resend.
//   * otherwise                        -> dev transport: render to HTML, log, and
//                                         write a preview file to ./.emails (gitignored).
//
// The dev transport is a stand-in for a not-yet-provisioned provider, swapped by
// setting env -- NOT a permanent mock. SERVER-ONLY (uses node:fs and secrets);
// never import from a Client Component.

import { render } from '@react-email/render'
import type { ReactElement } from 'react'

export type SendResult = { id: string | null; delivered: boolean; previewPath?: string }

export async function sendEmail(args: {
  to: string
  subject: string
  react: ReactElement
}): Promise<SendResult> {
  const { to, subject, react } = args
  const html = await render(react)
  const text = await render(react, { plainText: true })

  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from) return devDeliver({ to, subject, html })

  const { Resend } = await import('resend')
  const resend = new Resend(key)
  const { data, error } = await resend.emails.send({ from, to, subject, html, text })
  if (error) throw new Error(`Resend send failed: ${error.message}`)
  return { id: data?.id ?? null, delivered: true }
}

async function devDeliver(args: {
  to: string
  subject: string
  html: string
}): Promise<SendResult> {
  const { to, subject, html } = args
  try {
    const { writeFile, mkdir } = await import('node:fs/promises')
    const path = await import('node:path')
    const dir = path.join(process.cwd(), '.emails')
    await mkdir(dir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const safeTo = to.replace(/[^a-z0-9]+/gi, '_')
    const previewPath = path.join(dir, `${stamp}_${safeTo}.html`)
    await writeFile(previewPath, html, 'utf8')
    console.info(
      `[email:dev] RESEND_API_KEY not set — not sent. Preview written:\n  to: ${to}\n  subject: ${subject}\n  file: ${previewPath}`,
    )
    return { id: null, delivered: false, previewPath }
  } catch (err) {
    // Never let a dev-preview write failure break the user-facing flow.
    console.warn('[email:dev] preview write failed:', err)
    return { id: null, delivered: false }
  }
}
