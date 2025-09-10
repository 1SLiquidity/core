import { ethers } from 'ethers';
import type { BotState, StateStore } from './state.js';

export function attachLiveListeners(
  ws: ethers.WebSocketProvider,
  address: string,
  state: BotState,
  store: StateStore,
  confirmations: number,
) {
  const iface = new ethers.Interface([
    'event TradeCreated(uint256 indexed tradeId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountRemaining, uint256 minAmountOut, uint256 realisedAmountOut, bool isInstasettlable, uint256 instasettleBps, uint256 lastSweetSpot, bool usePriceBased)',
    'event TradeStreamExecuted(uint256 indexed tradeId, uint256 amountIn, uint256 realisedAmountOut, uint256 lastSweetSpot)',
    'event TradeCancelled(uint256 indexed tradeId, uint256 amountRemaining, uint256 realisedAmountOut)',
    'event TradeSettled(uint256 indexed tradeId, address indexed settler, uint256 totalAmountIn, uint256 totalAmountOut, uint256 totalFees)',
  ]);

  ws.on({ address }, async (log) => {
    const head = await ws.getBlockNumber();
    if (head - (log.blockNumber ?? head) < confirmations) return;

    try {
      const ev = iface.parseLog(log);
      if (!ev) return;
      if (ev.name === 'TradeCreated') {
        const tokenIn = ev.args.tokenIn as string;
        const tokenOut = ev.args.tokenOut as string;
        const pairId = ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(['address', 'address'], [tokenIn, tokenOut]),
        );
        const tradeId = ev.args.tradeId.toString();
        const amountRemaining = BigInt(ev.args.amountRemaining.toString());
        const realisedAmountOut = BigInt(ev.args.realisedAmountOut.toString());
        const lastSweetSpot = BigInt(ev.args.lastSweetSpot.toString());
        const completed = lastSweetSpot === 0n && amountRemaining === 0n;
        const P = state.pairs[pairId]?.trades[tradeId];
        // upsert
        if (!P) {
          state.pairs[pairId] ??= { tradeIds: [], trades: {} };
          if (!state.pairs[pairId].tradeIds.includes(tradeId))
            state.pairs[pairId].tradeIds.push(tradeId);
          state.pairs[pairId].trades[tradeId] = {
            tradeId,
            pairId,
            lastSweetSpot,
            amountRemaining,
            realisedAmountOut,
          };
        } else {
          Object.assign(P, { lastSweetSpot, amountRemaining, realisedAmountOut });
        }
        if (completed) state.pairs[pairId].trades[tradeId].completed = true;
        store.save(state);
      } else if (ev.name === 'TradeStreamExecuted') {
        const tradeId = ev.args.tradeId.toString();
        const lss = BigInt(ev.args.lastSweetSpot.toString());
        for (const pid of Object.keys(state.pairs)) {
          if (state.pairs[pid].trades[tradeId]) {
            state.pairs[pid].trades[tradeId].lastSweetSpot = lss;
            break;
          }
        }
        store.save(state);
      } else if (ev.name === 'TradeCancelled' || ev.name === 'TradeSettled') {
        const tradeId = ev.args.tradeId.toString();
        for (const pid of Object.keys(state.pairs)) {
          if (state.pairs[pid].trades[tradeId]) {
            state.pairs[pid].trades[tradeId].completed = true;
            break;
          }
        }
        store.save(state);
      }
    } catch {
      // ignore unrelated events
    }
  });

  (ws.websocket as WebSocket)?.addEventListener('close', () => {
    console.error('[ws] disconnected; exiting');
    process.exit(1);
  });
}
