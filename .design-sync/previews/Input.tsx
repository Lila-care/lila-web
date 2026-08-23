import { Input, Label } from "lila-web"

export function Default() {
  return (
    <div className="w-72 space-y-1">
      <Label htmlFor="input-default">Nombre</Label>
      <Input id="input-default" type="text" defaultValue="Encuesta de bienestar" />
    </div>
  )
}

export function States() {
  return (
    <div className="w-72 space-y-4">
      <div className="space-y-1">
        <Label htmlFor="input-placeholder">Opciones</Label>
        <Input id="input-placeholder" placeholder="opción 1, opción 2, opción 3" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="input-disabled">Key (identificador)</Label>
        <Input id="input-disabled" defaultValue="onboarding_v2" disabled />
      </div>
      <div className="space-y-1">
        <Label htmlFor="input-invalid">Email</Label>
        <Input id="input-invalid" defaultValue="no-es-un-email" aria-invalid />
      </div>
    </div>
  )
}
