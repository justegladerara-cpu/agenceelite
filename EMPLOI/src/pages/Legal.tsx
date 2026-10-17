import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { marked } from 'marked'
import { Download, FileText, Printer, ScrollText } from 'lucide-react'
import { Chargement } from '../components/ui'
import { SOCIETE } from '../legal/societe'

// Textes publiés sur Elite Emploi : adresse → fichier Markdown de src/legal.
export const TEXTES_LEGAUX = [
  { chemin: '/cgu', fichier: 'conditions-generales-utilisation', court: 'Conditions d’utilisation' },
  { chemin: '/confidentialite', fichier: 'politique-de-confidentialite', court: 'Protection des données' },
  { chemin: '/conditions-recruteurs', fichier: 'conditions-recruteurs', court: 'Conditions recruteurs' },
  { chemin: '/reglement-tests', fichier: 'reglement-des-tests', court: 'Règlement des tests et points' },
  { chemin: '/non-discrimination', fichier: 'charte-non-discrimination', court: 'Charte de non-discrimination' },
] as const

const PUBLIE: Record<string, string> = { AE_REPRESENTANT: 'le représentant légal', AE_FONCTION: 'dirigeant' }
const fichiers = import.meta.glob('../legal/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>

function lire(brut: string) {
  const m = brut.match(/^---\n([\s\S]*?)\n---\n?/)
  const entete: Record<string, string> = {}
  if (m) for (const l of m[1].split('\n')) {
    const x = l.match(/^(\w+):\s*"?(.*?)"?\s*(#.*)?$/)
    if (x) entete[x[1]] = x[2]
  }
  let corps = m ? brut.slice(m[0].length) : brut
  corps = corps.replace(/\{\{\s*(AE_[A-Z]+)\s*\}\}/g, (_, k: string) => SOCIETE[k] ?? PUBLIE[k] ?? 'communiqué sur simple demande')
  return { entete, html: marked.parse(corps, { async: false }) as string }
}

export default function Legal() {
  const { pathname } = useLocation()
  const texte = TEXTES_LEGAUX.find((t) => t.chemin === pathname) ?? TEXTES_LEGAUX[0]
  const [brut, setBrut] = useState<string | null>(null)
  useEffect(() => {
    setBrut(null)
    const charge = fichiers[`../legal/${texte.fichier}.md`]
    if (charge) charge().then(setBrut)
    else setBrut('---\ntitre: "Document en préparation"\n---\nCe document sera publié très prochainement.')
    window.scrollTo(0, 0)
  }, [texte.fichier])
  const doc = useMemo(() => (brut ? lire(brut) : null), [brut])
  const pdf = `${import.meta.env.BASE_URL}documents/${texte.fichier}.pdf`

  return (
    <div className="conteneur py-10 md:py-14">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 self-start">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2"><ScrollText size={14} />Documents légaux</div>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 -mx-1 px-1">
            {TEXTES_LEGAUX.map((t) => (
              <Link key={t.chemin} to={t.chemin} className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-colors ${t.chemin === texte.chemin ? 'bg-encre-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}>{t.court}</Link>
            ))}
          </nav>
        </aside>
        {!doc ? <Chargement /> : (
          <motion.article key={texte.chemin} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                {doc.entete.reference && <div className="text-xs font-semibold text-rouge-600">{doc.entete.reference} · version {doc.entete.version}</div>}
                <h1 className="mt-1 text-2xl md:text-4xl font-extrabold text-encre-900 leading-tight">{doc.entete.titre}</h1>
                <div className="trait" />
              </div>
              <div className="flex gap-2 print:hidden">
                <a href={pdf} download className="btn-primaire"><Download size={16} />PDF</a>
                <button onClick={() => window.print()} className="btn-clair" aria-label="Imprimer"><Printer size={16} /></button>
              </div>
            </div>
            <div className="carte mt-6 p-5 md:p-10 texte-legal" dangerouslySetInnerHTML={{ __html: doc.html }} />
            <p className="mt-4 text-xs text-slate-500 flex items-center gap-1.5"><FileText size={13} />Une question sur ce document ? Écrivez à <a className="underline" href="mailto:contact@agence-elite.fr">contact@agence-elite.fr</a>.</p>
          </motion.article>
        )}
      </div>
    </div>
  )
}
