/**
 * Valide un chemin de redirection post-login (`?next=…`).
 *
 * N'accepte qu'un chemin relatif au site : `//evil.com` ou `/\evil.com`
 * commencent par `/` mais sont interprétés par le navigateur comme des URL
 * absolues vers un autre domaine (open redirect).
 */
export function safeRedirectPath(next: string | null | undefined, fallback = '/agents'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return fallback;
  }
  return next;
}
