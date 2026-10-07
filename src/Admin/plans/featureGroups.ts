import { FeatureDefinition, FeatureSection } from "@/api/plans";
import { SECTION_LABEL, SECTION_ORDER } from "@/Admin/plans/featureLabels";

export interface FeatureGroup {
  id: string;
  title: string;
  features: FeatureDefinition[];
}

// Enforced features grouped by section (fixed order); announced ones go together at the end.
export function groupFeatures(catalog: FeatureDefinition[]): FeatureGroup[] {
  const bySection = (section: FeatureSection): FeatureGroup => ({
    id: section,
    title: SECTION_LABEL[section],
    features: catalog.filter((f) => f.enforced && f.section === section),
  });
  const upcoming: FeatureGroup = {
    id: "upcoming",
    title: "Próximamente",
    features: catalog.filter((f) => !f.enforced),
  };
  return [...SECTION_ORDER.map(bySection), upcoming].filter(
    (group) => group.features.length > 0,
  );
}
