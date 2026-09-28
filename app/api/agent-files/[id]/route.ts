/**
 * DELETE /api/agent-files/[id] — supprime un fichier RAG + son objet Storage.
 *
 * Les chunks sont droppés par CASCADE FK.
 */

import { getCurrentUser } from '@/lib/auth/get-current-user';
import { deleteAgentFile, getAgentFile } from '@/lib/supabase/agent-files';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: 'unauthorized', message: 'Connexion requise.' },
      { status: 401 }
    );
  }

  const file = await getAgentFile(params.id);
  if (!file || file.user_id !== user.id) {
    return Response.json(
      { error: 'not_found', message: 'Fichier introuvable.' },
      { status: 404 }
    );
  }

  const res = await deleteAgentFile(file.id, file.storage_path);
  if (res.error) {
    return Response.json(
      { error: 'delete_failed', message: res.error },
      { status: 500 }
    );
  }

  return new Response(null, { status: 204 });
}
