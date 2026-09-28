/**
 * Liste blanche des comptes autorisés à utiliser l'application.
 *
 * `ALLOWED_EMAILS` = emails séparés par des virgules (ceux des comptes GitHub
 * autorisés). Le code est open source et n'importe qui peut se connecter avec
 * GitHub : sans cette liste, tout compte GitHub consommerait les crédits IA
 * du propriétaire. Variable absente ou vide = aucun compte autorisé (fail-closed).
 *
 * Pas d'import `server-only` : utilisé aussi par le middleware (runtime edge).
 */
export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}
