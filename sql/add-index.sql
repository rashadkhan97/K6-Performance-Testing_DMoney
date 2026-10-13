-- Run BEFORE the "with index" test. The DMoney API runs "SELECT ... WHERE account = ? FOR UPDATE" on every transaction;
-- without an index on account it scans and locks the whole Transactions table, which causes deadlocks and slow responses.
CREATE INDEX idx_k6_transactions_account ON Transactions (account);
