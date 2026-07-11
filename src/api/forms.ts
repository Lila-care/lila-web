import { authFetch } from "@/api/authFetch";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Types ---

export type FormStatus = "draft" | "live" | "archived";

export interface FormQuestionConfig {
  type: "text" | "date" | "number" | "select";
  required?: boolean;
  options?: string[];
}

export interface FormQuestion {
  id: string;
  order: number;
  text: string;
  key: string;
  config?: FormQuestionConfig;
}

export interface FormAudience {
  userIds?: string[];
  query?: Record<string, unknown>;
}

export interface LilaForm {
  formId: string;
  name: string;
  description: string;
  objective: string;
  questions: FormQuestion[];
  status: FormStatus;
  version: number;
  publishedAt?: string;
  audience?: FormAudience;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFormQuestionPayload {
  text: string;
  key: string;
  config?: FormQuestionConfig;
}

export interface CreateFormPayload {
  name: string;
  description: string;
  objective: string;
  questions: CreateFormQuestionPayload[];
  isDefault?: boolean;
}

export interface UpdateFormPayload {
  name?: string;
  description?: string;
  objective?: string;
  questions?: CreateFormQuestionPayload[];
  audience?: FormAudience;
}

// --- Helpers ---

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// --- API functions ---

export async function listForms(token: string): Promise<LilaForm[]> {
  const res = await authFetch(`${BASE_URL}/lila/forms`, {
    headers: authHeaders(token),
  });
  return handleResponse<LilaForm[]>(res);
}

export async function getForm(
  token: string,
  formId: string,
): Promise<LilaForm> {
  const res = await authFetch(`${BASE_URL}/lila/forms/${formId}`, {
    headers: authHeaders(token),
  });
  return handleResponse<LilaForm>(res);
}

export async function createForm(
  token: string,
  payload: CreateFormPayload,
): Promise<LilaForm> {
  const res = await authFetch(`${BASE_URL}/lila/forms`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<LilaForm>(res);
}

export async function updateForm(
  token: string,
  formId: string,
  payload: UpdateFormPayload,
): Promise<LilaForm> {
  const res = await authFetch(`${BASE_URL}/lila/forms/${formId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<LilaForm>(res);
}

export async function publishForm(
  token: string,
  formId: string,
): Promise<LilaForm> {
  const res = await authFetch(`${BASE_URL}/lila/forms/${formId}/publish`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
  return handleResponse<LilaForm>(res);
}

export async function unpublishForm(
  token: string,
  formId: string,
): Promise<LilaForm> {
  const res = await authFetch(`${BASE_URL}/lila/forms/${formId}/unpublish`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
  return handleResponse<LilaForm>(res);
}
