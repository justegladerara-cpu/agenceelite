import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_KEY as string

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'hse-rara-mercia' },
})

export const BUCKET = 'hse'

/** Message d'erreur lisible en français. */
export function messageErreur(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e)
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect.'
  if (/Email not confirmed/i.test(m)) return "Votre e-mail n'est pas encore confirmé : ouvrez le lien reçu par e-mail."
  if (/User already registered/i.test(m)) return 'Un compte existe déjà avec cet e-mail : connectez-vous.'
  if (/Password should be/i.test(m)) return 'Le mot de passe doit contenir au moins 6 caractères.'
  if (/Signups not allowed/i.test(m)) return "La création de compte est fermée. Demandez un compte à l'administrateur."
  if (/row-level security|permission denied/i.test(m)) return "Vous n'avez pas le droit de faire cette action."
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Pas de connexion internet. Réessayez.'
  return m
}
