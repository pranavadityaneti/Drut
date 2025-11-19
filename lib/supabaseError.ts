// lib/supaError.ts
export type SupaKind =
  | 'MISSING_RPC'        // PGRST202
  | 'MISSING_TABLE'      // PGRST205
  | 'RLS_BLOCK'          // 42501 / policy text
  | 'AUTH'               // JWT/session missing/expired
  | 'NETWORK'            // fetch/TypeError
  | 'OTHER';

function getErrorJsonString(error: unknown): string {
    if (typeof error === 'string') return error;

    if (error instanceof Error) {
        // Standard Error objects don't stringify their properties well by default
        // because properties like 'message' or 'stack' are often non-enumerable.
        // We build a plain object to ensure all relevant data is captured.
        const plainError: { [key: string]: any } = {
            message: error.message,
            stack: error.stack,
            name: error.name,
        };
        // Supabase errors might be wrapped in a generic Error, so we check for common properties.
        const anyError = error as any;
        if (anyError.code) plainError.code = anyError.code;
        if (anyError.details) plainError.details = anyError.details;
        if (anyError.hint) plainError.hint = anyError.hint;
        return JSON.stringify(plainError);
    }
    
    // For non-Error objects (like Supabase's raw error objects which are plain JSON)
    try {
        return JSON.stringify(error);
    } catch {
        // Fallback for circular structures or other stringify errors
        return String(error);
    }
}

export function classifySupabaseError(e: unknown): SupaKind {
  // Network-ish
  if (e instanceof TypeError || (e instanceof Error && e.message.toLowerCase().includes('failed to fetch'))) {
      return 'NETWORK';
  }

  const errorJsonString = getErrorJsonString(e);
  const lower = errorJsonString.toLowerCase();

  if (lower.includes('pgrst202')) return 'MISSING_RPC';
  if (lower.includes('pgrst205')) return 'MISSING_TABLE';
  if (lower.includes('jwt') || lower.includes('not authenticated') || lower.includes('invalid token')) return 'AUTH';
  if (lower.includes('row-level security') || lower.includes('rls') || lower.includes('42501')) return 'RLS_BLOCK';
  
  return 'OTHER';
}
