// GET /t/<token>/qr.png -- streams the ticket's QR as a PNG. The email <img> and
// the ticket page point here (email clients strip data: URIs). The code encodes
// only the absolute ticket URL, which is derived purely from the token, so no DB
// lookup is needed and no PII is embedded. A malformed token 404s.

import { isWellFormedToken } from '@/lib/ticket-token'
import { qrPng } from '@/lib/qr'
import { ticketUrl } from '@/lib/site-url'

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  if (!isWellFormedToken(token)) return new Response('Not found', { status: 404 })

  const png = await qrPng(ticketUrl(token))
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      // The QR for a token never changes (it encodes the fixed ticket URL), so it
      // is safely cacheable; the URL already carries the token as its key.
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
}
