# Keeper Client

Will be built out of a typescript backend, able to be run from a github action cronjob or similar.

The client:

**MUST**

- populate DEX data into the sugbraph for trade construction in the UI
- trigger recaching of DEX data into the smart contracts for use in trade executions
- utilise websockets to monitor DEX dynamics and trigger updates to the subgraoh **asynchronously**
- utilise websockets to monitor DEX dynamics and trigger calls in the smart contracts appropriately
- represent (hold encrypted keys to) an EOA's wallet
