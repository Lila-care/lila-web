// Shared response handling for the subscription admin API modules (plans / discounts /
// subscribers). NestJS error bodies carry `message` as a string, or an array of strings when the
// ValidationPipe rejects a DTO — both are normalized into `ApiError.messages` so callers can map
// them to UI copy instead of surfacing raw BE text.
export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];
  // The BE's `errors: string[]` on a 400 (per-field validation details), when present.
  readonly details: string[];

  constructor(status: number, messages: string[], details: string[] = []) {
    super(messages.join("; ") || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.messages = messages;
    this.details = details;
  }
}

function extractMessages(body: unknown): string[] {
  if (!body || typeof body !== "object" || !("message" in body)) return [];
  const { message } = body as { message: unknown };
  if (typeof message === "string") return [message];
  if (Array.isArray(message)) {
    return message.filter((m): m is string => typeof m === "string");
  }
  return [];
}

function extractDetails(body: unknown): string[] {
  if (!body || typeof body !== "object" || !("errors" in body)) return [];
  const { errors } = body as { errors: unknown };
  return Array.isArray(errors)
    ? errors.filter((e): e is string => typeof e === "string")
    : [];
}

export async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    throw new ApiError(res.status, extractMessages(body), extractDetails(body));
  }
  return res.json() as Promise<T>;
}

export function jsonAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
