import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons'

export default function NewChatIcon({ size = '20px' }) {
  return <FontAwesomeIcon icon={faPenToSquare} style={{ fontSize: size }} />
}
