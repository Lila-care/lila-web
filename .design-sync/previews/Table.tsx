import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "lila-web"

const forms = [
  {
    name: "Onboarding v3",
    objective: "Bienestar general",
    status: "Publicado",
    version: 3,
    questions: 8,
  },
  {
    name: "Seguimiento mensual",
    objective: "Síntomas del ciclo",
    status: "Borrador",
    version: 1,
    questions: 5,
  },
  {
    name: "Encuesta clínica",
    objective: "Diagnóstico temprano",
    status: "Archivado",
    version: 2,
    questions: 12,
  },
]

export function Default() {
  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-neutral-200 shadow-sm">
      <Table aria-label="Tabla de forms">
        <TableHeader className="bg-secondary">
          <TableRow>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Nombre
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Objetivo
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Estado
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Versión
            </TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Preguntas
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {forms.map((form) => (
            <TableRow key={form.name} className="hover:bg-secondary/60">
              <TableCell className="py-4 font-medium">{form.name}</TableCell>
              <TableCell className="py-4">{form.objective}</TableCell>
              <TableCell className="py-4">{form.status}</TableCell>
              <TableCell className="py-4 text-sm tabular-nums text-neutral-500">
                v{form.version}
              </TableCell>
              <TableCell className="py-4">{form.questions}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
