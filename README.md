# Campus Event Board

A three-tier campus event management app: browse events, RSVP, join waitlists, and comment.

| Tier | Technology | Port |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS | served by Live Server (5500) |
| API Server | Node.js + Express | 3000 |
| Waitlist Service | Java + Spring Boot | 8080 |

---

## Prerequisites

| Tool | Minimum version | Check |
|---|---|---|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Java JDK | 17+ | `java --version` |
| Maven wrapper | bundled | `./waitlist-service/mvnw --version` |
| VS Code + Live Server | latest | or any static file server |

You also need a **Firebase project** with Firestore enabled.

---

## First-time setup

### 1. Clone and install Node dependencies

```bash
git clone <your-repo-url>
cd <project-root>

# Install root-level dependencies (if any)
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 2. Add Firebase credentials

Two credential files are required — **do not commit either to Git**.

**`firebase-admin-key.json`** (project root)
Download from Firebase Console → Project Settings → Service Accounts → Generate new private key.

**`waitlist-service/src/main/resources/serviceAccountKey.json`**
Same file, copied to the Java service. The Spring Boot app reads it via `application.properties`.

### 3. Configure the Node server environment

Create `server/.env`:

```
# Port the Node server listens on (default: 3000)
PORT=3000

# URL of the Java waitlist service (default: http://localhost:8080)
JAVA_SERVICE_URL=http://localhost:8080
```

---

## Running all three services

Open **three separate terminal windows**.

### Terminal 1 — Node API server

```bash
cd server
node index.js
```

Expected output:
```
✅  Node server running on http://localhost:3000
    Health check: http://localhost:3000/health
```

### Terminal 2 — Java waitlist service

```bash
cd waitlist-service
./mvnw spring-boot:run
```

The first run downloads dependencies — this can take 1–2 minutes.

Expected output (look for):
```
Started WaitlistServiceApplication in X.XXX seconds
```

On Windows use `mvnw.cmd` instead of `./mvnw`.

### Terminal 3 — Frontend (VS Code Live Server)

1. Open the project root in VS Code
2. Right-click `client/index.html` → **Open with Live Server**
3. Browser opens at `http://127.0.0.1:5500`

Alternatively, any static file server works:

```bash
# Python
python3 -m http.server 5500 --directory client

# npx serve
npx serve client -p 5500
```

---

## Verifying all services are up

```bash
# Node server
curl http://localhost:3000/health
# → {"status":"ok","service":"node","timestamp":"..."}

# Java service (Spring Boot Actuator)
curl http://localhost:8080/actuator/health
# → {"status":"UP"}

# Quick RSVP API test (replace TOKEN and EVENT_ID)
curl -X POST http://localhost:3000/api/events/EVENT_ID/rsvp \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json"
```

---

## CORS troubleshooting

The Node server (`server/index.js`) allows these origins by default:

- `http://127.0.0.1:5500` — Live Server
- `http://localhost:5500`
- `http://127.0.0.1:5501`, `http://localhost:5501` — second Live Server instance
- `http://localhost:3000`, `http://localhost:8080`
- `null` — `file://` origins

If you serve the frontend on a different port, add it to the `allowedOrigins` array in `server/index.js`.

---

## Project structure

```
.
├── client/                  # Frontend (HTML/CSS/JS)
│   ├── index.html           # Landing page
│   ├── login.html
│   ├── register.html
│   ├── auth.js              # Firebase Auth + shared helpers
│   ├── styles.css
│   ├── js/
│   │   ├── api.js           # API wrapper (fetch + error handling)
│   │   ├── events-page.js
│   │   ├── event-detail.js
│   │   ├── create-event.js
│   │   └── profile.js
│   └── pages/
│       ├── events.html
│       ├── event-detail.html
│       ├── create-event.html
│       └── profile.html
│
├── server/                  # Node.js API server
│   ├── index.js             # Express app + CORS config
│   ├── middleware/auth.js   # Firebase token verification
│   ├── routes/events.js     # All /api/events/* routes
│   ├── services/
│   │   ├── firestoreService.js
│   │   └── javaService.js   # Proxies to Java waitlist service
│   └── .env                 # PORT, JAVA_SERVICE_URL (not committed)
│
├── waitlist-service/        # Java Spring Boot microservice
│   ├── src/main/java/com/yourapp/
│   │   ├── controller/WaitlistController.java
│   │   ├── service/WaitlistService.java
│   │   └── model/
│   └── src/main/resources/
│       ├── application.properties
│       └── serviceAccountKey.json  (not committed)
│
├── firebase-admin-key.json  # (not committed)
└── README.md
```

---

## User flows

| Flow | Steps |
|---|---|
| Register | `index.html` → Register → `events.html` |
| Log in | `login.html` → `events.html` |
| Create event | Events page → "+ Create Event" → fill form → submit |
| RSVP | Event detail → "RSVP to this event" |
| Join waitlist | Event detail (full) → "Join Waitlist" |
| Cancel RSVP | Event detail → "✓ Going — Cancel RSVP" → confirm |
| Waitlist promotion | Automatic when someone cancels (Java service) |
| Comment | Event detail → comment box → Post |
| Delete event | Event detail (owner only) → "Delete Event" → confirm |
| View profile | Navbar → "Profile" |

---

## Common errors

| Error | Likely cause | Fix |
|---|---|---|
| `Could not reach the server` | Node server not running | `cd server && node index.js` |
| `Java waitlist service is not running` | Spring Boot not started | `cd waitlist-service && ./mvnw spring-boot:run` |
| `Invalid token` | Firebase token expired | Log out and log back in |
| CORS error in browser console | Frontend port not in allowedOrigins | Add your port to `server/index.js` allowedOrigins |
| `Could not load firebase-admin-key.json` | Missing credential file | Download from Firebase Console |

---

## .gitignore additions

Make sure these are in your `.gitignore`:

```
firebase-admin-key.json
waitlist-service/src/main/resources/serviceAccountKey.json
waitlist-service/target/classes/serviceAccountKey.json
server/.env
.DS_Store
```
