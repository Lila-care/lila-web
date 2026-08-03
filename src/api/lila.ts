import { authFetch } from "@/api/authFetch";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Auth Types ---

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface NewPasswordChallenge {
  challenge: "NEW_PASSWORD_REQUIRED";
  session: string;
}

export type LoginResponse = AuthTokens | NewPasswordChallenge;

export interface UpdateTemplateDto {
  name?: string;
  systemPrompt?: string;
  defaultModel?: string;
  freeQuestionLimit?: number;
  isActive?: boolean;
}

// --- Types ---

export type ProfileTier = "bienestar" | "clinico";

export interface ReconciliationQuestion {
  questionId: string;
  text: string;
  answerText: string;
}

export interface ReconciliationData {
  formId: string;
  questions: ReconciliationQuestion[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  // Only set for the special seed message that renders `ReconciliationCard` instead of
  // Markdown — see `MessageBubble.tsx`. Absent on every regular chat message.
  kind?: "reconciliation";
  data?: ReconciliationData;
}

export interface ChatResponse {
  reply: string;
  conversationId: string | null;
  tokensUsed: number;
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface LilaConversation {
  id: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface LilaProfile {
  userId: string;
  tiers: ProfileTier[];
  updatedAt: string;
}

export interface LilaConfig {
  freeQuestionLimit: number;
  upgradePromptLimit: number;
}

export interface LilaTemplate {
  name: string;
  systemPrompt: string;
  defaultModel: string;
  freeQuestionLimit: number;
  version: number;
  isActive: boolean;
  updatedAt: string;
}

export interface OnboardingStatus {
  pending: boolean;
  greetingMessage?: string;
}

export interface UserAgent {
  userId: string;
  templateVersion: number;
  isGuest: boolean;
  hasActiveTemplate: boolean;
  freeQuestionLimit: number;
  onboarding: OnboardingStatus;
  // Only populated on the account's first sign-in, when a completed guest `FormProgress`
  // was pending reconciliation. Mutually exclusive with `onboarding.pending` in practice.
  reconciliation?: ReconciliationData;
}

export interface MigrateGuestResponse {
  migratedConversations: number;
}

// --- Helpers ---

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function jsonHeaders() {
  return { "Content-Type": "application/json" };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// --- API functions ---

export async function sendMessage(
  token: string | null,
  body: { message: string; conversationId?: string },
  guestId?: string,
): Promise<ChatResponse> {
  let headers: Record<string, string>;
  if (token) {
    headers = authHeaders(token);
  } else if (guestId) {
    headers = { ...jsonHeaders(), "x-guest-id": guestId };
  } else {
    headers = jsonHeaders();
  }
  const res = await fetch(`${BASE_URL}/lila/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return handleResponse<ChatResponse>(res);
}

export async function getConversations(
  token: string,
): Promise<{ conversations: ConversationSummary[] }> {
  const res = await authFetch(`${BASE_URL}/lila/conversations`, {
    headers: authHeaders(token),
  });
  const data = await handleResponse<LilaConversation[]>(res);
  return {
    conversations: data.map((conv) => {
      const firstUserMessage = conv.messages.find((m) => m.role === "user");
      let title = "Conversación";
      if (firstUserMessage) {
        const trimmed = firstUserMessage.content.trim();
        title = trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
      }
      return {
        id: conv.id,
        title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messageCount: conv.messages.length,
      };
    }),
  };
}

export async function getConversation(
  token: string,
  id: string,
): Promise<LilaConversation> {
  const res = await authFetch(`${BASE_URL}/lila/conversations/${id}`, {
    headers: authHeaders(token),
  });
  return handleResponse<LilaConversation>(res);
}

export async function deleteConversation(
  token: string,
  id: string,
): Promise<void> {
  const res = await authFetch(`${BASE_URL}/lila/conversations/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

export async function getProfile(token: string): Promise<LilaProfile> {
  const res = await authFetch(`${BASE_URL}/lila/profile`, {
    headers: authHeaders(token),
  });
  return handleResponse<LilaProfile>(res);
}

export async function updateProfile(
  token: string,
  data: { tiers: ProfileTier[] },
): Promise<LilaProfile> {
  const res = await authFetch(`${BASE_URL}/lila/profile`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<LilaProfile>(res);
}

export async function getTemplate(token: string): Promise<LilaTemplate> {
  const res = await authFetch(`${BASE_URL}/lila/template`, {
    headers: authHeaders(token),
  });
  return handleResponse<LilaTemplate>(res);
}

export async function updateTemplate(
  token: string,
  data: Partial<LilaTemplate>,
): Promise<LilaTemplate> {
  const res = await authFetch(`${BASE_URL}/lila/template`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<LilaTemplate>(res);
}

export async function getAgentMe(
  token: string | null,
  guestId?: string,
): Promise<UserAgent> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else if (guestId) {
    headers["x-guest-id"] = guestId;
  }
  const res = await fetch(`${BASE_URL}/lila/agent/me`, { headers });
  return handleResponse<UserAgent>(res);
}

export async function migrateGuest(
  token: string,
  guestId: string,
): Promise<MigrateGuestResponse> {
  const res = await authFetch(`${BASE_URL}/lila/guest/migrate`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ guestId }),
  });
  return handleResponse<MigrateGuestResponse>(res);
}

export async function reconcileOnboarding(
  token: string,
  payload: {
    formId: string;
    answers: { questionId: string; answerText: string }[];
  },
): Promise<{ success: boolean }> {
  const res = await authFetch(`${BASE_URL}/lila/onboarding/reconcile`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function getConfig(): Promise<LilaConfig> {
  const res = await fetch(`${BASE_URL}/lila/config`, {
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<LilaConfig>(res);
}

// --- Auth API ---

export async function loginWithPassword(dto: LoginDto): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (res.status === 403) {
    const data = await res.json();
    return data as NewPasswordChallenge;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<AuthTokens>;
}

export async function confirmNewPassword(dto: {
  email: string;
  newPassword: string;
  session: string;
}): Promise<AuthTokens> {
  const res = await fetch(`${BASE_URL}/auth/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<AuthTokens>;
}
