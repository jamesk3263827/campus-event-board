package com.yourapp.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import com.yourapp.model.RsvpRequest;
import com.yourapp.model.RsvpResponse;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.Objects;

@Service
public class WaitlistService {

    private static final String EVENTS_COLLECTION = "events";
    private static final String RSVPS_SUBCOLLECTION = "rsvps";

    public RsvpResponse rsvp(RsvpRequest request)
            throws ExecutionException, InterruptedException {

        Firestore db = FirestoreClient.getFirestore();
        // FIX lines 27/28: ensure eventId and userId are never null before passing to Firestore
        String eventId = Objects.requireNonNull(request.getEventId(), "eventId must not be null");
        String userId = Objects.requireNonNull(request.getUserId(), "userId must not be null");

        DocumentReference eventRef = db.collection(EVENTS_COLLECTION).document(eventId);
        DocumentReference rsvpRef = eventRef.collection(RSVPS_SUBCOLLECTION).document(userId);

        ApiFuture<String> transaction = db.runTransaction(tx -> {
            DocumentSnapshot eventSnap = tx.get(eventRef).get();
            DocumentSnapshot rsvpSnap = tx.get(rsvpRef).get();

            if (!eventSnap.exists()) {
                throw new RuntimeException("Event not found: " + eventId);
            }

            if (rsvpSnap.exists()) {
                Map<String, Object> data = rsvpSnap.getData();
                if (data == null) throw new RuntimeException("Corrupt RSVP record for: " + userId);
                String existingStatus = (String) data.get("status");
                return existingStatus != null ? existingStatus : "unknown";
            }

            Long capacityLong = eventSnap.getLong("capacity");
            long capacity = capacityLong != null ? capacityLong : 0L;

            // FIX line 53: split into two steps so the ternary doesn't auto-unbox a nullable Long
            Long goingCountLong;
            if (eventSnap.contains("goingCount")) {
                goingCountLong = eventSnap.getLong("goingCount");
            } else {
                goingCountLong = 0L;
            }
            long goingCount = goingCountLong != null ? goingCountLong : 0L;

            String status;
            if (goingCount < capacity) {
                status = "going";
                tx.update(eventRef, "goingCount", FieldValue.increment(1));
            } else {
                status = "waitlisted";
            }

            Map<String, Object> rsvpData = new HashMap<>();
            rsvpData.put("userId", userId);
            rsvpData.put("eventId", eventId);
            rsvpData.put("status", status);
            rsvpData.put("timestamp", FieldValue.serverTimestamp());
            tx.set(rsvpRef, rsvpData);

            return status;
        });

        String resolvedStatus = transaction.get();
        String message = resolvedStatus.equals("going")
            ? "You're confirmed for this event!"
            : "You've been added to the waitlist.";

        return new RsvpResponse(resolvedStatus, message, userId, eventId);
    }

    public RsvpResponse cancel(String userId, String eventId)
            throws ExecutionException, InterruptedException {

        Firestore db = FirestoreClient.getFirestore();
        // FIX lines 86/87: same null guard for cancel parameters
        String safeUserId = Objects.requireNonNull(userId, "userId must not be null");
        String safeEventId = Objects.requireNonNull(eventId, "eventId must not be null");

        DocumentReference eventRef = db.collection(EVENTS_COLLECTION).document(safeEventId);
        DocumentReference rsvpRef = eventRef.collection(RSVPS_SUBCOLLECTION).document(safeUserId);

        ApiFuture<String> transaction = db.runTransaction(tx -> {
            DocumentSnapshot rsvpSnap = tx.get(rsvpRef).get();

            if (!rsvpSnap.exists()) {
                throw new RuntimeException("No RSVP found for this user/event.");
            }

            Map<String, Object> data = rsvpSnap.getData();
            if (data == null) throw new RuntimeException("Corrupt RSVP record for: " + safeUserId);
            String currentStatus = (String) data.get("status");
            currentStatus = currentStatus != null ? currentStatus : "unknown";

            if ("going".equals(currentStatus)) {
                tx.update(eventRef, "goingCount", FieldValue.increment(-1));
            }

            tx.delete(rsvpRef);
            return currentStatus;
        });

        String oldStatus = transaction.get();
        return new RsvpResponse(
            "cancelled",
            "RSVP cancelled (was: " + oldStatus + ")",
            safeUserId,
            safeEventId
        );
    }
}