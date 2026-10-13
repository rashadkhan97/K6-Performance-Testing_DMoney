-- Run AFTER the load test: puts the customer limits back to their original state.
UPDATE TransactionLimits SET is_active = 1 WHERE role = 'Customer';
