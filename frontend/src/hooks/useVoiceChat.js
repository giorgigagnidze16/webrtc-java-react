import { useState, useRef, useCallback, useEffect } from 'react'

const API_BASE_URL = '/api/signaling'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:138.68.107.106:3478' },
    {
      urls: [
        'turn:138.68.107.106:3478?transport=udp',
        'turn:138.68.107.106:3478?transport=tcp'
      ],
      username: 'admin',
      credential: 'admin'
    }
  ]
}

function generateUserId() {
  return 'User-' + Math.random().toString(36).substring(2, 7)
}

export function useVoiceChat() {
  const [roomId, setRoomId] = useState('room-1')
  const [userId, setUserId] = useState(generateUserId)
  const [peerId, setPeerId] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [isInRoom, setIsInRoom] = useState(false)
  const [isInCall, setIsInCall] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [callStatus, setCallStatus] = useState('Idle')
  const [logs, setLogs] = useState([])

  const eventSourceRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const isCallerRef = useRef(false)

  const log = useCallback((message, type = 'info') => {
    const now = new Date()
    const time = now.toLocaleTimeString('en-US', { hour12: false })
    setLogs(prev => [...prev, { time, message, type }])
    console.log(`[${time}] ${message}`)
  }, [])

  const sendSignalingMessage = useCallback(async (endpoint, message) => {
    const url = `${API_BASE_URL}/${endpoint}`
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
      return await response.text()
    } catch (error) {
      log(`Failed to send ${endpoint}: ${error.message}`, 'error')
      throw error
    }
  }, [log])

  const cleanup = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
    setPeerId(null)
    setConnectionStatus('disconnected')
    setIsInRoom(false)
    setIsInCall(false)
    setCallStatus('Idle')
  }, [])

  const hangUp = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    setIsInCall(false)
    isCallerRef.current = false
    setCallStatus('Idle')
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null
    }
    log('Call ended', 'info')
  }, [log])

  const createPeerConnection = useCallback(async (currentRoomId, currentUserId) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConnectionRef.current = pc

    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current)
    })

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        try {
          await sendSignalingMessage('ice-candidate', {
            type: 'ice-candidate',
            roomId: currentRoomId,
            senderId: currentUserId,
            payload: event.candidate.toJSON()
          })
        } catch (error) {
          log(`Failed to send ICE candidate: ${error.message}`, 'error')
        }
      }
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      log(`Connection state: ${state}`, 'info')
      switch (state) {
        case 'connected':
          setIsInCall(true)
          setCallStatus('Connected')
          log('Call connected!', 'success')
          break
        case 'disconnected':
        case 'failed':
          hangUp()
          break
      }
    }

    pc.oniceconnectionstatechange = () => {
      log(`ICE state: ${pc.iceConnectionState}`, 'info')
    }

    pc.ontrack = (event) => {
      log('Received remote audio stream', 'success')
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0]
      }
    }

    log('Peer connection created', 'info')
    return pc
  }, [sendSignalingMessage, log, hangUp])

  const handleOffer = useCallback(async (message, currentRoomId, currentUserId) => {
    setPeerId(message.senderId)
    isCallerRef.current = false
    log(`Incoming call from ${message.senderId}`, 'info')

    try {
      const pc = await createPeerConnection(currentRoomId, currentUserId)
      await pc.setRemoteDescription(new RTCSessionDescription(message.payload))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      await sendSignalingMessage('answer', {
        type: 'answer',
        roomId: currentRoomId,
        senderId: currentUserId,
        payload: { type: answer.type, sdp: answer.sdp }
      })
      log('Answer sent', 'info')
    } catch (error) {
      log(`Failed to handle offer: ${error.message}`, 'error')
    }
  }, [createPeerConnection, sendSignalingMessage, log])

  const handleAnswer = useCallback(async (message) => {
    try {
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(message.payload)
      )
      log('Answer received', 'info')
    } catch (error) {
      log(`Failed to handle answer: ${error.message}`, 'error')
    }
  }, [log])

  const handleIceCandidate = useCallback(async (message) => {
    try {
      if (peerConnectionRef.current && message.payload) {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(message.payload)
        )
      }
    } catch (error) {
      log(`Failed to add ICE candidate: ${error.message}`, 'error')
    }
  }, [log])

  const connectSSE = useCallback((currentUserId, currentRoomId) => {
    return new Promise((resolve, reject) => {
      const sseUrl = `${API_BASE_URL}/events/${encodeURIComponent(currentUserId)}`
      log(`Connecting to SSE at ${sseUrl}...`, 'info')
      setConnectionStatus('connecting')

      const eventSource = new EventSource(sseUrl)
      eventSourceRef.current = eventSource

      let resolved = false
      const connectionTimeout = setTimeout(() => {
        if (!resolved) {
          reject(new Error('SSE connection timeout'))
        }
      }, 10000)

      eventSource.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data)
          log(`Received: ${message.type}`, 'info')

          switch (message.type) {
            case 'connected':
              if (!resolved) {
                resolved = true
                clearTimeout(connectionTimeout)
                setConnectionStatus('connected')
                log('Connected to signaling server', 'success')
                resolve()
              }
              break
            case 'user-joined':
              setPeerId(message.senderId)
              log(`${message.senderId} joined the room`, 'success')
              break
            case 'user-left':
              log(`${message.senderId} left the room`, 'info')
              setPeerId(null)
              if (peerConnectionRef.current) {
                hangUp()
              }
              break
            case 'offer':
              handleOffer(message, currentRoomId, currentUserId)
              break
            case 'answer':
              handleAnswer(message)
              break
            case 'ice-candidate':
              handleIceCandidate(message)
              break
            case 'room-full':
              log('Room is full (max 2 users)', 'error')
              cleanup()
              break
          }
        } catch (e) {
          log(`Failed to parse SSE message: ${e.message}`, 'error')
        }
      })

      eventSource.addEventListener('open', () => {
        log('SSE connection opened', 'info')
      })

      eventSource.addEventListener('error', () => {
        if (eventSource.readyState === EventSource.CLOSED) {
          log('SSE connection closed', 'error')
          setConnectionStatus('disconnected')
          cleanup()
        } else if (eventSource.readyState === EventSource.CONNECTING) {
          log('SSE reconnecting...', 'info')
          setConnectionStatus('connecting')
        }
      })
    })
  }, [log, cleanup, hangUp, handleOffer, handleAnswer, handleIceCandidate])

  const getLocalStream = useCallback(async () => {
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      })
      log('Microphone access granted', 'success')
    } catch (error) {
      throw new Error('Could not access microphone: ' + error.message)
    }
  }, [log])

  const joinRoom = useCallback(async () => {
    const trimmedRoomId = roomId.trim()
    const trimmedUserId = userId.trim()

    if (!trimmedRoomId || !trimmedUserId) {
      log('Please enter Room ID and Name', 'error')
      return
    }

    try {
      await getLocalStream()
      await connectSSE(trimmedUserId, trimmedRoomId)
      await sendSignalingMessage('join', {
        type: 'join',
        roomId: trimmedRoomId,
        senderId: trimmedUserId
      })
      setIsInRoom(true)
      log(`Joined room: ${trimmedRoomId}`, 'success')
    } catch (error) {
      log(`Failed to join: ${error.message}`, 'error')
    }
  }, [roomId, userId, getLocalStream, connectSSE, sendSignalingMessage, log])

  const leaveRoom = useCallback(async () => {
    if (connectionStatus !== 'disconnected' && userId) {
      try {
        await sendSignalingMessage('leave', {
          type: 'leave',
          roomId,
          senderId: userId
        })
      } catch {
        // Ignore errors when leaving
      }
    }
    cleanup()
    log('Left room', 'info')
  }, [connectionStatus, userId, roomId, sendSignalingMessage, cleanup, log])

  const handleJoin = useCallback(async () => {
    if (isInRoom) {
      await leaveRoom()
    } else {
      await joinRoom()
    }
  }, [isInRoom, leaveRoom, joinRoom])

  const startCall = useCallback(async () => {
    if (!peerId) {
      log('No peer to call', 'error')
      return
    }

    isCallerRef.current = true
    log('Starting call...', 'info')

    try {
      const pc = await createPeerConnection(roomId, userId)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      await sendSignalingMessage('offer', {
        type: 'offer',
        roomId,
        senderId: userId,
        payload: { type: offer.type, sdp: offer.sdp }
      })
      log('Offer sent', 'info')
      setCallStatus('Calling...')
    } catch (error) {
      log(`Failed to start call: ${error.message}`, 'error')
    }
  }, [peerId, roomId, userId, createPeerConnection, sendSignalingMessage, log])

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return

    const newMuted = !isMuted
    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = !newMuted
    })
    setIsMuted(newMuted)
    log(newMuted ? 'Microphone muted' : 'Microphone unmuted', 'info')
  }, [isMuted, log])

  const setRemoteAudioElement = useCallback((element) => {
    remoteAudioRef.current = element
  }, [])

  useEffect(() => {
    log('Application initialized', 'info')
    return () => {
      cleanup()
    }
  }, [])

  return {
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
  }
}