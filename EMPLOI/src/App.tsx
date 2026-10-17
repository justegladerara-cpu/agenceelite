import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { FournisseurApp, useApp } from './lib/contexte'
import { supabase } from './lib/supabase'
import type { Role } from './lib/donnees'
import Layout from './components/Layout'
import { Chargement } from './components/ui'
import Accueil from './pages/Accueil'
import Offres from './pages/Offres'
import Offre from './pages/Offre'
import { Connexion, Inscription, NouveauMotDePasse } from './pages/Connexion'
import { PasserTest, Tests } from './pages/Tests'
import { Confidentialite, Introuvable, Recruter } from './pages/Pages'

// Espaces connectés chargés à la demande : la page publique reste légère sur mobile.
const EspaceCandidat = lazy(() => import('./pages/candidat/EspaceCandidat'))
const EspaceEntreprise = lazy(() => import('./pages/entreprise/EspaceEntreprise'))
const Admin = lazy(() => import('./pages/admin/Admin'))

/** Page réservée à un rôle : sinon, connexion ou retour à l'accueil. */
function Reserve({ role, children }: { role: Role; children: ReactNode }) {
  const { session, profil, chargement, profilVerifie } = useApp()
  const loc = useLocation()
  if (chargement || (session && !profil && !profilVerifie)) return <Chargement texte="Ouverture de votre espace…" />
  if (session && !profil) return (
    <div className="conteneur py-20 max-w-md text-center">
      <h1 className="text-2xl font-extrabold text-encre-800">Compte non reconnu</h1>
      <p className="mt-2 text-slate-600">Ce compte n’a pas été créé sur Elite Emploi. Déconnectez-vous, puis créez un compte candidat ou entreprise.</p>
      <button className="btn-primaire mt-6" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
    </div>
  )
  if (!session) return <Navigate to={`/connexion?retour=${encodeURIComponent(loc.pathname)}`} replace />
  if (profil?.role !== role) return <Navigate to={profil?.role === 'admin' ? '/admin' : profil?.role === 'entreprise' ? '/espace-entreprise' : '/espace'} replace />
  return <Suspense fallback={<Chargement />}>{children}</Suspense>
}

export default function App() {
  return (
    <FournisseurApp>
      <Layout>
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/offres" element={<Offres />} />
          <Route path="/offres/:id" element={<Offre />} />
          <Route path="/tests" element={<Tests />} />
          <Route path="/tests/:slug" element={<PasserTest />} />
          <Route path="/entreprises" element={<Recruter />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/inscription" element={<Inscription />} />
          <Route path="/mot-de-passe" element={<NouveauMotDePasse />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
          <Route path="/espace" element={<Reserve role="candidat"><EspaceCandidat /></Reserve>} />
          <Route path="/espace-entreprise" element={<Reserve role="entreprise"><EspaceEntreprise /></Reserve>} />
          <Route path="/admin" element={<Reserve role="admin"><Admin /></Reserve>} />
          <Route path="*" element={<Introuvable />} />
        </Routes>
      </Layout>
    </FournisseurApp>
  )
}
