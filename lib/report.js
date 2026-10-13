import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { WINDOW_SECONDS } from '../config/settings.js';

export const APIS = ['deposit', 'sendmoney', 'payment'];
export const WINDOWS = ['w1', 'w2', 'w3', 'w4'];

// Tag selector text. Must be identical in thresholds (dmoney-load-test.js) and in the lookup below
export function selector(api, win) {
  return win ? `api:${api},window:${win}` : `api:${api}`;
}

// k6 summary data: metric stats live in .values (older shape) or directly on the metric
function stats(data, metric, sel) {
  const m = data.metrics[`${metric}{${sel}}`];
  return m ? m.values || m : null;
}

const num = (n, d = 1) => (typeof n === 'number' ? n.toFixed(d) : '-');

// seconds = how long the API was active; per-window rows pass WINDOW_SECONDS so req/s is not diluted by the whole test length
function row(label, data, sel, seconds) {
  const dur = stats(data, 'http_req_duration', sel);
  const reqs = stats(data, 'http_reqs', sel);
  const failed = stats(data, 'http_req_failed', sel);
  if (!dur || !reqs) return null;
  const failPct = failed && typeof failed.rate === 'number' ? failed.rate * 100 : 0;
  const perSec = seconds ? reqs.count / seconds : reqs.rate;
  return `| ${label} | ${reqs.count} | ${num(perSec, 2)} | ${num(dur.avg)} | ${num(dur['p(95)'])} | ${num(dur.max)} | ${num(failPct, 2)}% |`;
}

// Markdown tables: whole-test per API, then per API per window, then p95 degradation per API
function comparisonMarkdown(data) {
  const head = ['| Scope | Requests | Req/s | Avg ms | p95 ms | Max ms | Failed |', '|---|---|---|---|---|---|---|'];
  const lines = ['# API comparison', '', '## Per API (whole test)', '', ...head];
  APIS.forEach((api) => {
    const r = row(api, data, selector(api));
    if (r) lines.push(r);
  });

  lines.push('', '## Per API per window', '', ...head);
  const degradation = [];
  APIS.forEach((api) => {
    const p95s = [];
    WINDOWS.forEach((w) => {
      const r = row(`${api} ${w}`, data, selector(api, w), WINDOW_SECONDS);
      if (r) {
        lines.push(r);
        p95s.push({ w, p95: stats(data, 'http_req_duration', selector(api, w))['p(95)'] });
      }
    });
    if (p95s.length > 1) {
      const first = p95s[0];
      const last = p95s[p95s.length - 1];
      const change = ((last.p95 - first.p95) / first.p95) * 100;
      degradation.push(`- ${api}: p95 ${num(first.p95)} ms (${first.w}) -> ${num(last.p95)} ms (${last.w}), ${change >= 0 ? '+' : ''}${num(change)}%`);
    }
  });

  lines.push('', '## p95 degradation (first window -> last window the API ran in)', '', ...degradation, '');
  return lines.join('\n');
}

// Used by handleSummary() in scripts/dmoney-load-test.js
// Files go to REPORT_DIR (default "reports"). The folder must already exist: k6 does not create folders.
export function buildSummary(data) {
  const dir = __ENV.REPORT_DIR || 'reports';
  return {
    [`${dir}/report.html`]: htmlReport(data),
    [`${dir}/summary.json`]: JSON.stringify(data, null, 2),
    [`${dir}/comparison.md`]: comparisonMarkdown(data),
    stdout: textSummary(data, { indent: ' ', enableColors: false }),
  };
}
