// Shared response handling for the subscription admin API modules (plans / discounts /
// subscribers). NestJS error bodies carry `message` as a string, or an array of strings when the
// ValidationPipe rejects a DTO — both are normalized into `ApiError.messages` so callers can map
// them to UI copy instead of surfacing raw BE text.
export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];

  constructor(status: number, messages: string[]) {
    super(messages.join("; ") || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.messages = messages;
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

export async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    throw new ApiError(res.status, extractMessages(body));
  }
  return res.json() as Promise<T>;
}

export function jsonAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
