import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "lila-web"

export function Default() {
  return (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Encuesta de bienestar</CardTitle>
        <CardDescription>Onboarding · v3</CardDescription>
        <CardAction>
          <Badge>Publicado</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          8 preguntas · se muestra a usuarias nuevas al loguearse por primera
          vez.
        </p>
      </CardContent>
      <CardFooter className="gap-2 border-t">
        <Button variant="outline" size="sm">
          Editar
        </Button>
        <Button size="sm">Ver respuestas</Button>
      </CardFooter>
    </Card>
  )
}
