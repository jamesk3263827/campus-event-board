package com.yourapp.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import com.yourapp.model.RsvpRequest;
import com.yourapp.model.RsvpResponse;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.Objects;
import javax.annotation.Nonnull;

@Service
public class WaitlistService {

    private static final String EVENTS_COLLECTION   = "events";
    private static final String RSVPS_SUBCOLLECTION = "rsvps";

    // Firestore field names — stored as constants so the @Nonnull checker
    // can verify these are never null when passed to whereEqualTo/orderBy.
    private static final String FIELD_STATUS           = "status";
    private static final String FIELD_JOINED_AT        = "joinedAt";
    private static final String FIELD_USER_ID          = "userId";
    private static final String STATUS_WAITLISTED      = "waitlisted";

    // -------------------------------------------------------------------------
    // rsvp() — unchanged from your original
    // -------------------------------------------------------------------------
    public RsvpResponse rsvp(RsvpRequest request)
            throws ExecutionException, InterruptedException {

        Firestore db = FirestoreClient.getFirestore();
        String eventId = Objects.requireNonNull(request.getEventId(), "eventId must not be null");
        String userId  = Objects.requireNonNull(request.getUserId(),  "userId must not be null");

        DocumentReference eventRef = db.collection(EVENTS_COLLECTION).document(eventId);
        DocumentReference rsvpRef  = eventRef.collection(RSVPS_SUBCOLLECTION).document(userId);

        ApiFuture<String> transaction = db.runTransaction(tx -> {
            DocumentSnapshot eventSnap = tx.get(eventRef).get();
            DocumentSnapshot rsvpSnap  = tx.get(rsvpRef).get();

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
                // Assign a waitlist position based on current waitlist size.
                // We query outside the transaction (Firestore limitation) and
                // accept that in a race this could produce a duplicate position —
                // recalculateWaitlistPositions() corrects that after promotion.
                long waitlistPosition = db.collection(EVENTS_COLLECTION)
                        .document(eventId)
                        .collection(RSVPS_SUBCOLLECTION)
                        .whereEqualTo(FIELD_STATUS, STATUS_WAITLISTED)
                        .get().get()
                        .size() + 1L;

                tx.update(eventRef, "waitlistCount", FieldValue.increment(1));

                Map<String, Object> rsvpData = new HashMap<>();
                rsvpData.put(FIELD_USER_ID,       userId);
                rsvpData.put("eventId",           eventId);
                rsvpData.put(FIELD_STATUS,         STATUS_WAITLISTED);
                rsvpData.put("timestamp",          FieldValue.serverTimestamp());
                rsvpData.put(FIELD_JOINED_AT,      FieldValue.serverTimestamp());
                rsvpData.put("waitlistPosition",   waitlistPosition);
                tx.set(rsvpRef, rsvpData);
                return status;
            }

            Map<String, Object> rsvpData = new HashMap<>();
            rsvpData.put("userId",    userId);
            rsvpData.put("eventId",   eventId);
            rsvpData.put("status",    status);
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

    // -------------------------------------------------------------------------
    // cancel() — decrement goingCount, then promote next waitlisted user
    // -------------------------------------------------------------------------
    public RsvpResponse cancel(@Nonnull String userId, @Nonnull String eventId)
            throws ExecutionException, InterruptedException {

        Firestore db = FirestoreClient.getFirestore();
        String safeUserId  = Objects.requireNonNull(userId,  "userId must not be null");
        String safeEventId = Objects.requireNonNull(eventId, "eventId must not be null");

        DocumentReference eventRef = db.collection(EVENTS_COLLECTION).document(safeEventId);
        DocumentReference rsvpRef  = eventRef.collection(RSVPS_SUBCOLLECTION).document(safeUserId);

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
            } else if ("waitlisted".equals(currentStatus)) {
                tx.update(eventRef, "waitlistCount", FieldValue.increment(-1));
            }

            tx.delete(rsvpRef);
            return currentStatus;
        });

        String oldStatus = transaction.get();

        // Only promote when a *going* user cancels — a waitlisted cancellation
        // just frees their spot in line; nobody moves up into "going".
        if ("going".equals(oldStatus)) {
            promoteFromWaitlist(safeEventId);
        } else if ("waitlisted".equals(oldStatus)) {
            // Still recalculate so positions stay contiguous after the gap.
            recalculateWaitlistPositions(safeEventId);
        }

        return new RsvpResponse(
            "cancelled",
            "RSVP cancelled (was: " + oldStatus + ")",
            safeUserId,
            safeEventId
        );
    }

    // -------------------------------------------------------------------------
    // promoteFromWaitlist() — moves the earliest waitlisted user to "going"
    // Called automatically by cancel() when a "going" user drops out.
    // -------------------------------------------------------------------------
    public void promoteFromWaitlist(@Nonnull String eventId)
        throws ExecutionException, InterruptedException {

    Firestore db = FirestoreClient.getFirestore();

    System.err.println("PROMOTE: starting for eventId=" + eventId);

    List<QueryDocumentSnapshot> waitlistDocs = db
            .collection(EVENTS_COLLECTION)
            .document(eventId)
            .collection(RSVPS_SUBCOLLECTION)
            .whereEqualTo(FIELD_STATUS, STATUS_WAITLISTED)
            .orderBy(FIELD_JOINED_AT, Query.Direction.ASCENDING)
            .limit(1)
            .get()
            .get()
            .getDocuments();

    System.err.println("PROMOTE: waitlistDocs size=" + waitlistDocs.size());

    if (waitlistDocs.isEmpty()) {
        System.err.println("PROMOTE: nobody on waitlist, returning");
        return;
    }

    QueryDocumentSnapshot firstInLine = waitlistDocs.get(0);
    System.err.println("PROMOTE: promoting userId=" + firstInLine.getString(FIELD_USER_ID));        // getString() is @Nullable per the Firestore SDK — validate before use
        String promotedUserId = Objects.requireNonNull(
                firstInLine.getString(FIELD_USER_ID),
                "Waitlist document is missing userId field: " + firstInLine.getId()
        );

        DocumentReference eventRef = db
                .collection(EVENTS_COLLECTION)
                .document(eventId);

        DocumentReference promotedRsvpRef = eventRef
                .collection(RSVPS_SUBCOLLECTION)
                .document(promotedUserId);

        // Promote inside a transaction so the status flip and counter update
        // are atomic. If two cancellations race, each transaction sees a
        // consistent snapshot and retries automatically.
        db.runTransaction(tx -> {
            DocumentSnapshot rsvpSnap = tx.get(promotedRsvpRef).get();

            // Guard: user may have cancelled their own waitlist spot between
            // our query above and this transaction executing.
            if (!rsvpSnap.exists() || !STATUS_WAITLISTED.equals(rsvpSnap.getString(FIELD_STATUS))) {
                return null; // nothing to promote — caller will recalculate
            }

            // Flip status to "going" and clear waitlist-specific fields
            Map<String, Object> updates = new HashMap<>();
            updates.put("status",              "going");
            updates.put("promotedFromWaitlist", true);
            updates.put("promotedAt",           FieldValue.serverTimestamp());
            updates.put("waitlistPosition",     FieldValue.delete());
            updates.put("joinedAt",             FieldValue.delete());
            tx.update(promotedRsvpRef, updates);

            // goingCount was already decremented in cancel(); incrementing here
            // brings it back to the same value — the spot is backfilled.
            tx.update(eventRef, "goingCount",    FieldValue.increment(1));
            tx.update(eventRef, "waitlistCount", FieldValue.increment(-1));

            return null;
        }).get();

        // Shift remaining waitlist positions up.
        // Outside the transaction: positions are cosmetic. A failed
        // recalculation cannot roll back an already-committed promotion.
        recalculateWaitlistPositions(eventId);

        // NEXT STEP: send push/email notification to promotedUserId
    }

    // -------------------------------------------------------------------------
    // recalculateWaitlistPositions() — re-numbers positions 1, 2, 3 …
    // Safe to call any time positions may have drifted (promotion, cancellation).
    // -------------------------------------------------------------------------
    public void recalculateWaitlistPositions(@Nonnull String eventId)
            throws ExecutionException, InterruptedException {

        Firestore db = FirestoreClient.getFirestore();

        List<QueryDocumentSnapshot> waitlistDocs = db
                .collection(EVENTS_COLLECTION)
                .document(eventId)
                .collection(RSVPS_SUBCOLLECTION)
                .whereEqualTo(FIELD_STATUS, STATUS_WAITLISTED)
                .orderBy(FIELD_JOINED_AT, Query.Direction.ASCENDING)
                .get()
                .get()
                .getDocuments();

        if (waitlistDocs.isEmpty()) {
            return;
        }

        // WriteBatch handles up to 500 documents atomically.
        // If you ever expect > 500 waitlist entries, split into chunks of 500.
        WriteBatch batch = db.batch();

        for (int i = 0; i < waitlistDocs.size(); i++) {
            batch.update(waitlistDocs.get(i).getReference(),
                         "waitlistPosition", i + 1); // 1-indexed
        }

        batch.commit().get();
    }
}
