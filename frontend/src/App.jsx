import { useRef, useEffect } from 'react'
import { useVoiceChat } from './hooks/useVoiceChat'

// MUI Icons
import PhoneIcon from '@mui/icons-material/Phone'
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
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
    logs,
    handleJoin,
    startCall,
    toggleMute,
    hangUp,
    setRemoteAudioElement
  } = useVoiceChat()

  const remoteAudioRef = useRef(null)
  const logPanelRef = useRef(null)

  useEffect(() => {
    if (remoteAudioRef.current) {
      setRemoteAudioElement(remoteAudioRef.current)
    }
  }, [setRemoteAudioElement])

  useEffect(() => {
    if (logPanelRef.current) {
      logPanelRef.current.scrollTop = logPanelRef.current.scrollHeight
    }
  }, [logs])

  const getConnectionStatusBadge = () => {
    if (connectionStatus === 'connected') {
      return <span className="status-badge status-badge-success">Connected</span>
    } else if (connectionStatus === 'connecting') {
      return <span className="status-badge status-badge-warning">Connecting...</span>
    }
    return <span className="status-badge status-badge-neutral">Disconnected</span>
  }

  const getCallStatusBadge = () => {
    if (callStatus === 'Connected') {
      return <span className="status-badge status-badge-success">In Call</span>
    } else if (callStatus === 'Calling...') {
      return <span className="status-badge status-badge-warning">Calling...</span>
    }
    return <span className="status-badge status-badge-neutral">Idle</span>
  }

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
      <main className="main-content">
        {/* Left Column - Conference Setup */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Conference Room</h2>
          </div>
          <div className="card-body">
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

            <button
              onClick={handleJoin}
              className={`btn btn-lg btn-block ${isInRoom ? 'btn-danger' : 'btn-primary'}`}
            >
              {isInRoom ? <><LogoutIcon /> Leave Room</> : <><LoginIcon /> Join Room</>}
            </button>

            {isInRoom && (
              <div className="call-controls">
                <button
                  onClick={startCall}
                  className="btn btn-success"
                  disabled={!peerId || isInCall}
                >
                  <PhoneIcon /> Call
                </button>
                <button
                  onClick={toggleMute}
                  className={`btn ${isMuted ? 'btn-secondary active' : 'btn-secondary'}`}
                  disabled={!isInCall}
                >
                  {isMuted ? <><MicOffIcon /> Muted</> : <><MicIcon /> Mute</>}
                </button>
                <button
                  onClick={() => hangUp()}
                  className="btn btn-danger"
                  disabled={!isInCall}
                >
                  <CallEndIcon /> End
                </button>
              </div>
            )}

            {/* Audio Visualizer */}
            <div className={`audio-visualizer ${isInCall ? 'active' : ''}`}>
              {[...Array(12)].map((_, i) => (
                <div key={i} className="audio-bar" />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Status & Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Status Card */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Session Status</h2>
            </div>
            <div className="card-body">
              <div className="status-list">
                <div className="status-item">
                  <span className="status-item-label">Connection</span>
                  <span className="status-item-value">{getConnectionStatusBadge()}</span>
                </div>
                <div className="status-item">
                  <span className="status-item-label">Room</span>
                  <span className="status-item-value">
                    {isInRoom ? roomId : <span style={{ color: 'var(--gray-400)' }}>Not joined</span>}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-item-label">Participant</span>
                  <span className="status-item-value">
                    {peerId ? (
                      <><PersonIcon sx={{ width: 18, height: 18 }} /> {peerId}</>
                    ) : (
                      <span style={{ color: 'var(--gray-400)' }}>{isInRoom ? 'Waiting...' : 'None'}</span>
                    )}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-item-label">Call Status</span>
                  <span className="status-item-value">{getCallStatusBadge()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Log Card */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-header">
              <h2 className="card-title">Activity Log</h2>
            </div>
            <div className="card-body">
              <div className="log-panel" ref={logPanelRef}>
                {logs.length === 0 ? (
                  <div className="empty-state">
                    <p>No activity yet</p>
                  </div>
                ) : (
                  logs.map((entry, index) => (
                    <div key={index} className="log-entry">
                      <span className="log-time">{entry.time}</span>
                      <span className={`log-message ${entry.type}`}>{entry.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <audio ref={remoteAudioRef} autoPlay />
    </div>
  )
}

export default VoiceChat