import Link from "next/link";
import Image from "next/image";
import { environment } from "@/config";
export function Header() {
  const env = environment();
  return (
    <>
      <Link className="skip" href="#main">
        Aller au contenu
      </Link>
      {env !== "production" && (
        <div className="environment">
          {env === "staging" ? "Préproduction" : "Démonstration"} · Informations
          commerciales à valider · Aucun envoi réel
        </div>
      )}
      <header>
        <div className="container header-row">
          <Link href="/" aria-label="Express Congo, accueil">
            <Image
              className="logo"
              src="/assets/logo-expresscongo.png"
              alt="Express Congo"
              width={511}
              height={80}
              priority
            />
          </Link>
          <nav className="desktop-nav" aria-label="Navigation principale">
            <Link href="/services">Nos solutions</Link>
            <Link href="/preparer-mon-envoi">Préparer un envoi</Link>
            <Link href="/agences">Nos agences</Link>
          </nav>
          <div className="header-actions">
            <Link className="client-link" href="/espace-client">
              Espace client ↗
            </Link>
            <Link className="button small" href="/devis">
              Demander un devis
            </Link>
          </div>
          <details className="mobile-menu">
            <summary>Menu</summary>
            <nav aria-label="Navigation mobile">
              <Link href="/services">Nos solutions</Link>
              <Link href="/preparer-mon-envoi">Préparer un envoi</Link>
              <Link href="/agences">Nos agences</Link>
              <Link href="/espace-client">Espace client</Link>
              <Link href="/devis">Demander un devis</Link>
            </nav>
          </details>
        </div>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <>
      <footer>
        <div className="container footer-grid">
          <div>
            <Image
              className="logo"
              src="/assets/logo-expresscongo.png"
              alt="Express Congo"
              width={511}
              height={80}
            />
            <p>
              Préparez vos envois de la France
              <br />
              vers la République du Congo.
            </p>
            <small>
              Les conditions propres à chaque envoi sont précisées dans la
              proposition.
            </small>
          </div>
          <div>
            <h2>Vos envois</h2>
            <Link href="/services/fret-aerien">Fret aérien</Link>
            <Link href="/services/fret-maritime">Fret maritime</Link>
            <Link href="/services/conteneurs-complets">
              Conteneurs complets
            </Link>
            <Link href="/tarifs">Tarifs et conditions</Link>
          </div>
          <div>
            <h2>Vous accompagner</h2>
            <Link href="/prendre-les-mesures">Mesurer mes colis</Link>
            <Link href="/faq">Questions fréquentes</Link>
            <Link href="/contact">Nous contacter</Link>
            <Link href="/agences">Paris · Brazzaville · Pointe-Noire</Link>
          </div>
          <div>
            <h2>Informations</h2>
            <Link href="/cgv">Conditions générales</Link>
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/confidentialite">Confidentialité</Link>
            <Link href="/cookies">Cookies</Link>
            <Link href="/accessibilite">Accessibilité</Link>
          </div>
        </div>
        <div className="container footer-bottom">
          © {new Date().getFullYear()} Express Congo{" "}
          <span>Version de présentation · Agence Élite</span>
        </div>
      </footer>
      <nav className="mobile-bar" aria-label="Actions rapides">
        <Link href="/devis">Devis</Link>
        <Link href="/contact#whatsapp">WhatsApp à vérifier</Link>
        <Link href="/contact#appeler">Choisir une agence</Link>
      </nav>
    </>
  );
}
export function CTA() {
  return (
    <section className="cta">
      <div className="container">
        <div>
          <span className="eyebrow">Passons à votre projet</span>
          <h2>
            Un carton, une palette,
            <br />
            un projet plus grand ?
          </h2>
          <p>Décrivez votre besoin. Commencez par une demande de devis.</p>
        </div>
        <Link className="button" href="/devis">
          Préparer ma demande →
        </Link>
      </div>
    </section>
  );
}
