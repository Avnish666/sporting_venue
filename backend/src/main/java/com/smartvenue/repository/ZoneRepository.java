package com.smartvenue.repository;

import com.smartvenue.model.Zone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ZoneRepository extends JpaRepository<Zone, Long> {
    List<Zone> findByEventId(Long eventId);
}
