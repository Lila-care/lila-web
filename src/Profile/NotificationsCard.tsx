import { useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToggleRowProps {
  testId: string;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  showBorder: boolean;
}

function ToggleRow({ testId, label, description, checked, onToggle, showBorder }: ToggleRowProps) {
  return (
    <div
      className={cn("flex items-center justify-between py-3.5", showBorder && "border-b")}
      style={showBorder ? { borderColor: "rgba(61,43,80,0.07)" } : undefined}
    >
      <div>
        <div className="text-[14.5px] font-medium">{label}</div>
        <div className="text-[12.5px] mt-0.5" style={{ color: "rgba(61,43,80,0.5)" }}>
          {description}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-testid={testId}
        onClick={onToggle}
        className="w-[42px] h-6 rounded-full relative shrink-0 transition-colors"
        style={{ background: checked ? "#9B72C8" : "rgba(61,43,80,0.15)" }}
      >
        <span
          className="w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] transition-all"
          style={{ [checked ? "right" : "left"]: "3px" }}
        />
      </button>
    </div>
  );
}

// Los 3 toggles no tienen endpoint en ms-lila (gap documentado en el contrato) — useState
// local únicamente, no persisten tras refresh. Valores iniciales replican el mock: ovulación
// y luna activos, diario inactivo.
function NotificationsCard() {
  const [ovulationAlert, setOvulationAlert] = useState(true);
  const [journalReminder, setJournalReminder] = useState(false);
  const [moonPhaseAlert, setMoonPhaseAlert] = useState(true);

  return (
    <div
      data-testid="notifications-card"
      className="bg-white rounded-3xl p-6 md:p-7 flex flex-col"
      style={{
        border: "1px solid rgba(61,43,80,0.07)",
        boxShadow: "0 4px 24px rgba(61,43,80,0.05)",
      }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-[38px] h-[38px] rounded-xl flex items-center justify-center"
          style={{ background: "#FBEFE6" }}
        >
          <Bell size={19} color="#C97C46" />
        </div>
        <div
          className="font-semibold text-[19px]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Notificaciones
        </div>
      </div>

      <ToggleRow
        testId="toggle-ovulation-alert"
        label="Aviso de ovulación"
        description="Te avisaremos 2 días antes."
        checked={ovulationAlert}
        onToggle={() => setOvulationAlert((v) => !v)}
        showBorder
      />
      <ToggleRow
        testId="toggle-journal-reminder"
        label="Recordatorio de diario"
        description="A las 21:00 cada noche."
        checked={journalReminder}
        onToggle={() => setJournalReminder((v) => !v)}
        showBorder
      />
      <ToggleRow
        testId="toggle-moon-phase"
        label="Fases de la luna"
        description="Actualización lunar diaria."
        checked={moonPhaseAlert}
        onToggle={() => setMoonPhaseAlert((v) => !v)}
        showBorder={false}
      />
    </div>
  );
}

export default NotificationsCard;
