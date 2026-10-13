-- Removes the index created by add-index.sql (puts the Transactions table back to its original indexes).
DROP INDEX idx_k6_transactions_account ON Transactions;
