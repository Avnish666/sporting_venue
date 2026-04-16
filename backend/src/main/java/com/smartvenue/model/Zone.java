package com.smartvenue.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "zones")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Zone {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type; // "GATE", "FOOD", "RESTROOM"

    @Column(nullable = false)
    private Integer capacity;

    @Column(nullable = false)
    private Integer currentOccupancy = 0;

    @Column(nullable = false)
    private Integer processingRate; // people processed per minute

    @Column(nullable = false)
    private Integer x; // Grid X coordinate (0-100)

    @Column(nullable = false)
    private Integer y; // Grid Y coordinate (0-100)

    @Column(nullable = false)
    private Integer distance; // Distance metric from a central focal point for routing
}

