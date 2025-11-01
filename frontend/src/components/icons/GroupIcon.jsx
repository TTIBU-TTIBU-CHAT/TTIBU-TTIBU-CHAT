import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons'

export default function GroupIcon({ size = '20px', color = '#374151' }) {
  return <FontAwesomeIcon icon={faLayerGroup} style={{ fontSize: size, color }} />
}
