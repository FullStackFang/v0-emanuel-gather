import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/session'

// Next 16 renamed middleware.ts -> proxy.ts. Runs before routes render.
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Run on everything except Next internals and static image assets, so auth
    // cookie refresh happens on real navigations without blocking assets.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
