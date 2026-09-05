/**
 * The address confirmation links in emails should point at.
 *
 * Without this the link is built from whatever browser the user signed up in,
 * so signing up on a laptop produces a `localhost` link that is broken on
 * every other device. Set NEXT_PUBLIC_SITE_URL to an address other devices can
 * actually reach — your machine's LAN IP while developing, or the deployed
 * domain in production.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;

  if (configured) return configured.replace(/\/$/, "");

  // Fall back to the current origin, which is correct when the site is opened
  // on the same device that will open the email.
  return window.location.origin;
}
