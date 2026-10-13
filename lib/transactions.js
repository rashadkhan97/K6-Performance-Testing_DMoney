import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, AMOUNT } from '../config/settings.js';
import { headers } from './auth.js';

const PATHS = { deposit: '/transaction/deposit', sendmoney: '/transaction/sendmoney', payment: '/transaction/payment' };
const MESSAGES = { deposit: 'Deposit successful', sendmoney: 'Send money successful', payment: 'Payment successful' };

// Only HTTP 201 is a success; 208 (insufficient balance), 400 (limits), 403 etc. count as failed requests
const only201 = http.expectedStatuses(201);

function parseBody(res) {
  try {
    return res.json();
  } catch (e) {
    return null; // body was not JSON
  }
}

// One transaction + its 4 checks. Called by the default function in scripts/dmoney-load-test.js (api = deposit | sendmoney | payment)
export function transact(api, windowName, token, fromPhone, toPhone, amount = AMOUNT) {
  const tags = { api, window: windowName }; // used by the per-API / per-window thresholds
  const res = http.post(
    `${BASE_URL}${PATHS[api]}`,
    JSON.stringify({ from_account: fromPhone, to_account: toPhone, amount }),
    { headers: headers(token), tags, responseCallback: only201 }
  );

  const body = parseBody(res);
  check(
    res,
    {
      [`${api}: status is 201`]: (r) => r.status === 201,
      [`${api}: request successful (message says successful)`]: () => body !== null && /successful/i.test(body.message || ''),
      [`${api}: transaction id returned`]: () => !!(body && body.trnxId),
      [`${api}: success message "${MESSAGES[api]}"`]: () => !!(body && body.message === MESSAGES[api]),
    },
    tags
  );
  return res;
}
