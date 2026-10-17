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
      <section className="bg-marine-800 text-white">
        <div className="conteneur py-16 md:py-20 max-w-3xl">
          <p className="text-dore-400 font-semibold">Entreprises</p>
          <h1 className="mt-2 text-4xl font-extrabold leading-tight">Recrutez plus vite, avec des candidats déjà testés</h1>
          <p className="mt-4 text-lg text-marine-100/85">Agence Elite publie vos offres, fait passer les tests et vous envoie seulement les CV qui correspondent. Vous payez uniquement les profils qualifiés que vous recevez.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={profil?.role === 'entreprise' ? '/espace-entreprise' : '/inscription?type=entreprise'} className="btn-dore">Déposer une offre</Link>
            <a href="https://wa.me/242055222968" className="btn btn-clair">Nous écrire sur WhatsApp</a>
          </div>
        </div>
      </section>
      <section className="conteneur py-14">
        <h2 className="text-2xl font-extrabold text-marine-800">Comment ça marche</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {etapes.map(({ i: I, t, d }, n) => (
            <div key={t} className="carte p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-bordeaux-50 text-bordeaux-600"><I size={20} /></span>
              <h3 className="mt-3 font-bold text-marine-800">{n + 1}. {t}</h3>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 carte p-6 md:p-8 grid gap-6 md:grid-cols-2 items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-marine-800">Un tarif simple</h2>
            <p className="mt-2 text-slate-600">Publier une offre est gratuit. Vous payez chaque CV qualifié reçu, après tri et tests. Pour un recrutement complet (chasse, entretiens, intégration), demandez-nous un devis.</p>
          </div>
          <ul className="space-y-2 text-slate-700">
            {['Publication de l’offre offerte', 'Tests de compétences inclus', 'Paiement par CV qualifié reçu', 'Paiement Mobile Money, virement ou espèces'].map((x) => (
              <li key={x} className="flex gap-2"><BadgeCheck className="text-emerald-600 shrink-0" size={20} />{x}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}

export function Confidentialite() {
  return (
    <div className="conteneur py-12 max-w-3xl">
      <h1 className="text-3xl font-extrabold text-marine-800">Vos données personnelles</h1>
      <div className="carte mt-6 p-6 md:p-8 space-y-4 text-slate-700 leading-relaxed">
        <p><b>Qui garde vos données ?</b> Agence Elite, Pointe-Noire (Congo). Contact : contact@agence-elite.fr.</p>
        <p><b>Ce que nous gardons :</b> votre nom, vos coordonnées, votre profil, votre CV, vos candidatures et vos résultats de tests. Pour les entreprises : les informations de l’entreprise et de la personne de contact.</p>
        <p><b>Pourquoi :</b> vous proposer des emplois, étudier vos candidatures et présenter votre profil aux entreprises qui recrutent. Vous avez donné votre accord en créant votre compte.</p>
        <p><b>Qui les voit :</b> l’équipe d’Agence Elite. Une entreprise voit votre profil, votre CV et vos résultats seulement si Agence Elite le lui transmet pour un poste. Vos données ne sont jamais vendues à des fichiers publicitaires.</p>
        <p><b>Combien de temps :</b> tant que votre compte est actif, puis 2 ans après votre dernière connexion. Les résultats de tests suivent la même règle.</p>
        <p><b>Vos droits :</b> vous pouvez voir, corriger ou supprimer vos informations à tout moment depuis votre espace, ou en écrivant à contact@agence-elite.fr. Vous pouvez aussi retirer votre accord : votre compte sera alors supprimé. En France, vous pouvez saisir la CNIL ; au Congo, l’autorité compétente en matière de protection des données.</p>
        <p><b>Sécurité :</b> les CV sont rangés dans un espace privé. Seules les personnes autorisées peuvent les ouvrir, avec un lien valable deux minutes.</p>
      </div>
    </div>
  )
}

export function Introuvable() {
  return (
    <div className="conteneur py-20 text-center">
      <h1 className="text-3xl font-extrabold text-marine-800">Page introuvable</h1>
      <p className="mt-2 text-slate-600">Cette adresse n’existe pas ou plus.</p>
      <Link to="/offres" className="btn-primaire mt-6">Voir les offres</Link>
    </div>
  )
}
