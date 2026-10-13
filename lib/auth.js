import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, PARTNER_KEY, OTP } from '../config/settings.js';

// Request headers used by every DMoney call (token optional for login)
export function headers(token) {
  const h = { 'Content-Type': 'application/json', 'X-AUTH-SECRET-KEY': PARTNER_KEY };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

// Login with the user's own email + password, returns a JWT or null
// Used by: seed-users.js (admin, system, agent1) and dmoney-load-test.js setup() (all 6 users)
export function login(email, password) {
  const tags = { api: 'auth' }; // keeps login calls out of the transaction metrics
  const loginRes = http.post(
    `${BASE_URL}/user/login`,
    JSON.stringify({ email, password }),
    { headers: headers(), tags }
  );
  const loggedIn = check(loginRes, { [`login ${email}`]: (r) => r.status === 200 }, tags);
  if (!loggedIn) return null;

  // Admin and SYSTEM get the token straight away (no OTP step)
  if (loginRes.json('token')) return loginRes.json('token');

  // Agent / Customer / Merchant: verify the dev OTP (0000) to get the token
  const otpRes = http.post(
    `${BASE_URL}/user/verify-otp?env=dev`,
    JSON.stringify({ identifier: email, otp: OTP }),
    { headers: headers(), tags }
  );
  const verified = check(otpRes, { [`otp ${email}`]: (r) => r.status === 200 && !!r.json('token') }, tags);
  return verified ? otpRes.json('token') : null;
}
