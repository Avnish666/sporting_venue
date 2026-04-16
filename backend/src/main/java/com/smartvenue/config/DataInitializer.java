package com.smartvenue.config;

import com.smartvenue.model.Event;
import com.smartvenue.model.User;
import com.smartvenue.model.Zone;
import com.smartvenue.repository.EventRepository;
import com.smartvenue.repository.UserRepository;
import com.smartvenue.repository.ZoneRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initData(UserRepository userRepository, EventRepository eventRepository, ZoneRepository zoneRepository) {
        return args -> {
            if (userRepository.count() == 0) {
                User admin = new User(null, "admin@smartvenue.com", "admin", "Admin User", "ADMIN");
                User user = new User(null, "user@smartvenue.com", "password", "Jane Doe", "USER");
                userRepository.save(admin);
                userRepository.save(user);

                Event event = new Event(null, "Super Bowl LIX", LocalDateTime.now().plusDays(5), 70000, 25000);
                event = eventRepository.save(event);

                zoneRepository.save(new Zone(null, event, "Main Gate 1", "GATE", 5000, 400, 60, 50, 90, 10)); // Bottom middle
                zoneRepository.save(new Zone(null, event, "South Gate 2", "GATE", 4000, 800, 50, 20, 80, 25)); // Bottom left
                zoneRepository.save(new Zone(null, event, "VIP Gate 3", "GATE", 1000, 20, 30, 80, 80, 25)); // Bottom right

                zoneRepository.save(new Zone(null, event, "Burger Spot Section A", "FOOD", 200, 45, 10, 30, 30, 60)); // Top left
                zoneRepository.save(new Zone(null, event, "Pizza Corner Section B", "FOOD", 300, 150, 15, 70, 30, 60)); // Top right

                zoneRepository.save(new Zone(null, event, "Restroom North", "RESTROOM", 100, 20, 20, 50, 10, 80)); // Top middle
                zoneRepository.save(new Zone(null, event, "Restroom South", "RESTROOM", 100, 80, 20, 10, 50, 40)); // Mid left
            }
        };
    }
}
