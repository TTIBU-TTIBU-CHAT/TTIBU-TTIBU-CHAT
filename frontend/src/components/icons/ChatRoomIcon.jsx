import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCommentDots } from '@fortawesome/free-solid-svg-icons'

export default function ChatRoomIcon({ size = '20px' }) {
  return <FontAwesomeIcon icon={faCommentDots} style={{ fontSize: size }} />
}
