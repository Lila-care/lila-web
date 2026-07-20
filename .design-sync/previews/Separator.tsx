import { Separator } from "lila-web"

export function Horizontal() {
  return (
    <div className="w-80 space-y-3">
      <div className="text-sm font-medium text-neutral-700">
        Información general
      </div>
      <Separator />
      <div className="text-sm text-neutral-500">Preguntas</div>
    </div>
  )
}

export function Vertical() {
  return (
    <div className="flex h-8 items-center gap-3 text-sm text-neutral-600">
      <span>Borrador</span>
      <Separator orientation="vertical" />
      <span>v3</span>
      <Separator orientation="vertical" />
      <span>4 preguntas</span>
    </div>
  )
}
