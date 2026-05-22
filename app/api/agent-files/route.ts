/**
 * GET /api/agent-files — liste les fichiers RAG de l'utilisateur connecté.
 *
 * Query params :
 *   ?status=processing|ready|error  (filtre)
 *   ?limit=50&offset=0              (pagination)
 *
 * Mode démo : renvoie une liste vide + `demoMode: true`.
 */

import { getCurrentUser } from '@/lib/auth/get-current-user';
import { listAgentFiles, type AgentFileStatus } from '@/lib/supabase/agent-files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUSES: readonly AgentFileStatus[] = ['processing', 'ready', 'error'];

export async function GET(request: Request) {
  const isDemoMode = process.env.DEMO_MODE !== 'false';
  if (isDemoMode) {
    return Response.json({ files: [], demoMode: true });
  }

  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: 'unauthorized', message: 'Connexion requise.' },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get('status');
  const limitParam = Number.parseInt(url.searchParams.get('limit') ?? '50', 10);
  const offsetParam = Number.parseInt(url.searchParams.get('offset') ?? '0', 10);

  // Scope :
  //   ?scope=global         → uniquement les fichiers globaux (pool partagé)
  //   ?conversationId=xxx   → uniquement les fichiers attachés à cette conv
  //   rien                  → tous les fichiers du user (admin / debug)
  const scopeParam = url.searchParams.get('scope');
  const convIdParam = url.searchParams.get('conversationId');
  let conversationId: string | null | undefined = undefined;
  if (scopeParam === 'global') {
    conversationId = null;
  } else if (typeof convIdParam === 'string' && convIdParam.length > 0) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(convIdParam)) {
      return Response.json(
        { error: 'invalid_conversation_id', message: 'conversationId doit être un UUID.' },
        { status: 400 }
      );
    }
    conversationId = convIdParam;
  }

  const files = await listAgentFiles(user.id, {
    status:
      statusParam && (VALID_STATUSES as readonly string[]).includes(statusParam)
        ? (statusParam as AgentFileStatus)
        : undefined,
    limit: Number.isFinite(limitParam) ? Math.min(limitParam, 200) : 50,
    offset: Number.isFinite(offsetParam) ? Math.max(offsetParam, 0) : 0,
    conversationId,
  });

  return Response.json({ files });
}
