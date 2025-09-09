import { ethers } from 'ethers';
import type { BotState, StateStore } from './state.js';

const I = new ethers.Interface([
  'event TradeCreated(uint256 indexed tradeId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountRemaining, uint256 minAmountOut, uint256 realisedAmountOut, bool isInstasettlable, uint256 instasettleBps, uint256 lastSweetSpot, bool usePriceBased)',
  'event TradeStreamExecuted(uint256 indexed tradeId, uint256 amountIn, uint256 realisedAmountOut, uint256 lastSweetSpot)',
  'event TradeCancelled(uint256 indexed tradeId, uint256 amountRemaining, uint256 realisedAmountOut)',
  'event TradeSettled(uint256 indexed tradeId, address indexed settler, uint256 totalAmountIn, uint256 totalAmountOut, uint256 totalFees)',
]);

export async function coldScan(
  provider: ethers.JsonRpcProvider,
  address: string,
  fromBlock: bigint,
  state: BotState,
  store: StateStore,
  chunk: number,
) {
  const latest = await provider.getBlockNumber();
  let start = Number(state.lastScannedBlock > 0n ? state.lastScannedBlock : fromBlock);

  while (start <= latest) {
    const end = Math.min(start + chunk - 1, latest);
    const logs = await provider.getLogs({ address, fromBlock: start, toBlock: end });
    for (const log of logs) {
      let ev: ethers.LogDescription | null = null;
      try {
        ev = I.parseLog(log);
      } catch {
        continue;
      }
      if (!ev) continue;

      if (ev.name === 'TradeCreated') {
        const tradeId = ev.args.tradeId.toString();
        const tokenIn = ev.args.tokenIn as string;
        const tokenOut = ev.args.tokenOut as string;
        const pairId = ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(['address', 'address'], [tokenIn, tokenOut]),
        );
        const amountRemaining = BigInt(ev.args.amountRemaining.toString());
        const realisedAmountOut = BigInt(ev.args.realisedAmountOut.toString());
        const lastSweetSpot = BigInt(ev.args.lastSweetSpot.toString());
        const completed = lastSweetSpot === 0n && amountRemaining === 0n;
        store.upsertTrade(state, {
          tradeId,
          pairId,
          tokenIn,
          tokenOut,
          amountRemaining,
          realisedAmountOut,
          lastSweetSpot,
          completed,
        });
      }

      if (ev.name === 'TradeStreamExecuted') {
        const tradeId = ev.args.tradeId.toString();
        const lss = BigInt(ev.args.lastSweetSpot.toString());
        for (const pid of Object.keys(state.pairs)) {
          if (state.pairs[pid].trades[tradeId]) {
            state.pairs[pid].trades[tradeId].lastSweetSpot = lss;
            break;
          }
        }
      }

      if (ev.name === 'TradeCancelled' || ev.name === 'TradeSettled') {
        const tradeId = ev.args.tradeId.toString();
        for (const pid of Object.keys(state.pairs)) {
          if (state.pairs[pid].trades[tradeId]) {
            state.pairs[pid].trades[tradeId].completed = true;
            break;
          }
        }
      }
    }
    state.lastScannedBlock = BigInt(end + 1);
    store.save(state);
    start = end + 1;
  }
}
