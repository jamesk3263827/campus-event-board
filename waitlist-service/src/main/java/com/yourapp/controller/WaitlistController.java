package com.yourapp.controller;

import com.yourapp.model.RsvpRequest;
import com.yourapp.model.RsvpResponse;
import com.yourapp.service.WaitlistService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.ExecutionException;
import javax.annotation.Nonnull;

/**
 * WaitlistController
 *
 * CORS note: This service is only called by the Node server (localhost:3000),
 * never directly from the browser. The @CrossOrigin here covers the Node
 * server origin so curl / Postman testing from 3000 also works in development.
 * Do NOT add the frontend origin (5500) here — all browser traffic must go
 * through the Node API, which is responsible for auth token verification.
 */
@RestController
@RequestMapping("/waitlist")
@CrossOrigin(origins = {
    "http://localhost:3000",
    "http://127.0.0.1:3000"
})
public class WaitlistController {

    private final WaitlistService waitlistService;

    public WaitlistController(WaitlistService waitlistService) {
        this.waitlistService = waitlistService;
    }

    // ── Health check ──────────────────────────────────────────────────────────
    // GET /waitlist/health
    // Used by the Node server's javaService.checkJavaHealth() and for manual
    // verification during local development. Spring Boot Actuator also exposes
    // /actuator/health if you prefer that route.
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
            "status",    "UP",
            "service",   "waitlist",
            "timestamp", java.time.Instant.now().toString()
        ));
    }

    // ── POST /waitlist/rsvp ───────────────────────────────────────────────────
    // Body: { "userId": "abc123", "eventId": "evt456" }
    // Returns: { status: "going"|"waitlisted", message, userId, eventId }
    @PostMapping("/rsvp")
    public ResponseEntity<RsvpResponse> rsvp(@RequestBody RsvpRequest request) {
        try {
            RsvpResponse response = waitlistService.rsvp(request);
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            // Missing required fields
            return ResponseEntity.badRequest().body(
                new RsvpResponse("error", e.getMessage(),
                    request.getUserId(), request.getEventId())
            );

        } catch (RuntimeException e) {
            // Event not found, already RSVP'd, etc.
            return ResponseEntity.badRequest().body(
                new RsvpResponse("error", e.getMessage(),
                    request.getUserId(), request.getEventId())
            );

        } catch (ExecutionException | InterruptedException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(
                new RsvpResponse("error", "Internal server error — check Spring Boot logs.",
                    request.getUserId(), request.getEventId())
            );
        }
    }

    // ── DELETE /waitlist/cancel?userId=abc123&eventId=evt456 ──────────────────
    // Cancels an RSVP and automatically promotes the next waitlisted user.
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
                new RsvpResponse("error", "Internal server error — check Spring Boot logs.",
                    userId, eventId)
            );
        }
    }
}
