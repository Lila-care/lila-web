import { authFetch } from "@/api/authFetch";

const BASE_URL = import.meta.env.VITE_API_URL;

// --- Types (contrato técnico — coinciden exactamente con ms-lila) ---

export interface PeriodSummary {
  currentDate: string;
  cycleId: string | null;
  lastPeriod: { start: string; length: number } | null;
  cycle: {
    averageLength: number;
    predictedNextStart: string;
    confidence: number;
    predictedOvulation: string;
    ovulationConfidence: number;
    averageLutealLength: number;
    fertileWindowStart: string | null;
    fertileWindowEnd: string | null;
    currentCycleDay: number | null;
  } | null;
  activePeriod: { isActive: boolean; day: number | null } | null;
}

export type PhaseName =
  | "MENSTRUATION"
  | "FOLLICULAR"
  | "OVULATION"
  | "LUTEAL";

export type DayOfWeek =
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY";

export interface DayPhaseUiModel {
  isToday: boolean;
  dayOfWeekIndex: number;
  dayOfWeek: DayOfWeek;
  phaseName: PhaseName | null;
  date: string;
}

// Enum del BE — ver ms-lila/src/cycle-engine/handlers/commands/report-period.command.ts
export enum PeriodStartSource {
  USER = "USER",
  IMPORT = "IMPORT",
  CORRECTION = "CORRECTION",
}

export interface ReportPeriodStartPayload {
  reportedStartDate: string;
  reportedAt: string;
  source: PeriodStartSource;
  periodLength: number;
  cycleLength: number;
}

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

export async function getPeriodSummary(token: string): Promise<PeriodSummary> {
  const res = await authFetch(`${BASE_URL}/period/summary`, {
    headers: authHeaders(token),
  });
  return handleResponse<PeriodSummary>(res);
}

export async function getUserPhaseMetrics(
  token: string,
  currentDate: string,
): Promise<DayPhaseUiModel[]> {
  const res = await authFetch(`${BASE_URL}/user-phase/metrics/${currentDate}`, {
    headers: authHeaders(token),
  });
  return handleResponse<DayPhaseUiModel[]>(res);
}

export async function reportPeriodStart(
  token: string,
  payload: ReportPeriodStartPayload,
): Promise<PeriodSummary> {
  const res = await authFetch(`${BASE_URL}/period/start`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<PeriodSummary>(res);
}
