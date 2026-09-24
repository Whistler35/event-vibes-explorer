/**
 * The public, externally-reachable web origin for links shared outside the
 * app (WhatsApp, Instagram, SMS, ...). `window.location.origin` looks right
 * on web, but inside the native app it resolves to the local bundle's own
 * origin (e.g. https://localhost) — not a real address anyone else can
 * open. Every shareable link must be built from this constant instead.
 */
export const PUBLIC_WEB_ORIGIN = "https://app.evendle.com";
