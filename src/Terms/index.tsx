import ReactMarkdown from "react-markdown"
import { TERMS_TEXT } from "./terms"

const Terms = () => {
  return (
    <div className="terms-container">
        <ReactMarkdown>
            {TERMS_TEXT}
        </ReactMarkdown>
    </div>
  )
}
export default Terms