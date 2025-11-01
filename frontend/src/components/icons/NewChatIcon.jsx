import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons'

export default function NewChatIcon({ size = '20px', color = '#3b82f6' }) {
  return <FontAwesomeIcon icon={faPenToSquare} style={{ fontSize: size, color }} />
}
