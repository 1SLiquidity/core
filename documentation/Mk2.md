# Mk2: Running Notes

**Bot**

Consider a Batcher contract. This should allow the ideintification from view functions, as well as conditional operations triggered by results from these functions, that allow for optimized batch processing on transaction queues.

The process would look something like this:

1. Identify volume pending in trade
2. Find a pool with enough reserves to satisfy at given slippage level
3. batch sequentially at given index depth (~ trade volume total) re-settle

It can be called directly from `batchTransactions()`, which should exist on the Executor contract to be called via a settable interface address. This has beeen noted elsewhere
