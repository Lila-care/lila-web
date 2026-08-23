import { Badge } from "lila-web"

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Publicado</Badge>
      <Badge variant="secondary">Borrador</Badge>
      <Badge variant="destructive">Eliminado</Badge>
      <Badge variant="success">Verificado</Badge>
      <Badge variant="warning">Archivado</Badge>
      <Badge variant="outline">Beta</Badge>
      <Badge variant="ghost">Interno</Badge>
    </div>
  )
}

export function InContext() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-neutral-200 p-4">
      <span className="font-medium">Encuesta de bienestar</span>
      <Badge>Publicado</Badge>
    </div>
  )
}
