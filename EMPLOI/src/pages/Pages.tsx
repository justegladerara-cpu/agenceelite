import { Cascade, CascadeElement } from '../components/anim'
import { Link } from 'react-router-dom'
import { BadgeCheck, ClipboardCheck, FileSearch, Handshake, Send } from 'lucide-react'
import { useApp } from '../lib/contexte'

export function Recruter() {
  const { profil } = useApp()
  const etapes = [
    { i: Send, t: 'Vous décrivez votre besoin', d: 'Créez votre compte entreprise et déposez votre offre. Agence Elite la vérifie et la publie au Congo ou en France.' },
    { i: ClipboardCheck, t: 'Les candidats passent nos tests', d: 'Excel, langues, calcul, vente, comptabilité, sécurité… Vous choisissez les tests demandés pour le poste.' },
    { i: FileSearch, t: 'Nous trions pour vous', d: 'Notre équipe étudie les CV, appelle les candidats et ne garde que les meilleurs profils.' },
    { i: Handshake, t: 'Vous recevez des CV qualifiés', d: 'Chaque profil arrive dans votre espace avec le CV, les coordonnées, les résultats de tests et notre avis.' },
  ]
  return (
    <>
      <section className="bg-encre-800 text-white">
        <div className="conteneur py-16 md:py-20 max-w-3xl">
          <p className="text-rouge-300 font-semibold">Entreprises</p>
          <h1 className="mt-2 text-4xl font-extrabold leading-tight">Recrutez plus vite, avec des candidats déjà testés</h1>
          <p className="mt-4 text-lg text-encre-100/85">Agence Elite publie vos offres, fait passer les tests et vous envoie seulement les CV qui correspondent. Vous payez uniquement les profils qualifiés que vous recevez.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={profil?.role === 'entreprise' ? '/espace-entreprise' : '/inscription?type=entreprise'} className="btn-blanc">Déposer une offre</Link>
            <a href="https://wa.me/242055222968" className="btn bg-[#25D366] text-encre-900 hover:brightness-95">Nous écrire sur WhatsApp</a>
          </div>
        </div>
      </section>
      <section className="conteneur py-14">
        <h2 className="text-2xl font-extrabold text-encre-800">Comment ça marche</h2>
        <Cascade className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4" pas={0.1}>
          {etapes.map(({ i: I, t, d }, n) => (
            <CascadeElement key={t} className="carte p-5 transition duration-300 hover:-translate-y-1">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-rouge-50 text-rouge-600"><I size={20} /></span>
              <h3 className="mt-3 font-bold text-encre-800">{n + 1}. {t}</h3>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </CascadeElement>
          ))}
        </Cascade>
        <div className="mt-10 carte p-6 md:p-8 grid gap-6 md:grid-cols-2 items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-encre-800">Un tarif simple</h2>
            <p className="mt-2 text-slate-600">Publier une offre est gratuit. Vous payez chaque CV qualifié reçu, après tri et tests. Pour un recrutement complet (chasse, entretiens, intégration), demandez-nous un devis.</p>
          </div>
          <ul className="space-y-2 text-slate-700">
            {['Publication de l’offre offerte', 'Tests de compétences inclus', 'Paiement par CV qualifié reçu', 'Paiement Mobile Money, virement ou espèces'].map((x) => (
              <li key={x} className="flex gap-2"><BadgeCheck className="text-rouge-600 shrink-0" size={20} />{x}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}

export function Introuvable() {
  return (
    <div className="conteneur py-20 text-center">
      <h1 className="text-3xl font-extrabold text-encre-800">Page introuvable</h1>
      <p className="mt-2 text-slate-600">Cette adresse n’existe pas ou plus.</p>
      <Link to="/offres" className="btn-primaire mt-6">Voir les offres</Link>
    </div>
  )
}
