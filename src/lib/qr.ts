// Server-side QR rendering via `qrcode` (MIT, zero runtime deps). Two outputs:
//   * qrSvg   -> crisp inline SVG for the ticket page (no extra request).
//   * qrPng   -> PNG buffer for the /t/<token>/qr.png route the email <img> points
//               at (Gmail and others strip data: URIs, so email needs a real URL).
//
// The encoded payload is always the absolute ticket URL; no PII is put in the code.

import QRCode from 'qrcode'

// 'M' (~15% recovery) is plenty for a screen-displayed URL and keeps the code low
// density (easier to scan). A quiet zone (margin) is required for reliable scans.
const OPTS = { errorCorrectionLevel: 'M', margin: 2 } as const

export function qrSvg(data: string): Promise<string> {
  return QRCode.toString(data, { ...OPTS, type: 'svg' })
}

export function qrPng(data: string, scale = 8): Promise<Buffer> {
  return QRCode.toBuffer(data, { ...OPTS, type: 'png', scale })
}
