package com.yourapp.controller;

import com.yourapp.model.RsvpRequest;
import com.yourapp.model.RsvpResponse;
import com.yourapp.service.WaitlistService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.ExecutionException;
import javax.annotation.Nonnull;

@RestController
@RequestMapping("/waitlist")
@CrossOrigin(origins = "http://localhost:3000")
public class WaitlistController {

    private final WaitlistService waitlistService;

    public WaitlistController(WaitlistService waitlistService) {
        this.waitlistService = waitlistService;
    }

    // POST /waitlist/rsvp
    // Body: { "userId": "abc123", "eventId": "evt456" }
    @PostMapping("/rsvp")
    public ResponseEntity<RsvpResponse> rsvp(@RequestBody RsvpRequest request) {
        try {
            RsvpResponse response = waitlistService.rsvp(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            // Event not found, etc.
            return ResponseEntity.badRequest().body(
                new RsvpResponse("error", e.getMessage(), request.getUserId(), request.getEventId())
            );
        } catch (ExecutionException | InterruptedException e) {
            e.printStackTrace();  // ← prints the real error to the Spring Boot terminal
            return ResponseEntity.internalServerError().body(
                new RsvpResponse("error", "Internal error", request.getUserId(), request.getEventId())
            );
        }
    }

    // DELETE /waitlist/cancel?userId=abc123&eventId=evt456
    @DeleteMapping("/cancel")
    public ResponseEntity<RsvpResponse> cancel(
            @RequestParam @Nonnull String userId,
            @RequestParam @Nonnull String eventId) {
        try {
            RsvpResponse response = waitlistService.cancel(userId, eventId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(
                new RsvpResponse("error", e.getMessage(), userId, eventId)
            );
        } catch (ExecutionException | InterruptedException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(
                new RsvpResponse("error", "Internal error", userId, eventId)
            );
        }
    }
}
