import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Client com service_role — bypassa RLS. Usar SÓ em Server Actions/scripts
 * após validar permissão (ex: lançar placar oficial, rodar seed). Nunca no browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}
