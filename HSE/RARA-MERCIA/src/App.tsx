import { Navigate, Route, Routes } from 'react-router-dom'
import { FournisseurApp, useApp } from './lib/contexte'
import Layout from './components/Layout'
import { Chargement } from './components/ui'
import { CodeAcces, Connexion } from './pages/Connexion'
import TableauDeBord from './pages/TableauDeBord'
import Saisie from './pages/Saisie'
import ModulePage from './pages/Module'
import Parametres from './pages/Parametres'
import Aide from './pages/Aide'
import Rapport from './pages/Rapport'

function Contenu() {
  const { session, membre, chargement } = useApp()
  if (chargement) return <Chargement texte="Ouverture de la plateforme…" />
  if (!session) return <Connexion />
  if (!membre) return <CodeAcces />
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<TableauDeBord />} />
        <Route path="/saisie" element={<Saisie />} />
        <Route path="/m/:id" element={<ModulePage />} />
        <Route path="/rapport" element={<Rapport />} />
        <Route path="/parametres" element={<Parametres />} />
        <Route path="/aide" element={<Aide />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return <FournisseurApp><Contenu /></FournisseurApp>
}
