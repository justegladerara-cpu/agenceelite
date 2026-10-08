import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  // Conserve les URL de l’ancien site WordPress (/a-propos/, /services/…) sans redirection.
  trailingSlash: true,
  serverExternalPackages: ["node:sqlite"],
  async redirects() {
    return [
      {
        source: "/2025/07/30/comment-prendre-les-mesures",
        destination: "/prendre-les-mesures/",
        statusCode: 301,
      },
      {
        source: "/wp-content/uploads/2025/08/grille-tarifaire.pdf",
        destination: "/tarifs/",
        statusCode: 301,
      },
      {
        source: "/wp-content/uploads/2026/09/grille-tarifaire.pdf",
        destination: "/tarifs/",
        statusCode: 301,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'",
          },
        ],
      },
    ];
  },
};
export default config;
