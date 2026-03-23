const firebaseConfig = {
  apiKey: "AIzaSyBoQVkpLfgLSdH9NyF3zvcc05rsS97UAI4",
  authDomain: "campus-event-board-13a10.firebaseapp.com",
  projectId: "campus-event-board-13a10",
  storageBucket: "campus-event-board-13a10.firebasestorage.app",
  messagingSenderId: "570338782997",
  appId: "1:570338782997:web:736360e87ee00ca118031c"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ─── REGISTER ───────────────────────────────────────────
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    // Basic validation
    let valid = true;
    if (!name) {
      showError("name-error", "Name is required");
      valid = false;
    }
    if (!email) {
      showError("email-error", "Email is required");
      valid = false;
    }
    if (password.length < 6) {
      showError("password-error", "Password must be at least 6 characters");
      valid = false;
    }
    if (!valid) return;

    try {
      // Create user in Firebase Auth
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Save user info to Firestore
      await db.collection("users").doc(user.uid).set({
        userId: user.uid,
        name: name,
        email: email,
        role: "user",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Redirect to events page after registration
      window.location.href = "pages/events.html";

    } catch (error) {
      handleFirebaseError(error);
    }
  });
}

// ─── LOGIN ───────────────────────────────────────────────
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    let valid = true;
    if (!email) {
      showError("email-error", "Email is required");
      valid = false;
    }
    if (!password) {
      showError("password-error", "Password is required");
      valid = false;
    }
    if (!valid) return;

    try {
      await auth.signInWithEmailAndPassword(email, password);

      // Store the token for API calls
      const token = await auth.currentUser.getIdToken();
      localStorage.setItem("authToken", token);

      window.location.href = "pages/events.html";

    } catch (error) {
      handleFirebaseError(error);
    }
  });
}

// ─── HELPER FUNCTIONS ────────────────────────────────────

// Get a fresh token and store it (call this before any API request)
async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken(true);
  localStorage.setItem("authToken", token);
  return token;
}

// Attach token to API requests
async function apiRequest(url, options = {}) {
  const token = await getAuthToken();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...options.headers
    }
  });
}

// Redirect to login if not logged in
function requireAuth() {
  auth.onAuthStateChanged((user) => {
    if (!user) window.location.href = "../login.html";
  });
}

// Logout
async function logout() {
  await auth.signOut();
  localStorage.removeItem("authToken");
  window.location.href = "../login.html";
}

function showError(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}

function clearErrors() {
  document.querySelectorAll(".error").forEach(el => el.textContent = "");
}

function handleFirebaseError(error) {
  const messages = {
    "auth/email-already-in-use": "An account with this email already exists",
    "auth/invalid-email": "Please enter a valid email address",
    "auth/wrong-password": "Incorrect password",
    "auth/user-not-found": "No account found with this email",
    "auth/too-many-requests": "Too many attempts. Please try again later"
  };
  const message = messages[error.code] || "Something went wrong. Please try again.";
  showError("general-error", message);
}