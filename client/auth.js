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

      // Get token for the Node API call
      const token = await user.getIdToken();

      // Register user in Firestore + trigger welcome email via Node
      const response = await fetch('http://localhost:3000/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email })
      });

      if (!response.ok) {
        throw new Error('Registration incomplete. Please try again.');
      }

      // E-01: send Firebase email verification
      auth.currentUser.sendEmailVerification().catch(err => {
        console.warn('Verification email failed to send:', err.message);
      });

      // Don't redirect — show a "please verify" message instead
      document.getElementById('register-form').innerHTML = `
        <div style="text-align:center; padding: 20px 0;">
          <p style="font-size:18px; font-weight:bold; color:#2E5F8A; margin-bottom:12px;">
            Almost there!
          </p>
          <p style="font-size:15px; color:#444; margin-bottom:16px;">
            We sent a verification email to <strong>${email}</strong>.<br>
            Please check your inbox and click the link to verify your account.
          </p>
          <p style="font-size:14px; color:#888; margin-bottom:20px;">
            Once verified, you can log in below.
          </p>
          <a href="login.html"
             style="display:inline-block; background:#2E5F8A; color:#fff;
                    padding:12px 28px; border-radius:6px; text-decoration:none;
                    font-weight:bold; font-size:14px;">
            Go to Login →
          </a>
          <p style="margin-top:16px; font-size:13px; color:#888;">
            Didn't receive it? Check your spam folder or
            <a href="#" id="resend-from-register" style="color:#2E5F8A;">
              click here to resend
            </a>.
          </p>
        </div>
      `;

      // Wire up the resend link in the confirmation message
      const resendFromReg = document.getElementById('resend-from-register');
      if (resendFromReg) {
        resendFromReg.addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            await auth.currentUser.sendEmailVerification();
            resendFromReg.textContent = 'Sent! Check your inbox.';
            resendFromReg.style.pointerEvents = 'none';
          } catch (err) {
            resendFromReg.textContent = 'Could not resend. Try again shortly.';
          }
        });
      }

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

      // E-01 enforcement: block unverified accounts
      if (!auth.currentUser.emailVerified) {
        const unverifiedEmail = auth.currentUser.email;
        await auth.signOut();

        showError('general-error',
          'Please verify your email address before logging in. ' +
          'Check your inbox for the verification link.'
        );

        const resendEl = document.getElementById('resend-verification');
        const resendLink = document.getElementById('resend-link');
        if (resendEl) resendEl.style.display = 'block';

        if (resendLink) {
          resendLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
              const cred = await auth.signInWithEmailAndPassword(
                unverifiedEmail, password
              );
              await cred.user.sendEmailVerification();
              await auth.signOut();
              resendLink.textContent = 'Verification email sent! Check your inbox.';
              resendLink.style.pointerEvents = 'none';
            } catch (err) {
              showError('general-error', 'Could not resend. Please try again.');
            }
          });
        }
        return;
      }

      // Verified — proceed with normal login
      const token = await auth.currentUser.getIdToken();
      localStorage.setItem("authToken", token);

      // If this account was pending deletion, cancel it immediately on login.
      // Fire-and-forget — a failure here must never block the redirect.
      fetch('http://localhost:3000/api/users/reinstate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }).catch(err => console.warn('[REINSTATE] Could not reach server:', err.message));

      window.location.href = "pages/events.html";

    } catch (error) {
      handleFirebaseError(error);
    }
  });
}

// ─── FORGOT PASSWORD ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const forgotLink = document.getElementById('forgot-password-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      if (!email) {
        showError('email-error', 'Enter your email address above first.');
        return;
      }
      try {
        await auth.sendPasswordResetEmail(email);
        document.getElementById('login-form').innerHTML =
          '<p style="text-align:center;color:#2E5F8A;font-size:15px;">' +
          'Password reset email sent! Check your inbox.</p>';
      } catch (error) {
        handleFirebaseError(error);
      }
    });
  }
});

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

// Redirect to login if not logged in, and kick out unverified sessions
function requireAuth() {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "../login.html";
      return;
    }
    if (!user.emailVerified) {
      auth.signOut();
      window.location.href = "../login.html";
    }
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
    "auth/too-many-requests": "Too many attempts. Please try again later",
    "auth/invalid-credential":   "Incorrect email or password",
    "auth/invalid-login-credentials": "Incorrect email or password",
  };
  const message = messages[error.code] || "Something went wrong. Please try again.";
  showError("general-error", message);
}
