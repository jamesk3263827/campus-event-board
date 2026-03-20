package com.yourapp.model;

import lombok.Data;

@Data  // Lombok: generates getters, setters, toString
public class RsvpRequest {
    private String userId;
    private String eventId;
}