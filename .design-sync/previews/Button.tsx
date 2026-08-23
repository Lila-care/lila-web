import { Button } from "lila-web"
import { Loader2, Plus, Trash2 } from "lucide-react"

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Guardar cambios</Button>
      <Button variant="secondary">Cancelar</Button>
      <Button variant="destructive">Eliminar</Button>
      <Button variant="outline">Reintentar</Button>
      <Button variant="ghost">Ver más</Button>
      <Button variant="link">Ir al formulario</Button>
    </div>
  )
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="xs">Extra small</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Agregar pregunta">
        <Plus className="size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}

export function WithIconAndStates() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>
        <Plus className="size-4" aria-hidden="true" />
        Agregar pregunta
      </Button>
      <Button
        variant="ghost"
        className="text-red-600 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Eliminar
      </Button>
      <Button disabled>
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Guardando...
      </Button>
    </div>
  )
}
