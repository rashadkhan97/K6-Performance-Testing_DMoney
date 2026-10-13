# API comparison

## Per API (whole test)

| Scope | Requests | Req/s | Avg ms | p95 ms | Max ms | Failed |
|---|---|---|---|---|---|---|
| deposit | 272 | 2.26 | 68.1 | 137.0 | 499.1 | 0.00% |
| sendmoney | 272 | 2.26 | 50.8 | 104.8 | 338.4 | 0.00% |
| payment | 636 | 5.29 | 59.4 | 108.9 | 519.5 | 0.00% |

## Per API per window

| Scope | Requests | Req/s | Avg ms | p95 ms | Max ms | Failed |
|---|---|---|---|---|---|---|
| deposit w2 | 91 | 3.03 | 35.4 | 72.5 | 99.4 | 0.00% |
| deposit w3 | 181 | 6.03 | 84.5 | 156.9 | 499.1 | 0.00% |
| sendmoney w1 | 91 | 3.03 | 39.0 | 70.0 | 113.6 | 0.00% |
| sendmoney w2 | 90 | 3.00 | 34.9 | 58.2 | 101.5 | 0.00% |
| sendmoney w3 | 91 | 3.03 | 78.2 | 132.1 | 338.4 | 0.00% |
| payment w1 | 91 | 3.03 | 39.9 | 67.3 | 94.9 | 0.00% |
| payment w2 | 91 | 3.03 | 35.1 | 67.0 | 99.0 | 0.00% |
| payment w3 | 91 | 3.03 | 87.1 | 153.6 | 519.5 | 0.00% |
| payment w4 | 363 | 12.10 | 63.4 | 109.0 | 179.4 | 0.00% |

## p95 degradation (first window -> last window the API ran in)

- deposit: p95 72.5 ms (w2) -> 156.9 ms (w3), +116.4%
- sendmoney: p95 70.0 ms (w1) -> 132.1 ms (w3), +88.5%
- payment: p95 67.3 ms (w1) -> 109.0 ms (w4), +62.0%
