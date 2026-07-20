import { Label, Textarea } from "lila-web"

export function Default() {
  return (
    <div className="w-96 space-y-1">
      <Label htmlFor="ta-desc">Descripción</Label>
      <Textarea
        id="ta-desc"
        rows={3}
        defaultValue="Encuesta corta para entender cómo está viviendo cada usuaria su ciclo."
      />
    </div>
  )
}

export function Monospace() {
  return (
    <div className="w-96 space-y-1">
      <Label htmlFor="ta-query">Query (JSON crudo)</Label>
      <Textarea
        id="ta-query"
        rows={4}
        className="font-mono"
        defaultValue={'{ "tier": "clinico" }'}
      />
    </div>
  )
}
