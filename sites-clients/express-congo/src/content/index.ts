import data from "./public.json" with { type: "json" };
import { production } from "@/config";
export const content = data;
export const publicPaths = [
  "/",
  "/services",
  "/tarifs",
  "/devis",
  "/suivi",
  "/prendre-les-mesures",
  "/agences",
  "/professionnels",
  "/faq",
  "/contact",
  ...data.services.map((s) => `/services/${s.slug}`),
  ...data.agencies.map((a) => `/agences/${a.slug}`),
  ...data.pages.map((p) => `/${p.slug}`),
];
export function observed(value: string) {
  return production() ? "" : `[À CONFIRMER : ${value}]`;
}
