// static/js/auth.js
/**
 * Auth module for Scribbl (local-first).
 * Responsibilities:
 *  - Sign up (create local settings.user record with secureSalt, authHash)
 *  - Sign in (verify password-derived authHash, derive encryption key for secure notes)
 *  - Expose lock/unlock and auto-lock
 *  - Dispatch auth events for the app
 *
 * NOTES:
 * - This file contains a minimal indexedDB wrapper scoped to settings store.
 * - PBKDF2 iterations are intentionally high; on low-end devices adjust in settings.
 */

const AUTH_DB = {
  name: 'scribbl_db',
  version: 1,
  stores: ['settings']
};

const DEFAULT_KDF_ITER = 200000; // conservative high iteration count
const PBKDF2_HASH = 'SHA-256';
const KEY_ALGO = 'AES-GCM'; // used for wrapping small session tokens

/* =======================
   Minimal IndexedDB Wrapper
   ======================= */
function openSettingsDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = indexedDB.open(AUTH_DB.name, AUTH_DB.version);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'userId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(store, key) {
  try {
    const db = await openSettingsDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const os = tx.objectStore(store);
      const r = os.get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } catch (err) {
    // Fallback to localStorage
    console.warn('IDB get failed, using localStorage fallback', err);
    const raw = localStorage.getItem(`${store}:${key}`);
    return raw ? JSON.parse(raw) : null;
  }
}

async function idbPut(store, obj) {
  try {
    const db = await openSettingsDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const os = tx.objectStore(store);
      const r = os.put(obj);
      tx.oncomplete = () => resolve(obj);
      tx.onerror = () => reject(tx.error || r.error);
    });
  } catch (err) {
    console.warn('IDB put failed, using localStorage fallback', err);
    try {
      if (!obj.userId) throw new Error('missing userId for localStorage fallback');
      localStorage.setItem(`${store}:${obj.userId}`, JSON.stringify(obj));
      return obj;
    } catch (e) {
      throw e;
    }
  }
}

async function idbDelete(store, key) {
  try {
    const db = await openSettingsDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const os = tx.objectStore(store);
      const r = os.delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || r.error);
    });
  } catch (err) {
    console.warn('IDB delete fallback', err);
    localStorage.removeItem(`${store}:${key}`);
    return true;
  }
}

/* =======================
   Utilities
   ======================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function emitAuthEvent(name, detail = {}) {
  const ev = new CustomEvent(name, { detail, bubbles: true });
  window.dispatchEvent(ev);
}

/* =======================
   Crypto helpers (Web Crypto)
   ======================= */

function str2ab(str) {
  return new TextEncoder().encode(str);
}
function ab2str(ab) {
  return new TextDecoder().decode(ab);
}
function ab2b64(arr) {
  // arr can be ArrayBuffer or TypedArray
  const bytes = new Uint8Array(arr);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
function b642ab(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
function randomBytes(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

async function importPasswordKey(password) {
  return crypto.subtle.importKey('raw', str2ab(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
}

/**
 * Derive an AES-GCM CryptoKey from a password+salt.
 * @param {string} password
 * @param {string} saltB64 base64 string or raw string (if not base64)
 * @param {number} iterations
 */
async function deriveAesKey(password, saltB64, iterations = DEFAULT_KDF_ITER) {
  const saltBuf = typeof saltB64 === 'string' && saltB64.length > 0 && /^[A-Za-z0-9+/=]+$/.test(saltB64)
    ? b642ab(saltB64)
    : str2ab(saltB64);
  const baseKey = await importPasswordKey(password);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBuf, iterations, hash: PBKDF2_HASH },
    baseKey,
    { name: KEY_ALGO, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Create an auth hash for fast password check: derive bytes and b64 them.
 * This is NOT the encryption key — it's a stored verification value (salted derived bytes).
 */
async function createAuthHash(password, saltB64, iterations = DEFAULT_KDF_ITER) {
  const saltBuf = typeof saltB64 === 'string' && /^[A-Za-z0-9+/=]+$/.test(saltB64) ? b642ab(saltB64) : str2ab(saltB64);
  const keyMaterial = await importPasswordKey(password);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBuf, iterations, hash: PBKDF2_HASH }, keyMaterial, 256);
  return ab2b64(derived);
}

/**
 * AES-GCM encrypt small payload with given CryptoKey. Returns {iv, ciphertext} base64.
 */
async function aesGcmEncrypt(plainStr, cryptoKey) {
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, str2ab(plainStr));
  return {
    iv: ab2b64(iv),
    ciphertext: ab2b64(ct)
  };
}
async function aesGcmDecrypt({ iv, ciphertext }, cryptoKey) {
  const ivBuf = b642ab(iv);
  const ctBuf = b642ab(ciphertext);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuf }, cryptoKey, ctBuf);
  return ab2str(plain);
}

/* =======================
   Password strength (simple heuristic)
   - No external libs to keep localized.
   - Returns score 0..4 and label.
   ======================= */
function passwordScore(password) {
  if (!password) return { score: 0, label: 'Too short' };
  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^\da-zA-Z]/.test(password)) score++;
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score: Math.min(score, 4), label: labels[Math.min(score, 4)] };
}

/* =======================
   Persistence keys/structure
   settings record shape:
   {
     userId: 'local',
     email: 'user@example.com',
     secureSalt: '<base64>',
     authHash: '<base64>',
     kdfIterations: 200000,
     createdAt: 169..., updatedAt: 169...
   }
   ======================= */

const SETTINGS_KEY = 'local'; // single-user app

/* =======================
   Module state
   ======================= */
let inMemoryCryptoKey = null;
let autoLockTimer = null;
let autoLockMs = 5 * 60 * 1000; // default 5 min, configurable later
let isLocked = true;

/* =======================
   Authentication functions
   ======================= */

async function hasExistingAccount() {
  const s = await idbGet('settings', SETTINGS_KEY).catch(() => null);
  return !!s;
}

async function signUp(email, password) {
  if (!email || !password) throw createError('invalid_input', 'Email and password required');
  // create salt, create authHash and store settings
  const secureSalt = ab2b64(randomBytes(16));
  const authHash = await createAuthHash(password, secureSalt);
  const now = Date.now();
  const record = {
    userId: SETTINGS_KEY,
    email,
    secureSalt,
    authHash,
    kdfIterations: DEFAULT_KDF_ITER,
    createdAt: now,
    updatedAt: now
  };
  await idbPut('settings', record);
  emitAuthEvent('auth:signup', { userId: SETTINGS_KEY, createdAt: now });
  return record;
}

async function login(email, password, remember = false) {
  const settings = await idbGet('settings', SETTINGS_KEY);
  if (!settings) throw createError('no_account', 'No account found. Please sign up first.');
  // basic email match (optional)
  if (settings.email && settings.email.toLowerCase() !== (email || '').toLowerCase()) {
    // still allow login using saved settings email OR provide clearer UX
    // We'll treat mismatch as an error (sensible for single-user)
    throw createError('email_mismatch', 'Email does not match this local account.');
  }
  // verify password: compute hash and compare constant-time
  const derivedHash = await createAuthHash(password, settings.secureSalt, settings.kdfIterations);
  if (!timingSafeEqual(derivedHash, settings.authHash)) {
    throw createError('auth_failed', 'Incorrect password.');
  }
  // derive crypto key used for encryption/decryption of secure notes; store in-memory
  inMemoryCryptoKey = await deriveAesKey(password, settings.secureSalt, settings.kdfIterations);
  isLocked = false;
  emitAuthEvent('auth:login', { userId: SETTINGS_KEY });
    // Set current user in data manager
  window.dataManager.setCurrentUser(email);
  window.dataManager.addToHistory('user_login', 'User signed in successfully');
  // remember me: create a small session token and wrap it with derived key
  if (remember) {
    try {
      const token = ab2b64(randomBytes(32));
      const wrapped = await aesGcmEncrypt(token, inMemoryCryptoKey);
      // store wrapped token (JSON) in localStorage
      localStorage.setItem('scribbl:session', JSON.stringify(wrapped));
    } catch (err) {
      console.warn('remember me store failed', err);
    }
  }
  startAutoLockTimer();
  return true;
}

async function tryResumeSession() {
  // Attempt to load session token in localStorage and unwrap it if we can derive the key
  const wrappedJson = localStorage.getItem('scribbl:session');
  if (!wrappedJson) return false;
  const settings = await idbGet('settings', SETTINGS_KEY).catch(() => null);
  if (!settings) return false;
  // We cannot derive key without password. So "Remember me" typically requires keeping key material around.
  // This design stores only a wrapped session; you still need a password to unwrap.
  // For a true passwordless resume you'd need OS-level secure storage.
  return false; // intentionally conservative
}

async function logout() {
  // clear in-memory keys and session
  inMemoryCryptoKey = null;
  isLocked = true;
  clearAutoLockTimer();
  emitAuthEvent('auth:logout', { userId: SETTINGS_KEY });
}

function lockAll() {
  // clear keys and mark locked
  inMemoryCryptoKey = null;
  isLocked = true;
  clearAutoLockTimer();
  window.dataManager.logout();
  emitAuthEvent('auth:logout', { userId: SETTINGS_KEY });
}

/* =======================
   Helpers
   ======================= */
function createError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}
function timingSafeEqual(a, b) {
  // a, b are base64 strings. Compare in constant time by converting to bytes
  const A = b642ab(a);
  const B = b642ab(b);
  if (A.byteLength !== B.byteLength) return false;
  const aView = new Uint8Array(A);
  const bView = new Uint8Array(B);
  let diff = 0;
  for (let i = 0; i < aView.length; i++) diff |= aView[i] ^ bView[i];
  return diff === 0;
}

/* =======================
   Auto-lock handling
   ======================= */
function startAutoLockTimer() {
  clearAutoLockTimer();
  autoLockTimer = setTimeout(() => {
    lockAll();
    emitAuthEvent('auth:autolock', {});
  }, autoLockMs);
}
function clearAutoLockTimer() {
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
    autoLockTimer = null;
  }
}
function resetAutoLockTimer() {
  if (!isLocked) startAutoLockTimer();
}

/* =======================
   UI Wiring (connects to index.html)
   ======================= */

function enableElement(el) { el && (el.disabled = false); }
function disableElement(el) { el && (el.disabled = true); }
function showError(container, message) {
  if (!container) return;
  container.textContent = message;
  container.hidden = false;
}
function hideError(container) {
  if (!container) return;
  container.textContent = '';
  container.hidden = true;
}

function showPanel(panelId) {
  // Toggle visibility of sign in/up panels and tab aria
  const signinTab = $('#tab-signin');
  const signupTab = $('#tab-signup');
  const signin = $('#panel-signin');
  const signup = $('#panel-signup');
  if (panelId === 'signin') {
    signin.classList.remove('sb-hidden');
    signup.classList.add('sb-hidden');
    signinTab.classList.add('sb-tab--active');
    signupTab.classList.remove('sb-tab--active');
    signinTab.setAttribute('aria-selected', 'true');
    signupTab.setAttribute('aria-selected', 'false');
  } else {
    signin.classList.add('sb-hidden');
    signup.classList.remove('sb-hidden');
    signinTab.classList.remove('sb-tab--active');
    signupTab.classList.add('sb-tab--active');
    signinTab.setAttribute('aria-selected', 'false');
    signupTab.setAttribute('aria-selected', 'true');
  }
}

/* Attach event listeners to the DOM components */
function wireUi() {
  // Tabs
  $('#tab-signin').addEventListener('click', () => showPanel('signin'));
  $('#tab-signup').addEventListener('click', () => showPanel('signup'));
  $('#signin-switch').addEventListener('click', () => showPanel('signup'));
  $('#signup-switch').addEventListener('click', () => showPanel('signin'));

  // Forms
  $('#panel-signin').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    hideError($('#signin-error'));

    const email = $('#signin-email').value.trim();
    const password = $('#signin-password').value;
    const remember = !!$('#signin-remember').checked;
    disableElement($('#signin-submit'));
    try {
      await login(email, password, remember);
      // successful; navigate to dashboard or signal main
      emitAuthEvent('auth:unlocked', { userId: SETTINGS_KEY });
      // small defer to allow listeners to run
      setTimeout(() => window.location.href = 'dashboard.html', 50);
    } catch (err) {
      showError($('#signin-error'), translateAuthError(err));
      emitAuthEvent('auth:error', { code: err.code || 'unknown', message: err.message });
    } finally {
      enableElement($('#signin-submit'));
    }
  });

  $('#panel-signup').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    hideError($('#signup-error'));

    const email = $('#signup-email').value.trim();
    const password = $('#signup-password').value;
    const confirm = $('#signup-password-confirm').value;
    if (!email) {
      showError($('#signup-error'), 'Please enter an email.');
      return;
    }
    if (password !== confirm) {
      showError($('#signup-error'), 'Passwords do not match.');
      return;
    }
    const strength = passwordScore(password);
    if (strength.score < 2) {
      showError($('#signup-error'), 'Choose a stronger password.');
      return;
    }

    disableElement($('#signup-submit'));
    try {
      await signUp(email, password);
      // auto-login after signup
      await login(email, password, false);
      emitAuthEvent('auth:unlocked', { userId: SETTINGS_KEY });
      setTimeout(() => window.location.href = 'dashboard.html', 50);
    } catch (err) {
      console.error('Sign up failed', err);
      showError($('#signup-error'), translateAuthError(err));
      emitAuthEvent('auth:error', { code: err.code || 'unknown', message: err.message });
    } finally {
      enableElement($('#signup-submit'));
    }
  });

  // Password strength meter
  const pwdEl = $('#signup-password');
  const meter = $('#pw-strength-meter');
  const label = $('#pw-strength-label');
  pwdEl && pwdEl.addEventListener('input', (e) => {
    const v = e.target.value || '';
    const res = passwordScore(v);
    const percent = Math.round((res.score / 4) * 100);
    meter.style.width = `${percent}%`;
    meter.setAttribute('aria-valuenow', percent);
    label.textContent = res.label;
  });

  // Forgot modal
  $('#signin-forgot').addEventListener('click', () => {
    $('#modal-forgot').classList.remove('sb-hidden');
    $('#modal-forgot').querySelector('.sb-modal-panel').focus();
  });
  $('#forgot-close').addEventListener('click', () => {
    $('#modal-forgot').classList.add('sb-hidden');
  });
  $('#forgot-reset').addEventListener('click', async () => {
    // user confirmed reset — delete settings and optionally reload
    if (!confirm('Reset local account? This will remove all notes and cannot be undone.')) return;
    await idbDelete('settings', SETTINGS_KEY).catch(() => {});
    localStorage.clear();
    alert('Local data removed. The app will reload to initial state.');
    window.location.reload();
  });

  // keyboard accessibility for tabs
  $('#tab-signin').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      $('#tab-signup').focus();
    }
  });
  $('#tab-signup').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      $('#tab-signin').focus();
    }
  });

  // close modal on esc
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const m = $('#modal-forgot');
      if (m && !m.classList.contains('sb-hidden')) m.classList.add('sb-hidden');
    }
  });

  // reset auto-lock timer on user interaction
  ['click', 'keydown', 'mousemove', 'touchstart'].forEach(evt =>
    document.addEventListener(evt, resetAutoLockTimer, { passive: true })
  );
}

/* =======================
   Error translation
   ======================= */
function translateAuthError(err) {
  if (!err) return 'Unknown error';
  switch (err.code) {
    case 'no_account': return 'No account exists on this device. Create a new account.';
    case 'auth_failed': return 'Incorrect password. Try again.';
    case 'email_mismatch': return 'Email does not match local account.';
    case 'invalid_input': return 'Missing email or password.';
    default: return err.message || 'An unexpected error occurred.';
  }
}

/* =======================
   Public API for other modules (exported in global namespace)
   ======================= */

window.ScribblAuth = {
  init: async function () {
    wireUi();
    // On init, hide signup if account exists
    const exist = await hasExistingAccount().catch(() => false);
    if (exist) {
      showPanel('signin');
      // optionally show email in the sign-in form
      const s = await idbGet('settings', SETTINGS_KEY).catch(() => null);
      if (s && s.email) $('#signin-email').value = s.email;
    } else {
      showPanel('signup');
    }
    emitAuthEvent('auth:init', { hasAccount: exist });
  },
  logout: async function () {
    await logout();
    // return to sign-in page
    window.location.href = 'index.html';
  },
  lock: function () {
    lockAll();
  },
  unlockWithPassword: async function (password) {
    const settings = await idbGet('settings', SETTINGS_KEY);
    if (!settings) throw createError('no_account', 'No account to unlock');
    // attempt login with stored email
    return login(settings.email, password, false);
  },
  isLocked: () => isLocked,
  setAutoLockMs: (ms) => { autoLockMs = ms; startAutoLockTimer(); },
  getInMemoryKey: () => inMemoryCryptoKey // used by secure.js or other modules (pass-by-reference; do NOT expose raw key widely)
};

/* =======================
   Auto-initialize when script loads
   ======================= */
document.addEventListener('DOMContentLoaded', () => {
  // Defer a tick so index.html elements are ready
  setTimeout(() => {
    window.ScribblAuth.init().catch(err => {
      console.error('Auth init failed', err);
      emitAuthEvent('auth:error', { message: err.message });
    });
  }, 0);
});