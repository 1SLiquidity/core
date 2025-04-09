# GateDaemon.sol Contract

**MUST**

- DEXs and tokens must be listed in the `GateDaemon` contract
- there should exist a function to at a new DEX to the daemon, as well as populate it with pair routes. Use a mapping like `mapping(address => mapping(address[] => address[])) public dexTokenInTokenOut` to store the routes, and relevant parameters passed to the fucntion call in listing a new DEX
- DEXs should be able to be updated as well as removed
- DEX token routes should similarly be able to be updated and removed
- Whilst this may initially be set by the owner, eventually it may be offloaded to a DAO
- Tokens would require whitelisting and votes cast on them
