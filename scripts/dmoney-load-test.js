// DMoney 2-minute load test: 13 flows in four 30s windows. Run from project root: k6 run scripts/dmoney-load-test.js
// File order: 1) FLOWS  2) scenarios  3) thresholds  4) options  5) setup()  6) default function  7) handleSummary()
import { fail } from 'k6';
import { USERS, RATE, WINDOW_SECONDS } from '../config/settings.js'; // test users + rate/window settings
import { login } from '../lib/auth.js'; // login + dev OTP, used by setup()
import { transact } from '../lib/transactions.js'; // one API call + 4 checks, used by the default function
import { APIS, selector, buildSummary } from '../lib/report.js'; // tag names + report files, used by thresholds and handleSummary()

// 1) The 13 flows from the assignment. win = 30s window (1..4), from/to = keys of USERS in config/settings.js
const FLOWS = [
  // Window 1 (0-30s): 2 flows at the same time
  { name: 'w1_customer1_sendmoney_customer2', win: 1, api: 'sendmoney', from: 'customer1', to: 'customer2' },
  { name: 'w1_customer2_payment_merchant1', win: 1, api: 'payment', from: 'customer2', to: 'merchant1' },
  // Window 2 (30-60s): 3 flows at the same time
  { name: 'w2_customer2_sendmoney_customer1', win: 2, api: 'sendmoney', from: 'customer2', to: 'customer1' },
  { name: 'w2_agent1_deposit_customer2', win: 2, api: 'deposit', from: 'agent1', to: 'customer2' },
  { name: 'w2_customer1_payment_merchant1', win: 2, api: 'payment', from: 'customer1', to: 'merchant1' },
  // Window 3 (60-90s): 4 flows at the same time
  { name: 'w3_agent1_deposit_customer1', win: 3, api: 'deposit', from: 'agent1', to: 'customer1' },
  { name: 'w3_agent2_deposit_customer2', win: 3, api: 'deposit', from: 'agent2', to: 'customer2' },
  { name: 'w3_customer1_sendmoney_customer2', win: 3, api: 'sendmoney', from: 'customer1', to: 'customer2' },
  { name: 'w3_customer2_payment_merchant2', win: 3, api: 'payment', from: 'customer2', to: 'merchant2' },
  // Window 4 (90-120s): 4 flows at the same time
  { name: 'w4_agent1_payment_merchant1', win: 4, api: 'payment', from: 'agent1', to: 'merchant1' },
  { name: 'w4_agent2_payment_merchant2', win: 4, api: 'payment', from: 'agent2', to: 'merchant2' },
  { name: 'w4_customer1_payment_merchant1', win: 4, api: 'payment', from: 'customer1', to: 'merchant1' },
  { name: 'w4_customer2_payment_merchant2', win: 4, api: 'payment', from: 'customer2', to: 'merchant2' },
];

// Lookup used by the default function: scenario env FLOW -> its FLOWS entry
const FLOW_BY_NAME = {};
FLOWS.forEach((flow) => (FLOW_BY_NAME[flow.name] = flow));

// 2) One scenario per flow. startTime = window start, so flows in the same window run concurrently for 30s.
const scenarios = {};
FLOWS.forEach((flow) => {
  scenarios[flow.name] = {
    executor: 'constant-arrival-rate', // steady RATE requests per second
    rate: RATE,
    timeUnit: '1s',
    duration: `${WINDOW_SECONDS}s`,
    startTime: `${(flow.win - 1) * WINDOW_SECONDS}s`, // 0s, 30s, 60s, 90s
    preAllocatedVUs: 5,
    maxVUs: 40,
    env: { FLOW: flow.name }, // tells the default function which flow to run (no "exec": default function is the entry point)
    tags: { window: `w${flow.win}` },
  };
});

// 3) Thresholds. Operators follow the assignment wording exactly.
const thresholds = {
  // Global: failed < 1%, p95 below 1000 ms, checks pass at least 99%
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<1000'],
  checks: ['rate>=0.99'],
  // Deposit API (tag api:deposit is set in lib/transactions.js)
  'http_req_failed{api:deposit}': ['rate<0.01'],
  'http_req_duration{api:deposit}': ['p(95)<1000'],
  'checks{api:deposit}': ['rate>=0.99'],
  // Send Money API
  'http_req_failed{api:sendmoney}': ['rate<0.01'],
  'http_req_duration{api:sendmoney}': ['p(95)<1000'],
  'checks{api:sendmoney}': ['rate>=0.99'],
  // Payment API
  'http_req_failed{api:payment}': ['rate<0.01'],
  'http_req_duration{api:payment}': ['p(95)<1000'],
  'checks{api:payment}': ['rate>=0.99'],
};

// Report-only thresholds: always pass, they only make k6 record per-API and per-window numbers
// for lib/report.js (reports/comparison.md). Selector text comes from selector() in lib/report.js.
function addReportOnlyThresholds() {
  APIS.forEach((api) => {
    thresholds[`http_reqs{${selector(api)}}`] = ['count>=0']; // throughput per API
  });
  FLOWS.forEach((flow) => {
    const apiInWindow = selector(flow.api, `w${flow.win}`); // e.g. api:deposit,window:w2
    thresholds[`http_req_failed{${apiInWindow}}`] = ['rate>=0'];
    thresholds[`http_req_duration{${apiInWindow}}`] = ['p(95)>=0'];
    thresholds[`http_reqs{${apiInWindow}}`] = ['count>=0'];
  });
}
addReportOnlyThresholds();

// 4) k6 options: 13 scenarios + thresholds
export const options = {
  scenarios,
  thresholds,
};

// 5) Runs once before the test. Each of the 6 users logs in with their own credentials (login + OTP 0000).
// Returned tokens are passed to the default function as "data".
export function setup() {
  const tokens = {};
  Object.keys(USERS).forEach((key) => {
    const token = login(USERS[key].email, USERS[key].password);
    if (!token) fail(`Login failed for ${key} (${USERS[key].email}). Is the API running and were users seeded?`);
    tokens[key] = token;
  });
  return { tokens };
}

// 6) DEFAULT FUNCTION: the entry point every scenario runs, once per iteration.
// It finds its flow (from env FLOW), then sends one transaction as the sender, using the sender's own token.
export default function (data) {
  const flow = FLOW_BY_NAME[__ENV.FLOW];
  const sender = USERS[flow.from];
  const receiver = USERS[flow.to];
  transact(flow.api, `w${flow.win}`, data.tokens[flow.from], sender.phone_number, receiver.phone_number);
}

// 7) Runs after the test: writes reports/report.html, summary.json and comparison.md (see lib/report.js)
export function handleSummary(data) {
  return buildSummary(data);
}
