import { ProfileTiersDto } from "@/api/dashboard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CategoryBreakdown,
} from "@lila-care/design-system";

interface TierSectionProps {
  profileTiers: ProfileTiersDto;
}

// KAN-51 — a profile with both tiers (`tiers: ['bienestar', 'clinico']`) counts in both
// buckets on the BE side (array, not a mutually exclusive enum — see contract note), so
// `bienestar + clinico` here can exceed the total profile count. That's expected, not a bug.
function TierSection({ profileTiers }: TierSectionProps) {
  const { bienestar, clinico } = profileTiers;
  const hasTiers = bienestar + clinico > 0;

  return (
    <section
      aria-labelledby="tier-section-title"
      data-testid="tier-section"
      className="min-w-0"
    >
      <div className="mb-4">
        <h2
          id="tier-section-title"
          className="text-lg font-semibold text-neutral-900"
        >
          Perfiles por tier
        </h2>
      </div>

      <Card className="min-w-0" data-testid="category-breakdown-tier">
        <CardHeader>
          <CardTitle>Bienestar vs. Clínico</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          {hasTiers ? (
            <CategoryBreakdown
              categories={[
                { label: "Bienestar", value: bienestar },
                { label: "Clínico", value: clinico },
              ]}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Todavía no hay perfiles clasificados por tier.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export default TierSection;
