import { ProfileTiersDto } from "@/api/dashboard";
import { toRatio } from "@/Admin/dashboardFormat";
import { SectionTitle } from "@/Admin/ledger/SectionTitle";
import { BreakdownLedgerRow } from "@/Admin/ledger/BreakdownLedgerRow";

interface TierSectionProps {
  profileTiers: ProfileTiersDto;
}

// A profile can carry both tiers (`tiers` is an array on the BE), so `bienestar + clinico`
// can exceed the profile count — hence bars relative to the sum and no percentage column.
function TierSection({ profileTiers }: TierSectionProps) {
  const { bienestar, clinico } = profileTiers;
  const tierSum = bienestar + clinico;

  return (
    <section
      aria-labelledby="tier-section-title"
      data-testid="tier-section"
      className="flex min-w-0 flex-col gap-2"
    >
      <SectionTitle
        id="tier-section-title"
        title="Perfiles por tier"
        caption="Al día de hoy"
      />
      {tierSum > 0 ? (
        <>
          <ul data-testid="breakdown-tier">
            <BreakdownLedgerRow
              label="Bienestar"
              count={bienestar}
              ratio={toRatio(bienestar, tierSum)}
              showPercent={false}
              testId="breakdown-tier-bienestar"
            />
            <BreakdownLedgerRow
              label="Clínico"
              count={clinico}
              ratio={toRatio(clinico, tierSum)}
              showPercent={false}
              testId="breakdown-tier-clinico"
            />
          </ul>
          <p className="type-caption text-text-secondary">
            Un perfil puede estar en ambos.
          </p>
        </>
      ) : (
        <p
          className="type-body-sm py-2 text-text-secondary"
          data-testid="breakdown-tier-empty"
        >
          Todavía no hay perfiles clasificados por tier.
        </p>
      )}
    </section>
  );
}

export default TierSection;
