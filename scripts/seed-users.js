import http from 'k6/http';
import { check, fail } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { BASE_URL, ADMIN, SYSTEM, USERS, AGENT_FUNDING, CUSTOMER_FUNDING } from '../config/settings.js';
import { login, headers } from '../lib/auth.js';

// One-off setup run: 1 VU, 1 iteration. Safe to re-run (skips existing users, only tops up balances).
export const options = {
  vus: 1,
  iterations: 1,
  thresholds: { checks: ['rate==1'] }, // every seed step must succeed
};

// Create the user if missing, then make sure status is active (new users start as "pending")
function ensureActiveUser(adminToken, u) {
  const found = http.get(`${BASE_URL}/user/search/phonenumber/${u.phone_number}`, { headers: headers(adminToken) });
  let user = found.status === 200 ? found.json('user') : null;

  if (!user) {
    const created = http.post(
      `${BASE_URL}/user/create`,
      JSON.stringify({ name: u.name, email: u.email, password: u.password, phone_number: u.phone_number, nid: u.nid, role: u.role }),
      { headers: headers(adminToken) }
    );
    check(created, { [`create ${u.phone_number}`]: (r) => r.status === 201 });
    user = created.json('user');
  }

  if (user.status !== 'active') {
    const updated = http.patch(`${BASE_URL}/user/update/${user.id}`, JSON.stringify({ status: 'active' }), { headers: headers(adminToken) });
    check(updated, { [`activate ${u.phone_number}`]: (r) => r.status === 200 });
  }
}

// Deposit only the missing amount so re-runs do not over-fund
function topUp(token, fromPhone, toPhone, target) {
  const balRes = http.get(`${BASE_URL}/transaction/balance/${toPhone}`, { headers: headers(token) });
  check(balRes, { [`balance ${toPhone}`]: (r) => r.status === 200 });
  const need = target - balRes.json('balance');
  if (need < 10) return; // API minimum deposit is 10 Tk

  const res = http.post(
    `${BASE_URL}/transaction/deposit`,
    JSON.stringify({ from_account: fromPhone, to_account: toPhone, amount: need }),
    { headers: headers(token) }
  );
  check(res, { [`fund ${toPhone} with ${need}`]: (r) => r.status === 201 });
}

export default function () {
  const adminToken = login(ADMIN.email, ADMIN.password);
  const systemToken = login(SYSTEM.email, SYSTEM.password);
  if (!adminToken || !systemToken) fail('Admin or SYSTEM login failed - is the API running on ' + BASE_URL + '?');

  // 1. Admin creates + activates the 6 users
  Object.values(USERS).forEach((u) => ensureActiveUser(adminToken, u));

  // 2. SYSTEM funds both agents
  ['agent1', 'agent2'].forEach((k) => topUp(systemToken, SYSTEM.phone_number, USERS[k].phone_number, AGENT_FUNDING));

  // 3. Agent 1 funds both customers (agents may only deposit to customers)
  const agent1Token = login(USERS.agent1.email, USERS.agent1.password);
  if (!agent1Token) fail('Agent 1 login failed');
  ['customer1', 'customer2'].forEach((k) => topUp(agent1Token, USERS.agent1.phone_number, USERS[k].phone_number, CUSTOMER_FUNDING));
}

// Save the credentials so the user can read them (data/users.json + data/users.md)
export function handleSummary(data) {
  const list = Object.entries(USERS).map(([key, u]) => ({ key, ...u }));
  const rows = list.map((u) => `| ${u.key} | ${u.role} | ${u.name} | ${u.email} | ${u.phone_number} | ${u.password} |`);
  const md = ['# DMoney k6 test users', '', '| Key | Role | Name | Email | Phone | Password |', '|---|---|---|---|---|---|', ...rows, ''].join('\n');
  return {
    'data/users.json': JSON.stringify(list, null, 2),
    'data/users.md': md,
    stdout: textSummary(data, { indent: ' ', enableColors: false }),
  };
}
