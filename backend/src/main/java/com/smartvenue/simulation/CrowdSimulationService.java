package com.smartvenue.simulation;

import com.smartvenue.model.Zone;
import com.smartvenue.repository.ZoneRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class CrowdSimulationService {

    @Autowired
    private ZoneRepository zoneRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private final Random random = new Random();
    
    // In-Memory history map: Event Id -> List of History Data Points
    private final Map<Long, List<Map<String, Object>>> eventCrowdHistory = new HashMap<>();

    @Scheduled(fixedRate = 5000) // Runs every 5 seconds
    @Transactional
    public void simulateCrowdMovement() {
        List<Zone> zones = zoneRepository.findAll();
        if (zones.isEmpty()) return;

        boolean updated = false;

        // Mass conserving shift: People move from one random zone to another
        for (int i = 0; i < zones.size() / 2 + 1; i++) {
             Zone from = zones.get(random.nextInt(zones.size()));
             Zone to = zones.get(random.nextInt(zones.size()));
             
             if (!from.getId().equals(to.getId()) && from.getCurrentOccupancy() > 10) {
                 int movers = random.nextInt(Math.max(1, from.getCurrentOccupancy() / 10)) + 5;
                 if (to.getCurrentOccupancy() + movers <= to.getCapacity()) {
                     from.setCurrentOccupancy(from.getCurrentOccupancy() - movers);
                     to.setCurrentOccupancy(to.getCurrentOccupancy() + movers);
                     updated = true;
                 }
             }
        }
        
        // Minor natural fluctuations (arriving / leaving total venue)
        for (Zone zone : zones) {
           int fluctuator = random.nextInt(11) - 5; // -5 to +5
           int newOcc = zone.getCurrentOccupancy() + fluctuator;
           if (newOcc < 0) newOcc = 0;
           if (newOcc > zone.getCapacity()) newOcc = zone.getCapacity();
           if (newOcc != zone.getCurrentOccupancy()) {
               zone.setCurrentOccupancy(newOcc);
               updated = true;
           }
        }

        if (updated) {
            zoneRepository.saveAll(zones);
            broadcastUpdates(zones);
        }
    }

    public void broadcastUpdates(List<Zone> zones) {
        if (zones.isEmpty()) return;
        Long eventId = zones.get(0).getEvent().getId();
        
        List<Map<String, Object>> zoneDtos = zones.stream().map(z -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", z.getId());
            map.put("eventId", z.getEvent().getId());
            map.put("name", z.getName());
            map.put("type", z.getType());
            map.put("capacity", z.getCapacity());
            map.put("currentOccupancy", z.getCurrentOccupancy());
            map.put("processingRate", z.getProcessingRate());
            map.put("x", z.getX());
            map.put("y", z.getY());
            map.put("distance", z.getDistance());
            
            // Formula: wait_time = crowd / service_rate + slight randomness (-1 to 1 min)
            double rawWait = z.getProcessingRate() > 0 ? (double) z.getCurrentOccupancy() / z.getProcessingRate() : 0.0;
            int randomJitter = rawWait > 2 ? random.nextInt(3) - 1 : 0; 
            int estimatedWaitTime = Math.max(0, (int) Math.round(rawWait) + randomJitter);
            
            map.put("estimatedWaitTime", estimatedWaitTime);
            
            // Trigger >80% capacity alert
            if (z.getCurrentOccupancy() > z.getCapacity() * 0.8) {
                Map<String, Object> alert = Map.of(
                    "message", "SURGE: " + z.getName() + " is currently reaching maximum capacity!",
                    "timestamp", System.currentTimeMillis()
                );
                messagingTemplate.convertAndSend("/topic/alerts", alert);
            }
            return map;
        }).collect(Collectors.toList());

        // Track History
        int totalOccupancy = zones.stream().mapToInt(Zone::getCurrentOccupancy).sum();
        int totalCapacity = zones.stream().mapToInt(Zone::getCapacity).sum();
        double percentFull = totalCapacity > 0 ? (totalOccupancy * 100.0) / totalCapacity : 0;
        
        List<Map<String, Object>> history = eventCrowdHistory.computeIfAbsent(eventId, k -> new ArrayList<>());
        Map<String, Object> historyPoint = new HashMap<>();
        historyPoint.put("time", System.currentTimeMillis());
        historyPoint.put("overallDensity", (int) percentFull);
        history.add(historyPoint);
        
        if (history.size() > 20) {
            history.remove(0); // keep last 20 ticks (~1.5 minutes represented)
        }

        // Send zones updates
        messagingTemplate.convertAndSend("/topic/crowd_update", zoneDtos);
        // Send history updates
        messagingTemplate.convertAndSend("/topic/crowd_history", history);
    }
}
