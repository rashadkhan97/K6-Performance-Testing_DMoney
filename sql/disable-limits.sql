-- Run BEFORE the load test: customer limits (10 txns/day, 5000 Tk/day) would return HTTP 400.
-- Original values: daily 5000.00 / 10 txns, monthly 50000.00 / 50 txns, both is_active = 1.
UPDATE TransactionLimits SET is_active = 0 WHERE role = 'Customer';
