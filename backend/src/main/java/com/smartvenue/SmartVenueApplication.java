package com.smartvenue;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SmartVenueApplication {
    public static void main(String[] args) {
        SpringApplication.run(SmartVenueApplication.class, args);
    }
}
