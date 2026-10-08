import Link from "next/link";
import Image from "next/image";
import { content, observed } from "@/content";
import { production } from "@/config";
export function ServiceCards() {
  return (
    <div className="three-col">
      {content.services.map((s, i) => (
        <article className="card service-card" key={s.slug}>
          <div className="service-top">
            <Image src={"/assets/" + s.icon} width={40} height={40} alt="" />
            <span>0{i + 1}</span>
          </div>
          <h3>{s.name}</h3>
          <p>{s.intro}</p>
          <div className="service-meta">
            {s.formats}
            <span>Selon devis</span>
          </div>
          <Link href={"/services/" + s.slug}>
            Découvrir la solution <span aria-hidden>↗</span>
          </Link>
        </article>
      ))}
    </div>
  );
}
export function AgencyCards() {
  return (
    <div className="three-col">
      {content.agencies.map((a) => (
        <article className="card agency-card" key={a.slug}>
          <span className="eyebrow">{a.country}</span>
          <h3>{a.name}</h3>
          {!production() && <p className="muted">{observed(a.address)}</p>}
          <Link href={"/agences/" + a.slug}>Voir la fiche agence →</Link>
        </article>
      ))}
    </div>
  );
}
export function FAQ() {
  return (
    <div className="faq-list">
      {[
        [
          "Comment choisir entre aérien et maritime ?",
          "Décrivez votre contenu, son poids et ses dimensions. Le choix dépend du besoin et des conditions proposées. Le formulaire permet de demander conseil.",
        ],
        [
          "Puis-je obtenir un prix avec le volume ?",
          "Le volume décrit votre envoi. Les tarifs non validés restent sur devis ; aucune estimation automatique n’est activée.",
        ],
        [
          "La douane est-elle toujours incluse ?",
          "Non. Les prestations douanières incluses et exclues doivent être confirmées dans la proposition.",
        ],
        [
          "Ma date souhaitée est-elle réservée ?",
          "Non. Une demande de devis ne confirme ni départ, ni livraison, ni réservation.",
        ],
        [
          "Comment consulter le suivi ?",
          "Le suivi public sera activé après validation des procédures et raccordement des dossiers réels. Aucune localisation GPS n’est simulée.",
        ],
      ].map(([question, answer]) => (
        <details key={question}>
          <summary>{question}</summary>
          <p>{answer}</p>
        </details>
      ))}
    </div>
  );
}
export function MeasureDiagram({ type = "carton" }: { type?: string }) {
  return (
    <figure className="diagram">
      <svg
        viewBox="0 0 380 250"
        role="img"
        aria-labelledby={"diagram-title-" + type}
      >
        <title id={"diagram-title-" + type}>
          {`${type} : mesurer longueur L, largeur l et hauteur H à l’extérieur de l’emballage`}
        </title>
        <defs>
          <marker
            id={"arrow-" + type}
            markerWidth="6"
            markerHeight="6"
            refX="3"
            refY="3"
            orient="auto-start-reverse"
          >
            <path d="M0 0L6 3L0 6" fill="#143F86" />
          </marker>
        </defs>
        <path
          d="M90 95L230 60L300 108L160 146Z"
          fill="#e6eefb"
          stroke="#143F86"
        />
        <path
          d="M90 95L160 146L160 210L90 160Z"
          fill="#c6d6ef"
          stroke="#143F86"
        />
        <path
          d="M160 146L300 108L300 172L160 210Z"
          fill="#f1f5fd"
          stroke="#143F86"
        />
        {type === "palette" && (
          <path
            d="M80 166L158 222L315 178L315 194L158 238L80 181Z"
            fill="#cabba1"
          />
        )}
        {type === "objet irrégulier" && (
          <path
            d="M170 145C120 90 215 65 250 105S215 150 195 180"
            fill="none"
            stroke="#E21E26"
            strokeWidth="6"
          />
        )}
        {type === "plusieurs colis" && (
          <path
            d="M165 146V210M235 127V190M190 70L260 118"
            stroke="#143F86"
            strokeWidth="3"
          />
        )}
        <g
          stroke="#143F86"
          markerStart={"url(#arrow-" + type + ")"}
          markerEnd={"url(#arrow-" + type + ")"}
        >
          <path d="M170 232L306 195" />
          <path d={type === "palette" ? "M62 95V181" : "M62 95V160"} />
          <path d="M76 179L141 225" />
        </g>
        <g fill="#143F86" fontSize="15" fontFamily="sans-serif">
          <text x="240" y="232">
            L
          </text>
          <text x="34" y="140">
            H
          </text>
          <text x="76" y="226">
            l
          </text>
        </g>
      </svg>
      <figcaption>
        {type.charAt(0).toUpperCase() + type.slice(1)} · L : longueur, l :
        largeur, H : hauteur.
      </figcaption>
    </figure>
  );
}
