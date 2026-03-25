# Testing Checklist — Campus Event Board

Work through each flow top-to-bottom. Check off each item as you verify it.

---

## Before you start

- [X] Node server running on port 3000 (`curl http://localhost:3000/health` returns `{"status":"ok"}`)
- [X] Java service running on port 8080 (`curl http://localhost:8080/actuator/health` returns `{"status":"UP"}`)
- [X] Frontend open at `http://127.0.0.1:5500` via Live Server
- [X] Browser DevTools open (F12) → Network tab + Console tab visible

---

## 1. Register a new account

1. [X] Go to `index.html` → click **Register**
2. [X] Submit the form **empty** — verify all three field errors appear (name, email, password)
3. [X] Enter a name, invalid email (e.g. `abc`) → verify email error appears
4. [X] Enter a password with 5 characters → verify password-too-short error
5. [X] Complete the form correctly → submit
6. [X] Verify redirect to `pages/events.html`
7. [X] Open Firestore Console → `users` collection → confirm new document with correct `name`, `email`, `role: "user"`

---

## 2. Log in / Log out

1. [X] Log out (button in navbar) → verify redirect to `login.html`
2. [X] Submit login form empty → verify field errors appear
3. [X] Enter wrong password → verify "Incorrect email or password" message
4. [X] Enter unregistered email → verify "Incorrect email or password" message
5. [X] Enter correct credentials → verify redirect to events page
6. [X] Log out again → verify redirect to login page
7. [X] Manually navigate to `pages/events.html` while logged out → verify redirect to login

---

## 3. Create an event

1. [X] Click **+ Create Event** from the events page
2. [X] Submit the form completely empty → verify error appears (do not submit)
3. [X] Fill in only the title, submit → verify another field error appears
4. [X] Enter capacity `0` → verify "must be at least 1" error
5. [X] Fill in all fields correctly (set capacity to **2** for waitlist testing later) → submit
6. [X] Verify redirect to the new event's detail page
7. [X] Verify all fields (title, date, time, location, description, capacity) render correctly
8. [X] Verify "2 spots remaining" appears in the capacity section
9. [X] Open Firestore Console → `events` collection → confirm the new document exists

---

## 4. RSVP to an event

**Setup:** Use the event from step 3 (capacity = 2). You are currently logged in as User A.

1. [X] On the event detail page, verify button reads **"RSVP to this event"**
2. [X] Click the button → verify button changes to **"✓ Going — Cancel RSVP"** (green)
3. [X] Verify "1 spot remaining" updates in the capacity bar
4. [X] Open Firestore → `events/{id}/rsvps/{userAId}` → confirm `status: "going"`
5. [X] Refresh the page → verify the "Going" state persists (not reset to "RSVP")

---

## 5. Cancel an RSVP

1. [X] Click **"✓ Going — Cancel RSVP"**
2. [X] Verify the cancel confirmation modal appears
3. [X] Click **"Never mind"** → verify modal closes, button stays "Going"
4. [X] Click the button again → click **"Yes, cancel"** in the modal
5. [X] Verify button returns to **"RSVP to this event"**
6. [X] Verify "2 spots remaining" is restored
7. [X] Open Firestore → confirm the RSVP document is deleted (or has no status)

---

## 6. Waitlist — join and promotion

**Setup:** You need two user accounts. Use one browser in normal mode (User A) and one in Incognito (User B). Create a third account (User C) in a second Incognito window.

**Fill the event (capacity = 2):**

1. [X] Log in as **User A** → RSVP → button shows "Going"
2. [X] Log in as **User B** → RSVP → button shows "Going"; "0 spots remaining"
3. [X] Log in as **User C** → click **"Join Waitlist"**
4. [X] Verify User C's button shows **"Waitlisted — #1 in line"**
5. [X] Open Firestore → User C's RSVP → confirm `status: "waitlisted"`, `waitlistPosition: 1`
6. [X] Check `events/{id}` document → confirm `waitlistCount: 1`

**Promote from waitlist:**

7. [X] Switch to **User A**'s window → cancel RSVP → confirm in modal
8. [X] Switch to **User C**'s window (or refresh)
9. [X] Verify User C's button has changed to **"✓ Going — Cancel RSVP"** (promoted!)
10. [X] Open Firestore → User C's RSVP → confirm `status: "going"`
11. [X] Confirm `waitlistCount` on the event decremented to 0

---

## 7. Post and delete a comment

1. [X] On any event detail page (logged in), locate the comment form
2. [X] Submit the form with **empty text** → verify inline error "Comment cannot be empty"
3. [X] Type a comment → click **Post Comment**
4. [X] Verify comment appears in the list with your name shown as "You"
5. [X] Verify timestamp is shown
6. [X] Click **Delete** on your own comment → verify confirmation dialog
7. [X] Confirm deletion → verify comment is removed from the list
8. [X] Log out → navigate to the event (you may need to paste the URL)
9. [X] Verify comment box is replaced with "Log in to leave a comment" message
10. [X] Verify existing comments are still visible to logged-out users

---

## 8. Delete an event

1. [X] Log in as the event creator
2. [X] Navigate to an event you created → verify **"Delete Event"** button appears
3. [X] Log in as a different user (Incognito) → verify **"Delete Event"** button is NOT shown
4. [X] As the creator, click **"Delete Event"** → verify delete confirmation modal
5. [X] Click **"Cancel"** → verify modal closes, event still exists
6. [X] Click **"Delete Event"** → **"Delete"** (confirm)
7. [X] Verify redirect to `events.html`
8. [X] Verify the event no longer appears in the events list
9. [X] Manually navigate to `event-detail.html?id=<deleted-id>` → verify "This event no longer exists" error state

---

## 9. Empty states

### Events page — no events

1. [X] (If needed) delete all events so the board is empty
2. [X] Go to `events.html` → verify the empty state shows: calendar icon, "No events yet", and a "+ Create Event" link
3. [X] Type something in the search box that matches nothing → verify: search icon, "No matching events", "Try adjusting your search…" and a **"Clear filters"** button
4. [X] Click **"Clear filters"** → verify search clears and the empty state updates

### Profile page — new user

1. [X] Register a brand new account (no events, no RSVPs)
2. [X] Go to `profile.html`
3. [X] Verify each section shows its specific empty message:
   - "Events I Created" → "You haven't created any events yet." + Create button
   - "Events I'm Going To" → "No upcoming events yet. Browse events to RSVP!" + Browse button
   - "Waitlisted" → "You're not on any waitlists."
4. [X] Verify the avatar shows the first letter of your email

---

## 10. Error handling

### Network / server errors

1. [X] **Stop the Node server** (`Ctrl+C` in Terminal 1)
2. [X] On `events.html`, reload the page → verify error banner: "Could not reach the server. Make sure the Node server is running on port 3000."
3. [X] Restart Node server → reload → verify events load normally

### Java service errors

4. [X] **Stop the Java service** (`Ctrl+C` in Terminal 2)
5. [X] On an event detail page, click **RSVP** → verify error message: "Java waitlist service is not running…"
6. [X] Restart Java service → verify RSVP works again

### Expired / invalid token (TEST NOT NECCESARY)

7. [X] Open DevTools → Application → Local Storage → clear `authToken`
8. [X] Try to RSVP → verify graceful error (not a blank screen or JS crash)

### Offline detection

9. [X] In DevTools → Network → set throttle to **Offline**
10. [X] Click RSVP or try loading events → verify "You appear to be offline" message
11. [X] Verify the yellow offline banner appears at the top of the page
12. [X] Restore network → verify banner disappears

---

## 11. Responsive design — mobile

Test at **375px width** (iPhone SE size). In DevTools → Toggle Device Toolbar → set to 375×812.

### All pages

- [X] Navbar: title truncates gracefully, buttons remain tappable
- [X] No horizontal scroll on any page

### Events page

- [X] Filters stack vertically (search on top, category below, button full-width)
- [X] Event cards are single-column
- [X] Badges and text don't overflow cards

### Event detail page

- [X] Banner image doesn't overflow
- [X] RSVP button is full-width on mobile
- [X] Capacity bar is full-width
- [X] Cancel/delete modals slide up from bottom (bottom sheet style)
- [X] Modal can be dismissed by tapping outside

### Create event form

- [X] Date/time inputs render correctly on iOS Safari (native date picker)
- [X] Two-column grid collapses to single column

### Profile page

- [X] Avatar + header render correctly at small widths
- [X] Event cards in profile sections stack and text truncates with ellipsis

---

## 12. Run all three services simultaneously — stress check

With all three services running:

1. [X] Open three browser tabs: events list, an event detail, and your profile
2. [X] In Tab 1, create a new event
3. [X] Refresh Tab 1's events list → new event appears
4. [X] In Tab 2 (event detail), RSVP → button updates
5. [X] In Tab 3 (profile) → reload → new event appears in "Events I Created"
6. [X] RSVP from Tab 2 → check profile Tab 3 → appears in "Events I'm Going To"
7. [X] Post a comment → it appears without page reload

---

## Checklist summary

| Area | Tests | Pass |
|---|---|---|
| Register | 7 | |
| Login / Logout | 7 | |
| Create event | 9 | |
| RSVP | 5 | |
| Cancel RSVP | 7 | |
| Waitlist | 11 | |
| Comments | 10 | |
| Delete event | 9 | |
| Empty states | 7 | |
| Error handling | 12 | |
| Responsive design | 15 | |
| Multi-service | 7 | |
| **Total** | **106** | |
