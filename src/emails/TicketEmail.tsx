// The ticket email. React Email components render to broadly-compatible inline-styled
// HTML. Brand colors are hard-coded hex (email clients can't resolve CSS variables);
// they mirror src/app/tokens.css -- Deep Sapphire, Warm Gold, warm stone.
//
// Each ticket's QR is an <img> pointing at the absolute /t/<token>/qr.png route
// (email clients strip data: URIs), so the codes render in Gmail, Apple Mail, etc.

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

const INK = '#1c1917'
const SUBTLE = '#57534e'
const FAINT = '#78716c'
const SAPPHIRE = '#2d5a9e'
const SAPPHIRE_DARK = '#1e4785'
const CANVAS = '#fafaf9'
const CARD = '#ffffff'
const BORDER = '#e7e5e4'
const BRAND_TINT = '#eef4ff'

export type EmailTicket = {
  token: string
  qrUrl: string
  ticketUrl: string
  guestLabel: string
}

export type TicketEmailProps = {
  eventTitle: string
  dateLabel: string
  timeLabel: string
  location: string | null
  buyerName: string
  tickets: EmailTicket[]
}

const font =
  '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif'

export function TicketEmail({
  eventTitle,
  dateLabel,
  timeLabel,
  location,
  buyerName,
  tickets,
}: TicketEmailProps) {
  const many = tickets.length > 1
  const firstName = buyerName.trim().split(/\s+/)[0] || 'friend'

  return (
    <Html>
      <Head />
      <Preview>
        {`Your ${many ? `${tickets.length} tickets` : 'ticket'} for ${eventTitle}`}
      </Preview>
      <Body style={{ backgroundColor: CANVAS, margin: 0, padding: '24px 0', fontFamily: font }}>
        <Container style={{ width: '100%', maxWidth: 560, margin: '0 auto', padding: '0 16px' }}>
          <Text
            style={{
              margin: '0 0 4px',
              fontSize: 12,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: SAPPHIRE,
              fontWeight: 700,
            }}
          >
            Temple Emanu-El
          </Text>
          <Heading style={{ margin: '0 0 2px', fontSize: 24, lineHeight: 1.25, color: INK }}>
            You&rsquo;re going, {firstName}.
          </Heading>
          <Text style={{ margin: '0 0 20px', fontSize: 15, color: SUBTLE }}>
            {many
              ? `Here are your ${tickets.length} tickets. Show each QR code at the door.`
              : 'Here is your ticket. Show the QR code at the door.'}
          </Text>

          {/* Event card */}
          <Section
            style={{
              backgroundColor: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 14,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <Heading as="h2" style={{ margin: '0 0 12px', fontSize: 18, color: INK }}>
              {eventTitle}
            </Heading>
            <Row label="Date" value={dateLabel} />
            {timeLabel ? <Row label="Time" value={timeLabel} /> : null}
            {location ? <Row label="Location" value={location} /> : null}
          </Section>

          {/* One block per ticket */}
          {tickets.map((t, i) => (
            <Section
              key={t.token}
              style={{
                backgroundColor: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: 20,
                marginBottom: 12,
                textAlign: 'center' as const,
              }}
            >
              <Text
                style={{
                  margin: '0 0 12px',
                  fontSize: 12,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: FAINT,
                  fontWeight: 700,
                }}
              >
                {t.guestLabel}
              </Text>
              <Img
                src={t.qrUrl}
                width={220}
                height={220}
                alt={`QR code for ticket ${i + 1}`}
                style={{
                  display: 'block',
                  margin: '0 auto',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  backgroundColor: '#ffffff',
                }}
              />
              <Text style={{ margin: '12px 0 0', fontSize: 14 }}>
                <Link href={t.ticketUrl} style={{ color: SAPPHIRE_DARK, fontWeight: 600 }}>
                  View this ticket
                </Link>
              </Text>
            </Section>
          ))}

          <Section
            style={{
              backgroundColor: BRAND_TINT,
              borderRadius: 12,
              padding: '12px 16px',
              marginTop: 8,
            }}
          >
            <Text style={{ margin: 0, fontSize: 13, color: SAPPHIRE_DARK }}>
              Keep this email handy. Your QR {many ? 'codes are' : 'code is'} your entry, no app or
              account needed.
            </Text>
          </Section>

          <Hr style={{ borderColor: BORDER, margin: '24px 0 12px' }} />
          <Text style={{ margin: 0, fontSize: 12, color: FAINT, textAlign: 'center' as const }}>
            Temple Emanu-El · Come, let us gather.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
      <tbody>
        <tr>
          <td
            style={{
              padding: '2px 0',
              width: 96,
              fontSize: 11,
              letterSpacing: 0.6,
              textTransform: 'uppercase' as const,
              color: FAINT,
              fontWeight: 700,
              verticalAlign: 'top' as const,
            }}
          >
            {label}
          </td>
          <td style={{ padding: '2px 0', fontSize: 15, color: INK }}>{value}</td>
        </tr>
      </tbody>
    </table>
  )
}

export default TicketEmail
