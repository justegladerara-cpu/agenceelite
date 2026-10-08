import Link from "next/link";
import Image from "next/image";
import { ServiceCards, AgencyCards, FAQ } from "@/components/public";
import { CTA } from "@/components/shell";
export const metadata = { alternates: { canonical: "/" } };
export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Fret · France → République du Congo</span>
            <h1>
              Vos envois.
              <br />
              <span>
                Un lien avec
                <br />
                le Congo.
              </span>
            </h1>
            <p>
              Fret aérien, maritime et conteneurs complets. Décrivez votre envoi
              pour préparer votre expédition avec notre équipe.
            </p>
            <div className="actions">
              <Link className="button" href="/devis">
                Demander un devis <span aria-hidden>↗</span>
              </Link>
              <Link className="plain-link" href="/agences">
                Trouver une agence →
              </Link>
            </div>
            <div className="hero-note">
              <span>Paris</span>
              <i aria-hidden>⟶</i>
              <span>Brazzaville & Pointe-Noire</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-head">
              <span>EXPRESS CONGO</span>
              <span>FR → CG</span>
            </div>
            <Image
              src="/assets/m_1_banniere.png"
              width={720}
              height={300}
              alt="Visuel maritime du site Express Congo"
              priority
            />
            <div className="visual-route">
              <div className="route-line" aria-hidden>
                <span />
                <i />
                <span />
              </div>
              <div className="two-col">
                <p>
                  <small>AU DÉPART</small>
                  <strong>France</strong>
                </p>
                <p>
                  <small>À DESTINATION</small>
                  <strong>République du Congo</strong>
                </p>
              </div>
            </div>
            <div className="visual-caption">
              Une proposition adaptée à votre envoi.
              <br />
              Des conditions précisées avant de partir.
            </div>
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="section-heading split">
          <div>
            <span className="eyebrow">Choisir la bonne solution</span>
            <h2>
              À chaque envoi,
              <br />
              une solution à étudier.
            </h2>
          </div>
          <Link href="/services">Comparer les services →</Link>
        </div>
        <ServiceCards />
      </section>
      <section className="steps-section">
        <div className="container section">
          <div className="section-heading">
            <span className="eyebrow">Un parcours clair</span>
            <h2>Préparer. Valider. Expédier.</h2>
            <p>
              Quatre étapes proposées pour accompagner votre envoi, selon les
              modalités confirmées.
            </p>
          </div>
          <div className="four-col steps">
            {[
              [
                "Décrivez votre envoi",
                "Contenu, dimensions, poids et destination.",
                "/devis",
              ],
              [
                "Validez la proposition",
                "Prix, prestations et conditions à examiner.",
                "/tarifs",
              ],
              [
                "Préparez le dépôt",
                "Après confirmation des instructions de l’agence.",
                "/preparer-mon-envoi",
              ],
              [
                "Consultez les informations",
                "Les événements disponibles, sans suivi GPS simulé.",
                "/suivi",
              ],
            ].map(([title, text, href], i) => (
              <Link href={href} key={title}>
                <span>0{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="container section preparation">
        <div>
          <span className="eyebrow">Avant de nous confier vos colis</span>
          <h2>
            Un envoi bien mesuré,
            <br />
            une demande plus précise.
          </h2>
          <p>
            Longueur, largeur, hauteur : relevez les dimensions extérieures.
            Notre calculateur vous aide à préparer le volume de vos cartons.
          </p>
          <Link className="button secondary" href="/prendre-les-mesures">
            Mesurer mes colis →
          </Link>
        </div>
        <div className="guide-links">
          {[
            ["01", "Mesurer et calculer", "/prendre-les-mesures"],
            [
              "02",
              "Emballer et préparer les documents",
              "/emballage-et-documents",
            ],
            ["03", "Vérifier les marchandises", "/marchandises-reglementees"],
          ].map(([n, title, href]) => (
            <Link key={n} href={href}>
              <span>{n}</span>
              {title}
              <b aria-hidden>↗</b>
            </Link>
          ))}
        </div>
      </section>
      <section className="light-section">
        <div className="container section">
          <div className="section-heading split">
            <div>
              <span className="eyebrow">Des points de contact</span>
              <h2>Votre agence, des deux côtés.</h2>
            </div>
            <Link href="/agences">Toutes les agences →</Link>
          </div>
          <AgencyCards />
        </div>
      </section>
      <section className="container section faq-section">
        <div>
          <span className="eyebrow">Pour commencer</span>
          <h2>
            Vos questions,
            <br />
            en toute clarté.
          </h2>
          <Link href="/faq">Toutes les réponses →</Link>
        </div>
        <FAQ />
      </section>
      <CTA />
    </>
  );
}
