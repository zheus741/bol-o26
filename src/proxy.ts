import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export default async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff2)$).*)'],
}
