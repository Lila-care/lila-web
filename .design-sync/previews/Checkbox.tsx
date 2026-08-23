import { Checkbox, Label } from "lila-web"

export function States() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Checkbox id="cb-unchecked" />
        <Label htmlFor="cb-unchecked" className="font-normal">
          Requerida
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-checked" defaultChecked />
        <Label htmlFor="cb-checked" className="font-normal">
          Marcar como form por defecto
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-disabled" disabled />
        <Label htmlFor="cb-disabled" className="font-normal">
          No permitir fechas futuras
        </Label>
      </div>
    </div>
  )
}
