import CallIcon from '@mui/icons-material/Call'
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'

function ControlButton({ icon, variant, size = 'normal', active = false, onClick, label }) {
  const sizeClass = size === 'large' ? 'large' : ''
  const activeClass = active ? 'active' : ''

  return (
    <div className="control-btn-wrapper">
      <button
        className={`call-control-btn ${variant} ${sizeClass} ${activeClass}`}
        onClick={onClick}
        aria-label={label}
      >
        {icon}
      </button>
      {label && <span className="control-btn-label">{label}</span>}
    </div>
  )
}

export function IncomingCallControls({ onAccept, onDecline }) {
  return (
    <div className="call-controls spread">
      <ControlButton
        icon={<CallEndIcon />}
        variant="decline"
        size="large"
        onClick={onDecline}
        label="Decline"
      />
      <ControlButton
        icon={<CallIcon />}
        variant="accept"
        size="large"
        onClick={onAccept}
        label="Accept"
      />
    </div>
  )
}

export function OutgoingCallControls({ onCancel }) {
  return (
    <div className="call-controls">
      <ControlButton
        icon={<CallEndIcon />}
        variant="hangup"
        size="large"
        onClick={onCancel}
        label="Cancel"
      />
    </div>
  )
}

export function InCallControls({ isMuted, onMuteToggle, onHangup }) {
  return (
    <div className="call-controls">
      <ControlButton
        icon={isMuted ? <MicOffIcon /> : <MicIcon />}
        variant="mute"
        active={isMuted}
        onClick={onMuteToggle}
        label={isMuted ? 'Unmute' : 'Mute'}
      />
      <ControlButton
        icon={<CallEndIcon />}
        variant="hangup"
        size="large"
        onClick={onHangup}
        label="End"
      />
    </div>
  )
}
