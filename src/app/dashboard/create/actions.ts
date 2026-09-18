'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Create-event form state. Success never returns a value: we redirect to the
// dashboard, so the only state the client renders is a validation/DB error.
export type CreateEventState = { ok: false; error: string } | null

const TZ = 'America/New_York' // the whole app displays and enters times in NY.
// Capacity is required on ticket_types and enforced by a DB oversell check.
// "No limit" isn't a first-class concept yet, so a blank capacity stores a
// ceiling high enough to never bind for a temple event.
const NO_LIMIT = 100_000
const MAX_TITLE = 200

// Interpret a wall-clock date+time as America/New_York and return the matching
// UTC instant. The offset is read at the entered moment, so DST is handled
// (only the ~1h/year ambiguous fold is approximate, which is acceptable here).
function nyWallTimeToUtcISO(dateStr: string, timeStr: string): string | null {
  if (!dateStr || !timeStr) return null
  const wallAsUtcMs = Date.parse(`${dateStr}T${timeStr}:00Z`)
  if (Number.isNaN(wallAsUtcMs)) return null
  const guess = new Date(wallAsUtcMs)
  const utcEcho = new Date(guess.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()
  const tzEcho = new Date(guess.toLocaleString('en-US', { timeZone: TZ })).getTime()
  const offsetMs = tzEcho - utcEcho // negative for NY (UTC-4/-5)
  return new Date(wallAsUtcMs - offsetMs).toISOString()
}

export async function createEvent(
  _prev: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const location = String(formData.get('location') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()
  const date = String(formData.get('date') ?? '')
  const time = String(formData.get('time') ?? '')
  const capacityRaw = String(formData.get('capacity') ?? '').trim()
  const priceMode = String(formData.get('priceMode') ?? 'free')
  const priceRaw = String(formData.get('priceAmount') ?? '').trim()
  const publish = String(formData.get('publish') ?? 'published') === 'published'

  if (!title) return { ok: false, error: 'Please give the event a name.' }
  if (title.length > MAX_TITLE)
    return { ok: false, error: `Event name must be ${MAX_TITLE} characters or fewer.` }

  const startsAt = nyWallTimeToUtcISO(date, time)
  if (!startsAt) return { ok: false, error: 'Please choose a start date and time.' }

  let capacity = NO_LIMIT
  if (capacityRaw) {
    const n = Number.parseInt(capacityRaw, 10)
    if (!Number.isInteger(n) || n < 1)
      return { ok: false, error: 'Capacity must be a whole number of 1 or more.' }
    capacity = n
  }

  let priceCents = 0
  if (priceMode === 'paid') {
    const dollars = Number.parseFloat(priceRaw)
    if (!Number.isFinite(dollars) || dollars <= 0)
      return { ok: false, error: 'Enter a ticket price greater than $0, or choose Free.' }
    priceCents = Math.round(dollars * 100)
  }

  // Insert the event with the RLS client: events_insert_own enforces
  // host_id = auth.uid(), so a host can never create an event owned by someone else.
  const { data: created, error: insErr } = await supabase
    .from('events')
    .insert({
      host_id: user.id,
      title,
      description: description || null,
      location: location || null,
      starts_at: startsAt,
      category: category || null,
      status: publish ? 'published' : 'draft',
    })
    .select('id')
    .single()
  if (insErr) throw insErr

  // An event needs at least one ticket type to be bookable; a free event is a
  // $0 type. If this fails, roll back the event so we never leave a dead shell.
  const { error: ttErr } = await supabase.from('ticket_types').insert({
    event_id: created.id,
    name: 'General Admission',
    price_cents: priceCents,
    currency: 'usd',
    capacity,
  })
  if (ttErr) {
    await supabase.from('events').delete().eq('id', created.id)
    throw ttErr
  }

  revalidatePath('/dashboard')
  if (publish) revalidatePath('/')
  redirect('/dashboard')
}
