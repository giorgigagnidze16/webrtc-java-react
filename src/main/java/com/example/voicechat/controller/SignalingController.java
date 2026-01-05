package com.example.voicechat.controller;

import com.example.voicechat.model.SignalingMessage;
import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * REST + SSE controller for WebRTC signaling.
 * Uses Server-Sent Events for server-to-client push and HTTP POST for client-to-server messages.
 */
@RestController
@RequestMapping("/api/signaling")
@CrossOrigin(origins = "*")
public class SignalingController {

    private static final Logger logger = LoggerFactory.getLogger(SignalingController.class);
    private static final int MAX_USERS_PER_ROOM = 2;
    private static final long SSE_TIMEOUT = 0L; // No timeout (keep connection open)

    private final Gson gson = new Gson();

    // User ID -> SseEmitter (for pushing events to client)
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    // Room ID -> Set of user IDs in that room
    private final Map<String, Set<String>> rooms = new ConcurrentHashMap<>();

    // User ID -> Room ID
    private final Map<String, String> userRoomMap = new ConcurrentHashMap<>();

    /**
     * SSE endpoint - client subscribes to receive signaling events
     */
    @GetMapping(value = "/events/{userId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@PathVariable String userId) {
        logger.info("SSE subscription requested for user: {}", userId);

        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

        // Remove any existing emitter for this user
        SseEmitter existing = emitters.put(userId, emitter);
        if (existing != null) {
            existing.complete();
        }

        emitter.onCompletion(() -> {
            logger.info("SSE connection completed for user: {}", userId);
            handleDisconnect(userId);
        });

        emitter.onTimeout(() -> {
            logger.info("SSE connection timed out for user: {}", userId);
            handleDisconnect(userId);
        });

        emitter.onError(e -> {
            logger.error("SSE error for user {}: {}", userId, e.getMessage());
            handleDisconnect(userId);
        });

        // Send initial connected event
        try {
            SignalingMessage connectedMsg = new SignalingMessage("connected", null, userId, null);
            emitter.send(SseEmitter.event()
                    .name("message")
                    .data(gson.toJson(connectedMsg)));
            logger.info("SSE connection established for user: {}", userId);
        } catch (IOException e) {
            logger.error("Failed to send initial event to user {}: {}", userId, e.getMessage());
            emitter.completeWithError(e);
        }

        return emitter;
    }

    /**
     * Join a room
     */
    @PostMapping("/join")
    public ResponseEntity<String> join(@RequestBody SignalingMessage message) {
        String roomId = message.getRoomId();
        String userId = message.getSenderId();

        logger.info("User {} joining room {}", userId, roomId);

        // Check if user has SSE connection
        if (!emitters.containsKey(userId)) {
            return ResponseEntity.badRequest().body("SSE connection required before joining");
        }

        // Get or create room
        Set<String> room = rooms.computeIfAbsent(roomId, k -> new CopyOnWriteArraySet<>());

        // Check if room is full
        if (room.size() >= MAX_USERS_PER_ROOM) {
            SignalingMessage fullMessage = new SignalingMessage("room-full", roomId, null, null);
            sendToUser(userId, fullMessage);
            logger.warn("Room {} is full, rejecting user {}", roomId, userId);
            return ResponseEntity.ok("room-full");
        }

        // Add user to room
        room.add(userId);
        userRoomMap.put(userId, roomId);

        // Notify other users in the room
        for (String peerId : room) {
            if (!peerId.equals(userId)) {
                SignalingMessage joinedMessage = new SignalingMessage("user-joined", roomId, userId, null);
                sendToUser(peerId, joinedMessage);
                logger.info("Notified {} that {} joined", peerId, userId);
            }
        }

        // If there's already another user, notify the new user
        if (room.size() == 2) {
            for (String peerId : room) {
                if (!peerId.equals(userId)) {
                    SignalingMessage existingUserMessage = new SignalingMessage("user-joined", roomId, peerId, null);
                    sendToUser(userId, existingUserMessage);
                    logger.info("Notified {} about existing user {}", userId, peerId);
                }
            }
        }

        return ResponseEntity.ok("joined");
    }

    /**
     * Send SDP offer to peer
     */
    @PostMapping("/offer")
    public ResponseEntity<String> offer(@RequestBody SignalingMessage message) {
        logger.info("Forwarding offer from {} in room {}", message.getSenderId(), message.getRoomId());
        forwardToOtherPeers(message);
        return ResponseEntity.ok("sent");
    }

    /**
     * Send SDP answer to peer
     */
    @PostMapping("/answer")
    public ResponseEntity<String> answer(@RequestBody SignalingMessage message) {
        logger.info("Forwarding answer from {} in room {}", message.getSenderId(), message.getRoomId());
        forwardToOtherPeers(message);
        return ResponseEntity.ok("sent");
    }

    /**
     * Send ICE candidate to peer
     */
    @PostMapping("/ice-candidate")
    public ResponseEntity<String> iceCandidate(@RequestBody SignalingMessage message) {
        logger.debug("Forwarding ICE candidate from {} in room {}", message.getSenderId(), message.getRoomId());
        forwardToOtherPeers(message);
        return ResponseEntity.ok("sent");
    }

    /**
     * Hang up call - notify peer immediately
     */
    @PostMapping("/hang-up")
    public ResponseEntity<String> hangUp(@RequestBody SignalingMessage message) {
        logger.info("Forwarding hang-up from {} in room {}", message.getSenderId(), message.getRoomId());
        forwardToOtherPeers(message);
        return ResponseEntity.ok("sent");
    }

    /**
     * Leave a room
     */
    @PostMapping("/leave")
    public ResponseEntity<String> leave(@RequestBody SignalingMessage message) {
        String userId = message.getSenderId();
        logger.info("User {} leaving room", userId);
        removeFromRoom(userId);
        return ResponseEntity.ok("left");
    }

    /**
     * Forward a message to other peers in the same room
     */
    private void forwardToOtherPeers(SignalingMessage message) {
        String roomId = message.getRoomId();
        String senderId = message.getSenderId();
        Set<String> room = rooms.get(roomId);

        if (room == null) {
            logger.warn("Room {} not found", roomId);
            return;
        }

        for (String peerId : room) {
            if (!peerId.equals(senderId)) {
                sendToUser(peerId, message);
            }
        }
    }

    /**
     * Send a message to a specific user via SSE
     */
    private void sendToUser(String userId, SignalingMessage message) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                        .name("message")
                        .data(gson.toJson(message)));
            } catch (IOException e) {
                logger.error("Failed to send message to user {}: {}", userId, e.getMessage());
                handleDisconnect(userId);
            }
        }
    }

    /**
     * Handle user disconnect - clean up resources
     */
    private void handleDisconnect(String userId) {
        emitters.remove(userId);
        removeFromRoom(userId);
    }

    /**
     * Remove user from their room and notify peers
     */
    private void removeFromRoom(String userId) {
        String roomId = userRoomMap.remove(userId);

        if (roomId != null) {
            Set<String> room = rooms.get(roomId);
            if (room != null) {
                room.remove(userId);

                // Notify remaining users
                for (String peerId : room) {
                    SignalingMessage leftMessage = new SignalingMessage("user-left", roomId, userId, null);
                    sendToUser(peerId, leftMessage);
                }

                // Clean up empty room
                if (room.isEmpty()) {
                    rooms.remove(roomId);
                    logger.info("Room {} removed (empty)", roomId);
                }
            }
        }

        logger.info("User {} left room {}", userId, roomId);
    }
}