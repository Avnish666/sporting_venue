package com.smartvenue.controller;

import com.smartvenue.model.Zone;
import com.smartvenue.repository.ZoneRepository;
import com.smartvenue.simulation.CrowdSimulationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/zones")
public class ZoneController {

    @Autowired
    private ZoneRepository zoneRepository;
    
    @Autowired
    private CrowdSimulationService simulationService;

    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<Map<String, Object>>> getZonesByEvent(@PathVariable Long eventId) {
        List<Zone> zones = zoneRepository.findByEventId(eventId);
        List<Map<String, Object>> dtos = zones.stream().map(z -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", z.getId());
            map.put("name", z.getName());
            map.put("type", z.getType());
            map.put("capacity", z.getCapacity());
            map.put("currentOccupancy", z.getCurrentOccupancy());
            map.put("processingRate", z.getProcessingRate());
            map.put("x", z.getX());
            map.put("y", z.getY());
            map.put("distance", z.getDistance());
            int waitTime = z.getProcessingRate() > 0 ? z.getCurrentOccupancy() / z.getProcessingRate() : 0;
            map.put("estimatedWaitTime", waitTime);
            return map;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(dtos);
    }
    
    @PostMapping("/{id}/visit")
    public ResponseEntity<?> visitZone(@PathVariable Long id) {
        Optional<Zone> zoneOpt = zoneRepository.findById(id);
        if (zoneOpt.isPresent()) {
            Zone zone = zoneOpt.get();
            if (zone.getCurrentOccupancy() < zone.getCapacity()) {
                zone.setCurrentOccupancy(zone.getCurrentOccupancy() + 1);
                zoneRepository.save(zone);
                // Trigger immediate update broadcast for responsive UI
                simulationService.broadcastUpdates(zoneRepository.findByEventId(zone.getEvent().getId()));
                return ResponseEntity.ok(Map.of("success", true, "message", "Visited location"));
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "Zone is at maximum capacity!"));
            }
        }
        return ResponseEntity.notFound().build();
    }
}
