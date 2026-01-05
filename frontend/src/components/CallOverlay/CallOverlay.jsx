import { useMemo } from 'react'
import { Avatar } from './Avatar'
import { PulseRings } from './PulseRings'
import { IncomingCallControls, OutgoingCallControls, InCallControls } from './CallControls'
import { useCallTimer } from '../../hooks/useCallTimer'
import './CallOverlay.css'

function IncomingCallScreen({ callerName, onAccept, onDecline }) {
  return (
    <>
      <div className="call-screen">
        <div className="call-avatar-container">
          <PulseRings />
          <Avatar name={callerName} />
        </div>
        <div className="call-info">
          <div className="call-peer-name">{callerName}</div>
          <div className="call-status-text">Incoming voice call...</div>
        </div>
      </div>
      <IncomingCallControls onAccept={onAccept} onDecline={onDecline} />
    </>
  )
}

function OutgoingCallScreen({ calleeName, onCancel }) {
  return (
    <>
      <div className="call-screen">
        <div className="call-avatar-container">
          <PulseRings />
          <Avatar name={calleeName} />
        </div>
        <div className="call-info">
          <div className="call-peer-name">{calleeName}</div>
          <div className="call-status-text">Calling...</div>
        </div>
      </div>
      <OutgoingCallControls onCancel={onCancel} />
    </>
  )
}

function InCallScreen({ peerName, callStartTime, isMuted, onMuteToggle, onHangup }) {
  const { formatted } = useCallTimer(callStartTime)

  return (
    <>
      <div className="call-screen">
        <div className="call-avatar-container">
          <Avatar name={peerName} />
        </div>
        <div className="call-info">
          <div className="call-peer-name">{peerName}</div>
          <div className="call-timer">{formatted}</div>
        </div>
      </div>
      <InCallControls
        isMuted={isMuted}
        onMuteToggle={onMuteToggle}
        onHangup={onHangup}
      />
    </>
  )
}

function CallEndedScreen({ peerName, duration }) {
  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return 'No answer'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs}s`
    return `${mins}m ${secs}s`
  }

  return (
    <div className="call-screen call-ended-screen">
      <div className="call-avatar-container">
        <Avatar name={peerName} />
      </div>
      <div className="call-info">
        <div className="call-peer-name">{peerName || 'Unknown'}</div>
        <div className="call-status-text">Call ended</div>
        <div className="call-ended-duration">{formatDuration(duration)}</div>
      </div>
    </div>
  )
}

export function CallOverlay({
  hasIncomingCall,
  incomingCallFrom,
  callStatus,
  isInCall,
  callEndedData,
  callStartTime,
  peerId,
  isMuted,
  onAccept,
  onDecline,
  onHangup,
  onMuteToggle
}) {
  const currentScreen = useMemo(() => {
    if (callEndedData) return 'ended'
    if (hasIncomingCall) return 'incoming'
    if (callStatus === 'Calling...') return 'outgoing'
    if (isInCall && callStatus === 'Connected') return 'incall'
    return null
  }, [callEndedData, hasIncomingCall, callStatus, isInCall])

  if (!currentScreen) return null

  return (
    <div className="call-overlay">
      {currentScreen === 'incoming' && (
        <IncomingCallScreen
          callerName={incomingCallFrom}
          onAccept={onAccept}
          onDecline={onDecline}
        />
      )}
      {currentScreen === 'outgoing' && (
        <OutgoingCallScreen
          calleeName={peerId}
          onCancel={onHangup}
        />
      )}
      {currentScreen === 'incall' && (
        <InCallScreen
          peerName={peerId}
          callStartTime={callStartTime}
          isMuted={isMuted}
          onMuteToggle={onMuteToggle}
          onHangup={onHangup}
        />
      )}
      {currentScreen === 'ended' && (
        <CallEndedScreen
          peerName={callEndedData?.peerName}
          duration={callEndedData?.duration}
        />
      )}
    </div>
  )
}
