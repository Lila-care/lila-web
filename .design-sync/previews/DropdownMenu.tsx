import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  buttonVariants,
} from "lila-web"
import { Archive, Pencil, Trash2 } from "lucide-react"

export function Open() {
  return (
    <DropdownMenu open>
      {/* Not `asChild` + `Button`: shadcn's Button isn't a forwardRef component
          (see FormQuestionBuilder.tsx), so a Trigger cloning its ref onto Button
          never reaches the real DOM node and breaks Radix's Popper positioning.
          buttonVariants() gives the same look without that composition. */}
      <DropdownMenuTrigger className={buttonVariants({ variant: "outline" })}>
        Acciones
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Form</DropdownMenuLabel>
        <DropdownMenuItem>
          <Pencil className="size-4" aria-hidden="true" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Archive className="size-4" aria-hidden="true" />
          Archivar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash2 className="size-4" aria-hidden="true" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
