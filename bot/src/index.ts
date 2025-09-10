import { ethers } from 'ethers';
import { CONFIG } from './config.js';
import { StateStore } from './state.js';
import { coldScan } from './scanner.js';
import { Executor } from './executor.js';

async function main() {
  const args = process.argv.slice(2);
  const modeFlagIndex = args.indexOf('--mode');
  const mode = modeFlagIndex >= 0 ? args[modeFlagIndex + 1] : CONFIG.wsUrl ? 'ws' : 'once';

  const http = new ethers.JsonRpcProvider(CONFIG.rpcHttpUrl, CONFIG.chainId);
  const wallet = new ethers.Wallet(CONFIG.privateKey, http);

  // sanity check: contract code exists
  const code = await http.getCode(CONFIG.contractAddress);
  if (code === '0x') throw new Error('No contract code at CONTRACT_ADDRESS');

  const store = new StateStore(CONFIG.stateFile);
  const state = store.load();
  if (state.lastScannedBlock === 0n) state.lastScannedBlock = CONFIG.deploymentBlock;

  console.log(`[init] cold scan from ${state.lastScannedBlock}…`);
  await coldScan(
    http,
    CONFIG.contractAddress,
    CONFIG.deploymentBlock,
    state,
    store,
    CONFIG.logChunk,
  );

  const executor = new Executor(
    wallet,
    CONFIG.contractAddress,
    CONFIG.gasMultiplier,
    CONFIG.maxParallelTx,
  );

  if (mode === 'once') {
    console.log('[mode] once (cron-friendly)');
    await executor.executeOutstanding(state, store);
    return;
  }

  if (mode === 'ws') {
    console.log('[mode] ws (live)');
    if (!CONFIG.wsUrl) throw new Error('WS_URL required for ws mode');
    const ws = new ethers.WebSocketProvider(CONFIG.wsUrl, CONFIG.chainId);
    const { attachLiveListeners } = await import('./live.js');
    attachLiveListeners(ws, CONFIG.contractAddress, state, store, CONFIG.confirmations);
    setInterval(
      () => executor.executeOutstanding(state, store).catch((err) => console.error('[tick]', err)),
      10_000,
    );
    return;
  }

  throw new Error(`Unknown --mode ${mode}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
