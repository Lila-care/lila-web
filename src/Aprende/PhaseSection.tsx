interface PhaseSectionProps {
  dayRange: string;
  title: string;
  description: string;
  rituals: string[];
  gradient: string;
  textColor: string;
  chipBackground: string;
  ritualBackground: string;
}

function PhaseSection({
  dayRange,
  title,
  description,
  rituals,
  gradient,
  textColor,
  chipBackground,
  ritualBackground,
}: PhaseSectionProps) {
  return (
    <section
      data-testid="phase-section"
      className="relative px-6 md:px-16 py-16 md:py-[72px] overflow-hidden"
      style={{ background: gradient, color: textColor }}
    >
      <div className="relative max-w-[640px]">
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold mb-5"
          style={{ background: chipBackground }}
        >
          {dayRange}
        </div>
        <h2
          className="font-bold text-3xl md:text-4xl mb-4"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {title}
        </h2>
        <p className="text-base leading-relaxed mb-7 max-w-[520px]">{description}</p>
        <div
          className="text-xs font-semibold uppercase tracking-wide mb-3.5 opacity-70"
        >
          Rituales para esta fase
        </div>
        <div className="flex gap-3.5 flex-wrap">
          {rituals.map((ritual) => (
            <div
              key={ritual}
              className="rounded-2xl px-5 py-4 text-sm font-medium"
              style={{ background: ritualBackground }}
            >
              {ritual}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PhaseSection;
