import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_KEY as string

export const configure = Boolean(url && key)

export const supabase = createClient(url || 'https://exemple.supabase.co', key || 'cle-manquante', {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'elite-emploi' },
})

export const BUCKET_CV = 'emploi-cv'

/** Message d'erreur lisible en français. */
export function messageErreur(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e)
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect.'
  if (/Email not confirmed/i.test(m)) return "Votre e-mail n'est pas encore confirmé : ouvrez le lien reçu par e-mail."
  if (/User already registered/i.test(m)) return 'Un compte existe déjà avec cet e-mail : connectez-vous.'
  if (/Password should be/i.test(m)) return 'Le mot de passe doit contenir au moins 6 caractères.'
  if (/rate limit/i.test(m)) return 'Trop de tentatives. Patientez quelques minutes puis réessayez.'
  if (/duplicate key.*candidatures/i.test(m)) return 'Vous avez déjà postulé à cette offre.'
  if (/row-level security|permission denied/i.test(m)) return "Vous n'avez pas le droit de faire cette action."
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Pas de connexion internet. Réessayez.'
  if (/exceeded the maximum allowed size|Payload too large/i.test(m)) return 'Le fichier dépasse 5 Mo.'
  if (/mime type/i.test(m)) return 'Format refusé : envoyez un PDF ou un document Word.'
  return m
}
