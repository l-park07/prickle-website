// Prickle coming-soon page — waitlist form behavior.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app-check.js';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);

// TODO: replace with the real reCAPTCHA v3 site key from the App Check
// console registration (see console steps below). Do not enable enforcement
// on Firestore until this page is deployed and confirmed to be sending
// valid App Check tokens — enforcing too early locks out real visitors too.
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('TODO_RECAPTCHA_V3_SITE_KEY'),
  isTokenAutoRefreshEnabled: true,
});

const db = getFirestore(app);

const form = document.getElementById('waitlist-form');
const emailInput = document.getElementById('email');
const honeypotInput = document.getElementById('company');
const submitBtn = document.getElementById('submit-btn');
const errorInvalid = document.getElementById('error-invalid');
const errorFailed = document.getElementById('error-failed');
const successMessage = document.getElementById('success-message');

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function hideMessages() {
  errorInvalid.hidden = true;
  errorFailed.hidden = true;
}

function showSuccess() {
  form.hidden = true;
  successMessage.hidden = false;
}

function setPending(isPending) {
  submitBtn.disabled = isPending;
  submitBtn.textContent = isPending ? 'Sending…' : 'Keep me posted';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideMessages();

  // Honeypot filled -> bot. Pretend success, do nothing.
  if (honeypotInput.value.trim() !== '') {
    showSuccess();
    return;
  }

  const email = emailInput.value.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    errorInvalid.hidden = false;
    return;
  }

  setPending(true);

  try {
    await addDoc(collection(db, 'waitlist'), {
      email,
      createdAt: serverTimestamp(),
      source: 'getprickle.app',
      userAgent: navigator.userAgent,
    });
    showSuccess();
  } catch (err) {
    errorFailed.hidden = false;
    setPending(false);
  }
});
