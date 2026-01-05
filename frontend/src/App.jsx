import { useRef, useEffect } from 'react'
import { useVoiceChat } from './hooks/useVoiceChat'
import { CallOverlay } from './components/CallOverlay/CallOverlay'

// MUI Icons
import PhoneIcon from '@mui/icons-material/Phone'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import HeadsetMicIcon from '@mui/icons-material/HeadsetMic'
import PersonIcon from '@mui/icons-material/Person'

function VoiceChat() {
  const {
    roomId,
    setRoomId,
    userId,
    setUserId,
    peerId,
    connectionStatus,
    isInRoom,
    isInCall,
    isMuted,
    callStatus,
    // Incoming call state
    hasIncomingCall,
    incomingCallFrom,
    callEndedData,
    callStartTime,
    // Actions
    handleJoin,
    startCall,
    toggleMute,
    hangUp,
    acceptCall,
    declineCall,
    setRemoteAudioElement
  } = useVoiceChat()

  const remoteAudioRef = useRef(null)

  useEffect(() => {
    if (remoteAudioRef.current) {
      setRemoteAudioElement(remoteAudioRef.current)
    }
  }, [setRemoteAudioElement])

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">
            <HeadsetMicIcon />
          </div>
          <div>
            <div className="header-title">Voice Connect</div>
            <div className="header-subtitle">Enterprise Communication</div>
          </div>
        </div>
        <div className="header-status">
          <span className={`header-status-dot ${connectionStatus}`} />
          <span>{connectionStatus === 'connected' ? 'Online' : connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content main-content-centered">
        {/* Conference Setup Card */}
        <div className="card card-wide">
          <div className="card-header">
            <h2 className="card-title">Conference Room</h2>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="roomId">Room ID</label>
                <input
                  type="text"
                  id="roomId"
                  className="form-input"
                  placeholder="Enter conference room ID..."
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  disabled={isInRoom}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="userId">Display Name</label>
                <input
                  type="text"
                  id="userId"
                  className="form-input"
                  placeholder="Enter your name..."
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  disabled={isInRoom}
                />
              </div>
            </div>

            <button
              onClick={handleJoin}
              className={`btn btn-lg btn-block ${isInRoom ? 'btn-danger' : 'btn-primary'}`}
            >
              {isInRoom ? <><LogoutIcon /> Leave Room</> : <><LoginIcon /> Join Room</>}
            </button>

            {isInRoom && (
              <div className="room-status">
                <div className="room-status-item">
                  <span className="room-status-label">Room</span>
                  <span className="room-status-value">{roomId}</span>
                </div>
                <div className="room-status-item">
                  <span className="room-status-label">Participant</span>
                  <span className="room-status-value">
                    {peerId ? (
                      <><PersonIcon sx={{ width: 18, height: 18, verticalAlign: 'middle', marginRight: '4px' }} />{peerId}</>
                    ) : (
                      <span className="waiting-text">Waiting for others...</span>
                    )}
                  </span>
                </div>
                {peerId && !isInCall && callStatus !== 'Calling...' && (
                  <button
                    onClick={startCall}
                    className="btn btn-success btn-call"
                  >
                    <PhoneIcon /> Call {peerId}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Call Overlay */}
      <CallOverlay
        hasIncomingCall={hasIncomingCall}
        incomingCallFrom={incomingCallFrom}
        callStatus={callStatus}
        isInCall={isInCall}
        callEndedData={callEndedData}
        callStartTime={callStartTime}
        peerId={peerId}
        isMuted={isMuted}
        onAccept={acceptCall}
        onDecline={declineCall}
        onHangup={hangUp}
        onMuteToggle={toggleMute}
      />

      <audio ref={remoteAudioRef} autoPlay />
    </div>
  )
}

export default VoiceChat
