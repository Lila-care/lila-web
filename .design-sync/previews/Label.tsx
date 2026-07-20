import { Checkbox, Input, Label } from "lila-web"

export function WithInput() {
  return (
    <div className="w-72 space-y-1">
      <Label htmlFor="label-with-input">Objetivo</Label>
      <Input id="label-with-input" placeholder="Reducir dolor menstrual" />
    </div>
  )
}

export function WithCheckbox() {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id="label-with-checkbox" defaultChecked />
      <Label htmlFor="label-with-checkbox" className="font-normal">
        Marcar como form por defecto
      </Label>
    </div>
  )
}

export function Disabled() {
  return (
    <div className="group flex items-center gap-2" data-disabled="true">
      <Checkbox id="label-disabled" disabled />
      <Label htmlFor="label-disabled" className="font-normal">
        No permitir fechas futuras
      </Label>
    </div>
  )
}
