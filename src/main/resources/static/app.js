/**
 * WebRTC Voice Chat Application
 *
 * This handles:
 * - SSE connection for receiving signaling events from server
 * - HTTP POST requests for sending signaling messages to server
 * - WebRTC peer connection management
 * - Audio stream handling
 * - UI updates
 */

class VoiceChat {
    constructor() {
        // SSE and WebRTC connections
        this.eventSource = null;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;

        // User info
        this.userId = null;
        this.roomId = null;
        this.peerId = null;

        // State
        this.isConnected = false;
        this.isInRoom = false;
        this.isInCall = false;
        this.isMuted = false;
        this.isCaller = false;

        // API base URL
        this.apiBaseUrl = '/api/signaling';

        // ICE servers configuration
        this.iceServers = {
            iceServers: [
                { urls: 'stun:138.68.107.106:3478' },
                {
                    urls: [
                        'turn:138.68.107.106:3478?transport=udp',
                        'turn:138.68.107.106:3478?transport=tcp'
                    ],
                    username: 'admin',
                    credential: 'admin'
                },
            ]
        };

        // DOM Elements
        this.elements = {
            roomId: document.getElementById('roomId'),
            userId: document.getElementById('userId'),
            joinBtn: document.getElementById('joinBtn'),
            callBtn: document.getElementById('callBtn'),
            muteBtn: document.getElementById('muteBtn'),
            hangupBtn: document.getElementById('hangupBtn'),
            callControls: document.getElementById('callControls'),
            connectionDot: document.getElementById('connectionDot'),
            connectionStatus: document.getElementById('connectionStatus'),
            statusConnection: document.getElementById('statusConnection'),
            statusCall: document.getElementById('statusCall'),
            roomStatus: document.getElementById('roomStatus'),
            peerStatus: document.getElementById('peerStatus'),
            audioVisualizer: document.getElementById('audioVisualizer'),
            logPanel: document.getElementById('logPanel'),
            remoteAudio: document.getElementById('remoteAudio')
        };

        // Bind event handlers
        this.bindEvents();

        // Generate random user ID
        this.elements.userId.value = 'User-' + Math.random().toString(36).substring(2, 7);

        this.log('Application initialized', 'info');
    }

    /**
     * Bind UI event handlers
     */
    bindEvents() {
        this.elements.joinBtn.addEventListener('click', () => this.handleJoin());
        this.elements.callBtn.addEventListener('click', () => this.startCall());
        this.elements.muteBtn.addEventListener('click', () => this.toggleMute());
        this.elements.hangupBtn.addEventListener('click', () => this.hangUp(true));
    }

    /**
     * Handle join button click
     */
    async handleJoin() {
        if (this.isConnected) {
            this.leaveRoom();
        } else {
            await this.joinRoom();
        }
    }

    /**
     * Connect to signaling server and join room
     */
    async joinRoom() {
        this.roomId = this.elements.roomId.value.trim();
        this.userId = this.elements.userId.value.trim();

        if (!this.roomId || !this.userId) {
            this.log('Please enter Room ID and Name', 'error');
            return;
        }

        try {
            // Get local audio stream first
            await this.getLocalStream();

            // Connect to SSE endpoint
            await this.connectSSE();

            // Send join request via HTTP
            await this.sendSignalingMessage('join', {
                type: 'join',
                roomId: this.roomId,
                senderId: this.userId
            });

            this.isInRoom = true;
            this.updateUI();
            this.log(`Joined room: ${this.roomId}`, 'success');

        } catch (error) {
            this.log(`Failed to join: ${error.message}`, 'error');
        }
    }

    /**
     * Get local audio stream
     */
    async getLocalStream() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
            this.log('Microphone access granted', 'success');
        } catch (error) {
            throw new Error('Could not access microphone: ' + error.message);
        }
    }

    /**
     * Connect to SSE endpoint for receiving server events
     */
    connectSSE() {
        return new Promise((resolve, reject) => {
            const sseUrl = `${this.apiBaseUrl}/events/${encodeURIComponent(this.userId)}`;

            this.log(`Connecting to SSE at ${sseUrl}...`, 'info');
            this.updateConnectionStatus('connecting');

            this.eventSource = new EventSource(sseUrl);

            this.eventSource.addEventListener('message', (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleSignalingMessage(message);
                } catch (e) {
                    this.log(`Failed to parse SSE message: ${e.message}`, 'error');
                }
            });

            this.eventSource.addEventListener('open', () => {
                this.log('SSE connection opened', 'info');
            });

            this.eventSource.addEventListener('error', (error) => {
                if (this.eventSource.readyState === EventSource.CLOSED) {
                    this.log('SSE connection closed', 'error');
                    this.isConnected = false;
                    this.updateConnectionStatus('disconnected');
                    this.cleanup();
                } else if (this.eventSource.readyState === EventSource.CONNECTING) {
                    this.log('SSE reconnecting...', 'info');
                    this.updateConnectionStatus('connecting');
                }
            });

            // Wait for the connected message from server
            const connectionTimeout = setTimeout(() => {
                reject(new Error('SSE connection timeout'));
            }, 10000);

            const originalHandler = this.handleSignalingMessage.bind(this);
            this.handleSignalingMessage = (message) => {
                if (message.type === 'connected') {
                    clearTimeout(connectionTimeout);
                    this.isConnected = true;
                    this.updateConnectionStatus('connected');
                    this.log('Connected to signaling server', 'success');
                    this.handleSignalingMessage = originalHandler;
                    resolve();
                } else {
                    originalHandler(message);
                }
            };
        });
    }

    /**
     * Send signaling message via HTTP POST
     */
    async sendSignalingMessage(endpoint, message) {
        const url = `${this.apiBaseUrl}/${endpoint}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(message)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            return await response.text();
        } catch (error) {
            this.log(`Failed to send ${endpoint}: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Handle incoming signaling messages from SSE
     */
    async handleSignalingMessage(message) {
        this.log(`Received: ${message.type}`, 'info');

        switch (message.type) {
            case 'connected':
                // Already handled in connectSSE
                break;

            case 'user-joined':
                this.handleUserJoined(message);
                break;

            case 'user-left':
                this.handleUserLeft(message);
                break;

            case 'offer':
                await this.handleOffer(message);
                break;

            case 'answer':
                await this.handleAnswer(message);
                break;

            case 'ice-candidate':
                await this.handleIceCandidate(message);
                break;

            case 'hang-up':
                this.log(`${message.senderId} ended the call`, 'info');
                this.hangUp(false);
                break;

            case 'room-full':
                this.log('Room is full (max 2 users)', 'error');
                this.leaveRoom();
                break;
        }
    }

    /**
     * Handle when another user joins the room
     */
    handleUserJoined(message) {
        this.peerId = message.senderId;
        this.log(`${this.peerId} joined the room`, 'success');
        this.elements.peerStatus.innerHTML = `<span class="material-icons">person</span> ${this.peerId}`;
        this.elements.peerStatus.style.color = '';
        this.elements.callBtn.disabled = false;
    }

    /**
     * Handle when user leaves the room
     */
    handleUserLeft(message) {
        this.log(`${message.senderId} left the room`, 'info');
        this.peerId = null;
        this.elements.peerStatus.textContent = 'None';
        this.elements.peerStatus.style.color = 'var(--gray-400)';
        this.elements.callBtn.disabled = true;

        if (this.isInCall) {
            this.hangUp(false);
        }
    }

    /**
     * Start a call (create offer)
     */
    async startCall() {
        if (!this.peerId) {
            this.log('No peer to call', 'error');
            return;
        }

        this.isCaller = true;
        this.log('Starting call...', 'info');

        try {
            await this.createPeerConnection();

            // Create and send offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            await this.sendSignalingMessage('offer', {
                type: 'offer',
                roomId: this.roomId,
                senderId: this.userId,
                payload: {
                    type: offer.type,
                    sdp: offer.sdp
                }
            });

            this.log('Offer sent', 'info');
            this.updateCallStatus('Calling...');

        } catch (error) {
            this.log(`Failed to start call: ${error.message}`, 'error');
        }
    }

    /**
     * Handle incoming offer (create answer)
     */
    async handleOffer(message) {
        this.peerId = message.senderId;
        this.isCaller = false;
        this.log(`Incoming call from ${this.peerId}`, 'info');

        try {
            await this.createPeerConnection();

            // Set remote description
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(message.payload)
            );

            // Create and send answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            await this.sendSignalingMessage('answer', {
                type: 'answer',
                roomId: this.roomId,
                senderId: this.userId,
                payload: {
                    type: answer.type,
                    sdp: answer.sdp
                }
            });

            this.log('Answer sent', 'info');

        } catch (error) {
            this.log(`Failed to handle offer: ${error.message}`, 'error');
        }
    }

    /**
     * Handle incoming answer
     */
    async handleAnswer(message) {
        try {
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(message.payload)
            );
            this.log('Answer received', 'info');
        } catch (error) {
            this.log(`Failed to handle answer: ${error.message}`, 'error');
        }
    }

    /**
     * Handle incoming ICE candidate
     */
    async handleIceCandidate(message) {
        try {
            if (this.peerConnection && message.payload) {
                await this.peerConnection.addIceCandidate(
                    new RTCIceCandidate(message.payload)
                );
            }
        } catch (error) {
            this.log(`Failed to add ICE candidate: ${error.message}`, 'error');
        }
    }

    /**
     * Create WebRTC peer connection
     */
    async createPeerConnection() {
        if (this.peerConnection) {
            this.peerConnection.close();
        }

        this.peerConnection = new RTCPeerConnection(this.iceServers);

        // Add local stream tracks
        this.localStream.getTracks().forEach(track => {
            this.peerConnection.addTrack(track, this.localStream);
        });

        // Handle ICE candidates
        this.peerConnection.onicecandidate = async (event) => {
            if (event.candidate) {
                try {
                    await this.sendSignalingMessage('ice-candidate', {
                        type: 'ice-candidate',
                        roomId: this.roomId,
                        senderId: this.userId,
                        payload: event.candidate.toJSON()
                    });
                } catch (error) {
                    this.log(`Failed to send ICE candidate: ${error.message}`, 'error');
                }
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection.connectionState;
            this.log(`Connection state: ${state}`, 'info');

            switch (state) {
                case 'connected':
                    this.isInCall = true;
                    this.updateCallStatus('Connected');
                    this.elements.audioVisualizer.classList.add('active');
                    this.log('Call connected!', 'success');
                    break;

                case 'disconnected':
                case 'failed':
                    this.hangUp(false);
                    break;
            }

            this.updateUI();
        };

        // Handle ICE connection state
        this.peerConnection.oniceconnectionstatechange = () => {
            this.log(`ICE state: ${this.peerConnection.iceConnectionState}`, 'info');
        };

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            this.log('Received remote audio stream', 'success');
            this.remoteStream = event.streams[0];
            this.elements.remoteAudio.srcObject = this.remoteStream;
        };

        this.log('Peer connection created', 'info');
    }

    /**
     * Toggle mute
     */
    toggleMute() {
        if (!this.localStream) return;

        this.isMuted = !this.isMuted;

        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = !this.isMuted;
        });

        this.elements.muteBtn.classList.toggle('active', this.isMuted);
        this.elements.muteBtn.innerHTML = this.isMuted ?
            '<span class="material-icons">mic_off</span> Muted' :
            '<span class="material-icons">mic</span> Mute';

        this.log(this.isMuted ? 'Microphone muted' : 'Microphone unmuted', 'info');
    }

    /**
     * Hang up the call
     */
    async hangUp(notifyPeer = true) {
        if (notifyPeer && this.peerConnection && this.isInCall) {
            try {
                await this.sendSignalingMessage('hang-up', {
                    type: 'hang-up',
                    roomId: this.roomId,
                    senderId: this.userId
                });
            } catch {
                // Ignore errors when sending hang-up signal
            }
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        this.isInCall = false;
        this.isCaller = false;
        this.updateCallStatus('Idle');
        this.elements.audioVisualizer.classList.remove('active');
        this.elements.remoteAudio.srcObject = null;

        this.log('Call ended', 'info');
        this.updateUI();
    }

    /**
     * Leave the room
     */
    async leaveRoom() {
        // Send leave message via HTTP
        if (this.isConnected && this.userId) {
            try {
                await this.sendSignalingMessage('leave', {
                    type: 'leave',
                    roomId: this.roomId,
                    senderId: this.userId
                });
            } catch (error) {
                // Ignore errors when leaving
            }
        }

        this.cleanup();
        this.log('Left room', 'info');
    }

    /**
     * Clean up connections
     */
    cleanup() {
        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Close SSE connection
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Reset state
        this.isConnected = false;
        this.isInRoom = false;
        this.isInCall = false;
        this.peerId = null;

        this.updateConnectionStatus('disconnected');
        this.updateUI();
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(status) {
        const dot = this.elements.connectionDot;
        const text = this.elements.connectionStatus;
        const statusBadge = this.elements.statusConnection;

        dot.className = 'header-status-dot';

        switch (status) {
            case 'connected':
                dot.classList.add('connected');
                text.textContent = 'Online';
                statusBadge.innerHTML = '<span class="status-badge status-badge-success">Connected</span>';
                break;
            case 'connecting':
                dot.classList.add('connecting');
                text.textContent = 'Connecting...';
                statusBadge.innerHTML = '<span class="status-badge status-badge-warning">Connecting...</span>';
                break;
            default:
                text.textContent = 'Offline';
                statusBadge.innerHTML = '<span class="status-badge status-badge-neutral">Disconnected</span>';
        }
    }

    /**
     * Update call status indicator
     */
    updateCallStatus(status) {
        const statusBadge = this.elements.statusCall;

        switch (status) {
            case 'Connected':
                statusBadge.innerHTML = '<span class="status-badge status-badge-success">In Call</span>';
                break;
            case 'Calling...':
                statusBadge.innerHTML = '<span class="status-badge status-badge-warning">Calling...</span>';
                break;
            default:
                statusBadge.innerHTML = '<span class="status-badge status-badge-neutral">Idle</span>';
        }
    }

    /**
     * Update UI based on current state
     */
    updateUI() {
        const { joinBtn, callBtn, muteBtn, hangupBtn, callControls, roomStatus, peerStatus, roomId, userId } = this.elements;

        if (this.isInRoom) {
            joinBtn.innerHTML = '<span class="material-icons">logout</span> Leave Room';
            joinBtn.className = 'btn btn-danger btn-lg btn-block';
            callControls.classList.add('visible');
            roomStatus.textContent = this.roomId;
            roomStatus.style.color = '';
            roomId.disabled = true;
            userId.disabled = true;

            if (this.peerId) {
                peerStatus.innerHTML = `<span class="material-icons">person</span> ${this.peerId}`;
                peerStatus.style.color = '';
            } else {
                peerStatus.textContent = 'Waiting...';
                peerStatus.style.color = 'var(--gray-400)';
            }
        } else {
            joinBtn.innerHTML = '<span class="material-icons">login</span> Join Room';
            joinBtn.className = 'btn btn-primary btn-lg btn-block';
            callControls.classList.remove('visible');
            roomStatus.textContent = 'Not joined';
            roomStatus.style.color = 'var(--gray-400)';
            peerStatus.textContent = 'None';
            peerStatus.style.color = 'var(--gray-400)';
            roomId.disabled = false;
            userId.disabled = false;
        }

        callBtn.disabled = !this.peerId || this.isInCall;
        muteBtn.disabled = !this.isInCall;
        hangupBtn.disabled = !this.isInCall;
    }

    /**
     * Log message to panel
     */
    log(message, type = 'info') {
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour12: false });

        // Clear empty state if present
        const emptyState = this.elements.logPanel.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-message ${type}">${message}</span>
        `;

        this.elements.logPanel.appendChild(entry);
        this.elements.logPanel.scrollTop = this.elements.logPanel.scrollHeight;

        // Also log to console
        console.log(`[${time}] ${message}`);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.voiceChat = new VoiceChat();
});