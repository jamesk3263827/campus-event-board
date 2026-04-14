package com.yourapp.model;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RsvpResponse {
    private String status;            // "going" or "waitlisted"
    private String message;
    private String userId;
    private String eventId;
    private Long   waitlistPosition;  // null when status is "going"
}