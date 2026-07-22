import { ReactNode, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  CreatePlanPayload,
  PlanDto,
  PlanStatus,
  UpdatePlanPayload,
} from "@/api/plans";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PlanEditorProps {
  initialPlan?: PlanDto;
  saving: boolean;
  saveError: string | null;
  onCreate: (payload: CreatePlanPayload) => void;
  onUpdate: (payload: UpdatePlanPayload) => void;
  onCancel: () => void;
}

// Shared focus treatment used across the admin editors in this feature (mirrors FormEditor).
const FIELD_FOCUS_CLASSES =
  "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary";

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      {children}
    </div>
  );
}

export function PlanEditor({
  initialPlan,
  saving,
  saveError,
  onCreate,
  onUpdate,
  onCancel,
}: PlanEditorProps) {
  const isEditing = !!initialPlan;
  const [name, setName] = useState(initialPlan?.name ?? "");
  // Admins think in pesos, the API stores cents — keep a separate string field so a partial
  // in-progress input doesn't get mangled by a live cents<->pesos conversion on every keystroke.
  const [amountPesos, setAmountPesos] = useState(
    initialPlan ? String(initialPlan.amountInCents / 100) : "",
  );
  const [intervalDays, setIntervalDays] = useState(
    initialPlan ? String(initialPlan.intervalDays) : "30",
  );
  const [description, setDescription] = useState(
    initialPlan?.description ?? "",
  );
  const [status, setStatus] = useState<PlanStatus>(
    initialPlan?.status ?? "active",
  );
  // Empty string means unlimited (`null`) — mirrors `amountPesos`'s string-field pattern so a
  // partial in-progress input isn't mangled, and so "unlimited" isn't confused with "0".
  const [maxInteractionsPerDay, setMaxInteractionsPerDay] = useState(
    initialPlan?.maxInteractionsPerDay != null
      ? String(initialPlan.maxInteractionsPerDay)
      : "",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountInCents = Math.round(parseFloat(amountPesos || "0") * 100);
    const parsedMaxInteractionsPerDay =
      maxInteractionsPerDay.trim() === ""
        ? null
        : parseInt(maxInteractionsPerDay, 10);

    if (isEditing) {
      onUpdate({
        name,
        amountInCents,
        status,
        description: description || undefined,
        maxInteractionsPerDay: parsedMaxInteractionsPerDay,
      });
      return;
    }

    onCreate({
      name,
      amountInCents,
      currency: "COP",
      intervalDays: parseInt(intervalDays, 10) || 0,
      description: description || undefined,
      maxInteractionsPerDay: parsedMaxInteractionsPerDay,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-6"
      data-testid="plan-editor"
    >
      <SectionCard title="Información del plan">
        <div className="space-y-1">
          <Label htmlFor="plan-name">Nombre</Label>
          <Input
            id="plan-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={FIELD_FOCUS_CLASSES}
            data-testid="plan-name"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="plan-amount">Precio mensual (COP)</Label>
          <Input
            id="plan-amount"
            type="number"
            min="0"
            step="1"
            value={amountPesos}
            onChange={(e) => setAmountPesos(e.target.value)}
            required
            className={FIELD_FOCUS_CLASSES}
            data-testid="plan-amount"
          />
        </div>

        {!isEditing && (
          <div className="space-y-1">
            <Label htmlFor="plan-interval">Intervalo (días)</Label>
            <Input
              id="plan-interval"
              type="number"
              min="1"
              step="1"
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value)}
              required
              className={FIELD_FOCUS_CLASSES}
              data-testid="plan-interval"
            />
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="plan-description">Descripción</Label>
          <Textarea
            id="plan-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={FIELD_FOCUS_CLASSES}
            data-testid="plan-description"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="plan-max-interactions">
            Interacciones diarias máximas
          </Label>
          <Input
            id="plan-max-interactions"
            type="number"
            min="1"
            step="1"
            placeholder="Ilimitado"
            value={maxInteractionsPerDay}
            onChange={(e) => setMaxInteractionsPerDay(e.target.value)}
            className={FIELD_FOCUS_CLASSES}
            data-testid="plan-max-interactions"
          />
          <p className="text-xs text-neutral-500">
            Dejá vacío para interacciones ilimitadas.
          </p>
        </div>

        {isEditing && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="plan-active"
              checked={status === "active"}
              onCheckedChange={(checked) =>
                setStatus(checked === true ? "active" : "inactive")
              }
              data-testid="plan-active"
            />
            <Label htmlFor="plan-active" className="font-normal">
              Plan activo
            </Label>
          </div>
        )}
      </SectionCard>

      {saveError && (
        <Alert variant="destructive" role="alert" aria-live="polite">
          <AlertDescription data-testid="plan-save-error">
            {saveError}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving} data-testid="plan-save-button">
          {saving && (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          {saving
            ? "Guardando..."
            : isEditing
              ? "Guardar cambios"
              : "Crear plan"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          data-testid="plan-cancel-button"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
