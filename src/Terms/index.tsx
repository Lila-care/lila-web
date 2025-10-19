import ReactMarkdown from "react-markdown"
import { TERMS_TEXT } from "./terms"

const Terms = () => {
  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: 800,
        margin: "0 auto",
        textAlign: "justify",
        lineHeight: 1.6, 
      }}>
        <ReactMarkdown>
            {TERMS_TEXT}
        </ReactMarkdown>
    </div>
  )
}
export default Terms