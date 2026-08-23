import { Alert, AlertDescription, AlertTitle } from "lila-web"
import { AlertCircle, Terminal } from "lucide-react"

export function Default() {
  return (
    <Alert className="max-w-md">
      <Terminal className="size-4" aria-hidden="true" />
      <AlertTitle>Encuesta guardada</AlertTitle>
      <AlertDescription>
        Los cambios se guardaron como borrador. Publicá el form cuando esté
        listo.
      </AlertDescription>
    </Alert>
  )
}

export function Destructive() {
  return (
    <Alert variant="destructive" className="max-w-md">
      <AlertCircle className="size-4" aria-hidden="true" />
      <AlertDescription>
        Error al cargar los forms: no se pudo conectar con el servidor.
      </AlertDescription>
    </Alert>
  )
}
