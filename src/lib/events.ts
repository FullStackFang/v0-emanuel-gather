import { createClient } from '@/lib/supabase/server'
import type { EventRecord } from '@/lib/event-format'

// Server-only event data access. Uses the SSR (anon) client, so Row-Level
// Security limits results to published events automatically.
// Pure display helpers/types live in ./event-format (client-safe) and are
// re-exported here for convenience on server surfaces.
export * from '@/lib/event-format'

const SELECT =
  'id,title,description,location,starts_at,status,category,ticket_types(id,name,price_cents,capacity,sold,held)'

export async function getPublishedEvents(): Promise<EventRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select(SELECT)
    .eq('status', 'published')
    .order('starts_at', { ascending: true })
  if (error) throw error
  return (data as EventRecord[]) ?? []
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getEvent(id: string): Promise<EventRecord | null> {
  // Ids come from the URL; a non-UUID can never match, so treat it as "not found"
  // rather than letting Postgres raise on invalid uuid syntax.
  if (!UUID_RE.test(id)) return null
  const supabase = await createClient()
  const { data, error } = await supabase.from('events').select(SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return (data as EventRecord | null) ?? null
}
