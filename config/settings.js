// Shared settings: used by scripts/seed-users.js, scripts/dmoney-load-test.js, lib/auth.js, lib/transactions.js
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000'; // local DMoney API
export const PARTNER_KEY = __ENV.PARTNER_KEY || 'ROADTOSDET'; //  X-AUTH-SECRET-KEY header
export const OTP = '0000'; // dev environment OTP (verify-otp?env=dev)

export const RATE = Number(__ENV.RATE || 3); // transactions per second, per flow
export const AMOUNT = Number(__ENV.AMOUNT || 10); // Tk per transaction (API minimum is 10)
export const WINDOW_SECONDS = Number(__ENV.WINDOW_SECONDS || 30); // length of each of the 4 windows

export const AGENT_FUNDING = 20000; // seed: SYSTEM -> each agent
export const CUSTOMER_FUNDING = 5000; // seed: Agent 1 -> each customer (cap is 10000)

// Seeded accounts that already exist in the DMoney DB
export const ADMIN = { email: 'admin@dmoney.com', password: '1234' };
export const SYSTEM = { email: 'system@dmoney.com', password: '1234', phone_number: 'SYSTEM' };

// Which set of 6 test users to use (2 digits). The DMoney API slows down as an account's history grows,
// so use a NEW set number for a clean run: $env:USER_SET="22" (then run seed-users.js once for that set)
const SET = String(__ENV.USER_SET || '21').padStart(2, '0');

// The 6 test users: created by seed-users.js, logged in by setup() of the load test
// Set 21 -> phones 01921000001..01921000006, emails k6set21agent1@gmail.com ...
export const USERS = {
  agent1: { name: 'K6 Agent One', email: `k6set${SET}agent1@gmail.com`, password: '1234', phone_number: `019${SET}000001`, nid: '1234567890', role: 'Agent' },
  agent2: { name: 'K6 Agent Two', email: `k6set${SET}agent2@gmail.com`, password: '1234', phone_number: `019${SET}000002`, nid: '1234567890', role: 'Agent' },
  customer1: { name: 'K6 Customer One', email: `k6set${SET}customer1@gmail.com`, password: '1234', phone_number: `019${SET}000003`, nid: '1234567890', role: 'Customer' },
  customer2: { name: 'K6 Customer Two', email: `k6set${SET}customer2@gmail.com`, password: '1234', phone_number: `019${SET}000004`, nid: '1234567890', role: 'Customer' },
  merchant1: { name: 'K6 Merchant One', email: `k6set${SET}merchant1@gmail.com`, password: '1234', phone_number: `019${SET}000005`, nid: '1234567890', role: 'Merchant' },
  merchant2: { name: 'K6 Merchant Two', email: `k6set${SET}merchant2@gmail.com`, password: '1234', phone_number: `019${SET}000006`, nid: '1234567890', role: 'Merchant' },
};
