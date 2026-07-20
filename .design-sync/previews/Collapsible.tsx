import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "lila-web"
import { ChevronDown } from "lucide-react"

export function Expanded() {
  return (
    <Collapsible
      defaultOpen
      className="w-96 space-y-4 rounded-xl border border-neutral-200 bg-white p-6"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          Audiencia (avanzado)
          <ChevronDown className="size-4" aria-hidden="true" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 text-sm text-neutral-500">
        IDs de usuario o una query JSON para segmentar a quién se le muestra
        el form.
      </CollapsibleContent>
    </Collapsible>
  )
}
