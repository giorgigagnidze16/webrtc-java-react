# WebRTC Voice Chat Application

A simple 1-to-1 voice chat application using WebRTC for peer-to-peer audio communication and Spring Boot as the signaling server.

## 🏗️ Architecture

```
┌─────────────────┐                    ┌─────────────────┐
│   Browser A     │                    │   Browser B     │
│  (Caller)       │                    │  (Callee)       │
│                 │                    │                 │
│  ┌───────────┐  │                    │  ┌───────────┐  │
│  │  WebRTC   │◄─┼────Audio Stream────┼─►│  WebRTC   │  │
│  │  Audio    │  │    (P2P Direct)    │  │  Audio    │  │
│  └───────────┘  │                    │  └───────────┘  │
│        │        │                    │        │        │
│        ▼        │                    │        ▼        │
│  ┌───────────┐  │                    │  ┌───────────┐  │
│  │ WebSocket │  │                    │  │ WebSocket │  │
│  │  Client   │  │                    │  │  Client   │  │
│  └─────┬─────┘  │                    │  └─────┬─────┘  │
└────────┼────────┘                    └────────┼────────┘
         │                                      │
         │      Signaling Messages              │
         │      (SDP + ICE Candidates)          │
         │                                      │
         ▼                                      ▼
    ┌─────────────────────────────────────────────────┐
    │           Spring Boot Signaling Server          │
    │                                                 │
    │  ┌─────────────────────────────────────────┐   │
    │  │         WebSocket Handler               │   │
    │  │   - Room Management                     │   │
    │  │   - Message Forwarding                  │   │
    │  │   - User Tracking                       │   │
    │  └─────────────────────────────────────────┘   │
    └─────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
webrtc-voice-chat/
├── pom.xml                                    # Maven configuration
├── README.md                                  # This file
└── src/
    └── main/
        ├── java/
        │   └── com/example/voicechat/
        │       ├── VoiceChatApplication.java  # Spring Boot entry point
        │       ├── config/
        │       │   └── WebSocketConfig.java   # WebSocket configuration
        │       ├── controller/
        │       │   └── SignalingHandler.java  # WebSocket message handler
        │       └── model/
        │           └── SignalingMessage.java  # Message model
        └── resources/
            ├── application.properties          # App configuration
            └── static/
                ├── index.html                  # Web UI
                └── app.js                      # WebRTC client logic
```

## 🔧 Prerequisites

- **Java 17+** - Required for Spring Boot 3.x
- **Maven 3.6+** - For building the project
- **Modern browser** - Chrome, Firefox, Edge, or Safari with WebRTC support
- **Microphone** - For voice chat

## 🚀 Running the Application

### Option 1: Using Maven Wrapper (Recommended)

```bash
# Navigate to project directory
cd webrtc-voice-chat

# Run with Maven
./mvnw spring-boot:run
```

### Option 2: Using Maven

```bash
# Navigate to project directory
cd webrtc-voice-chat

# Build the project
mvn clean package

# Run the JAR
java -jar target/webrtc-voice-chat-1.0.0.jar
```

### Option 3: Using an IDE

1. Import the project as a Maven project
2. Run `VoiceChatApplication.java` as a Java application

## 📱 Usage Instructions

### Step 1: Start the Server
```bash
./mvnw spring-boot:run
```
You should see:
```
Started VoiceChatApplication in X.XXX seconds
```

### Step 2: Open Two Browser Windows
Open **two separate browser windows** (or tabs) to:
```
http://localhost:8080
```

### Step 3: Join the Same Room
In **Browser 1**:
1. Enter a Room ID (e.g., "test-room")
2. Enter your name (e.g., "Alice")
3. Click **"Join Room"**
4. Allow microphone access when prompted

In **Browser 2**:
1. Enter the **same** Room ID ("test-room")
2. Enter a different name (e.g., "Bob")
3. Click **"Join Room"**
4. Allow microphone access

### Step 4: Make a Call
1. In either browser, click **"Call"**
2. The other browser will automatically answer
3. Start talking! 🎉

### Step 5: During the Call
- Click **"Mute"** to mute your microphone
- Click **"Hang Up"** to end the call
- Click **"Leave Room"** to leave the room entirely

## 🔌 Signaling Protocol

The application uses WebSocket for signaling with these message types:

| Type | Direction | Description |
|------|-----------|-------------|
| `join` | Client → Server | User joins a room |
| `user-joined` | Server → Client | Notification of new peer |
| `user-left` | Server → Client | Notification peer left |
| `offer` | Client → Server → Client | SDP offer from caller |
| `answer` | Client → Server → Client | SDP answer from callee |
| `ice-candidate` | Client → Server → Client | ICE candidate exchange |
| `room-full` | Server → Client | Room already has 2 users |
| `leave` | Client → Server | User leaves the room |

### Message Format
```json
{
  "type": "offer",
  "roomId": "test-room",
  "senderId": "Alice",
  "payload": {
    "type": "offer",
    "sdp": "v=0\r\no=- ..."
  }
}
```

## 🌐 WebRTC Flow

```
Alice                    Server                    Bob
  │                         │                        │
  │──── join ──────────────►│                        │
  │                         │                        │
  │                         │◄─────── join ──────────│
  │                         │                        │
  │◄─── user-joined ────────│                        │
  │                         │──── user-joined ──────►│
  │                         │                        │
  │──── offer ─────────────►│                        │
  │                         │──── offer ────────────►│
  │                         │                        │
  │                         │◄─── answer ────────────│
  │◄─── answer ─────────────│                        │
  │                         │                        │
  │◄───── ICE candidates exchanged ─────────────────►│
  │                         │                        │
  │◄════════════ P2P Audio Stream ══════════════════►│
```

## 🔒 Security Notes

- This is a **development example** - not for production use without modifications
- For production, add:
  - **HTTPS/WSS** - Required for WebRTC in most browsers
  - **Authentication** - Verify users before joining rooms
  - **TURN servers** - For NAT traversal when STUN fails
  - **Rate limiting** - Prevent abuse

## 🛠️ Configuration

### application.properties
```properties
# Change port
server.port=8080

# Adjust logging
logging.level.com.example.voicechat=DEBUG
```

### STUN/TURN Servers
Edit `app.js` to add your own ICE servers:
```javascript
this.iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: 'turn:your-turn-server.com:3478',
            username: 'user',
            credential: 'password'
        }
    ]
};
```

## 🐛 Troubleshooting

### No audio after connecting?
- Check browser console for errors
- Ensure microphone permission was granted
- Try using headphones to avoid echo

### Connection fails?
- Both users must be in the same room
- Check if firewall blocks WebSocket (port 8080)
- Try different browsers

### "Room is full" error?
- Each room supports only 2 users
- Use a different room name

### WebSocket connection fails?
- Ensure server is running on port 8080
- Check browser console for connection errors

## 📚 Technologies Used

- **Spring Boot 3.2** - Backend framework
- **Spring WebSocket** - Signaling server
- **WebRTC** - Peer-to-peer audio
- **Vanilla JavaScript** - Frontend (no frameworks)
- **HTML5/CSS3** - Modern UI

## 📄 License

MIT License - Feel free to use and modify!
