// Absolute-URL helper. Emails and QR codes must carry absolute URLs (a recipient
// opens them off-site), so relative paths won't do. Resolution order:
//   1. NEXT_PUBLIC_SITE_URL   -- set this in prod to the canonical domain.
//   2. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL -- auto-set on Vercel deploys.
//   3. localhost dev fallback (matches `next dev -p 6175`).

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`
  return 'http://localhost:6175'
}

export function ticketUrl(token: string): string {
  return `${siteUrl()}/t/${token}`
}

export function ticketQrUrl(token: string): string {
  return `${siteUrl()}/t/${token}/qr.png`
}
