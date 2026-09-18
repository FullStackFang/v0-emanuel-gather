'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { parseEventForm } from '@/lib/event-input'

// Create-event form state. Success never returns a value: we redirect to the
// dashboard, so the only state the client renders is a validation/DB error.
export type CreateEventState = { ok: false; error: string } | null

export async function createEvent(
  _prev: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const parsed = parseEventForm(formData)
  if (!parsed.ok) return { ok: false, error: parsed.error }
  const { title, description, location, category, startsAt, capacity, priceCents, publish } =
    parsed.value

  // Insert the event with the RLS client: events_insert_own enforces
  // host_id = auth.uid(), so a host can never create an event owned by someone else.
  const { data: created, error: insErr } = await supabase
    .from('events')
    .insert({
      host_id: user.id,
      title,
      description,
      location,
      starts_at: startsAt,
      category,
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
