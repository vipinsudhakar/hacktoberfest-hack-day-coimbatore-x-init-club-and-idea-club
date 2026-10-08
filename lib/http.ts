import type { ApiError } from "./api";

export function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message } satisfies ApiError, { status });
}

export function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
