import { useRef, useEffect } from 'react'
import { useVoiceChat } from './hooks/useVoiceChat'

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

  return (
    <div className="container">
      <h1>{'\u{1F399}\uFE0F'} Voice Chat</h1>

      <div className="input-group">
        <label htmlFor="roomId">Room ID</label>
        <input
          type="text"
          id="roomId"
          placeholder="Enter a room name..."
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
      </div>

      <div className="input-group">
        <label htmlFor="userId">Your Name</label>
        <input
          type="text"
          id="userId"
          placeholder="Enter your name..."
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
      </div>

      <div className="button-group">
        <button
          onClick={handleJoin}
          className={isInRoom ? 'btn-hangup' : 'btn-join'}
        >
          <span>{isInRoom ? '\u{1F6AA}' : '\u{1F4E1}'}</span>
          {isInRoom ? 'Leave Room' : 'Join Room'}
        </button>
      </div>

      {isInRoom && (
        <div className="button-group">
          <button
            onClick={startCall}
            className="btn-call"
            disabled={!peerId || isInCall}
          >
            <span>{'\u{1F4DE}'}</span> Call
          </button>
          <button
            onClick={toggleMute}
            className={`btn-mute ${isMuted ? 'muted' : ''}`}
            disabled={!isInCall}
          >
            <span>{isMuted ? '\u{1F507}' : '\u{1F3A4}'}</span>
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          <button
            onClick={hangUp}
            className="btn-hangup"
            disabled={!isInCall}
          >
            <span>{'\u{1F4F5}'}</span> Hang Up
          </button>
        </div>
      )}

      <div className="status-panel">
        <div className="status-row">
          <span className="status-label">Connection</span>
          <span className="status-value">
            <span className={`status-dot ${connectionStatus}`} />
            <span>
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          </span>
        </div>
        <div className="status-row">
          <span className="status-label">Room</span>
          <span className="status-value">
            {isInRoom ? roomId : 'Not joined'}
          </span>
        </div>
        <div className="status-row">
          <span className="status-label">Peer</span>
          <span className="status-value">
            {peerId || (isInRoom ? 'Waiting for peer...' : 'No peer')}
          </span>
        </div>
        <div className="status-row">
          <span className="status-label">Call</span>
          <span className="status-value">{callStatus}</span>
        </div>
      </div>

      <div className={`audio-visualizer ${isInCall ? 'call-active' : ''}`}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="audio-bar" />
        ))}
      </div>

      <div className="log-panel" ref={logPanelRef}>
        {logs.map((entry, index) => (
          <div key={index} className="log-entry">
            <span className="log-time">{entry.time}</span>
            <span className={`log-message ${entry.type}`}>{entry.message}</span>
          </div>
        ))}
      </div>

      <audio ref={remoteAudioRef} autoPlay />
    </div>
  )
}

export default VoiceChat