package com.example.voicechat.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Represents a signaling message for WebRTC communication.
 * <p>
 * Message types:
 * - "join": User joining a room
 * - "offer": SDP offer from caller
 * - "answer": SDP answer from callee
 * - "ice-candidate": ICE candidate exchange
 * - "leave": User leaving the room
 * - "user-joined": Notification that another user joined
 * - "user-left": Notification that another user left
 * - "room-full": Room is already full (max 2 users for 1-to-1)
 */
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SignalingMessage {

    // Getters and Setters
    private String type;
    private String roomId;
    private String senderId;
    private Object payload; // Can be SDP or ICE candidate

    @Override
    public String toString() {
        return "SignalingMessage{" +
            "type='" + type + '\'' +
            ", roomId='" + roomId + '\'' +
            ", senderId='" + senderId + '\'' +
            ", payload=" + payload +
            '}';
    }
}
