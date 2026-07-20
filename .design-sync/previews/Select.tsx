import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "lila-web"

export function Open() {
  return (
    <Select open defaultValue="text">
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectItem value="text">text</SelectItem>
        <SelectItem value="date">date</SelectItem>
        <SelectItem value="number">number</SelectItem>
        <SelectItem value="select">select</SelectItem>
      </SelectContent>
    </Select>
  )
}
