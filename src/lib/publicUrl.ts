/**
 * The public, externally-reachable web origin for links shared outside the
 * app (WhatsApp, Instagram, SMS, ...). `window.location.origin` looks right
 * on web, but inside the native app it resolves to the local bundle's own
 * origin (e.g. https://localhost) — not a real address anyone else can
 * open. Every shareable link must be built from this constant instead.
 *
 * evendle.com currently serves the full app (not yet split into a separate
 * marketing site + app subdomain — see the planned rebuild). Update this
 * once that split ships and the app moves to its own subdomain.
 */
export const PUBLIC_WEB_ORIGIN = "https://evendle.com";
