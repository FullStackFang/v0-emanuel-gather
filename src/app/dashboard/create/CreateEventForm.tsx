'use client'

import { EventForm } from '@/components/EventForm'
import { createEvent } from './actions'

export function CreateEventForm() {
  return <EventForm action={createEvent} submitLabel="Create event" pendingLabel="Creating…" />
}
