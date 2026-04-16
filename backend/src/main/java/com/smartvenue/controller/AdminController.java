package com.smartvenue.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostMapping("/alert")
    public ResponseEntity<?> broadcastAlert(@RequestBody Map<String, String> alertDetails) {
        String message = alertDetails.get("message");
        // Broadcast manual notification to the topic
        messagingTemplate.convertAndSend("/topic/alerts", Map.of("message", message, "timestamp", System.currentTimeMillis()));
        return ResponseEntity.ok(Map.of("status", "Alert Broadcasted"));
    }

    @PostMapping("/emergency")
    public ResponseEntity<?> toggleEmergency(@RequestBody Map<String, Boolean> payload) {
        Boolean isEmergency = payload.get("active");
        String msg = isEmergency ? "EMERGENCY: EVACUATE IMMEDIATELY. FOLLOW THE FASTEST ROUTES TO EXITS." : "Emergency mode deactivated. Venue returning to normal operations.";
        
        // Broadcast the active state
        messagingTemplate.convertAndSend("/topic/emergency", Map.of(
            "active", isEmergency,
            "message", msg,
            "timestamp", System.currentTimeMillis()
        ));
        
        return ResponseEntity.ok(Map.of("status", "Emergency State Updated", "active", isEmergency));
    }
}
