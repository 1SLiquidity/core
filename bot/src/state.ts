import fs from 'fs';

export type TradeState = {
  tradeId: string; // decimal string
  pairId: string; // 0x... bytes32
  tokenIn?: string;
  tokenOut?: string;
  lastSweetSpot?: bigint;
  amountRemaining?: bigint;
  realisedAmountOut?: bigint;
  completed?: boolean;
};

export type BotState = {
  lastScannedBlock: bigint;
  pairs: Record<string, { tradeIds: string[]; trades: Record<string, TradeState> }>;
};

export class StateStore {
  constructor(private path: string) {}

  load(): BotState {
    if (!fs.existsSync(this.path)) return { lastScannedBlock: 0n, pairs: {} };
    const raw = fs.readFileSync(this.path, 'utf8');
    const parsed = JSON.parse(raw);
    const state: BotState = {
      lastScannedBlock: BigInt(parsed.lastScannedBlock || 0),
      pairs: parsed.pairs || {},
    };
    // revive bigints
    for (const pid of Object.keys(state.pairs)) {
      const P = state.pairs[pid];
      for (const tid of Object.keys(P.trades)) {
        const t = P.trades[tid];
        if (t.lastSweetSpot != null) t.lastSweetSpot = BigInt(t.lastSweetSpot);
        if (t.amountRemaining != null) t.amountRemaining = BigInt(t.amountRemaining);
        if (t.realisedAmountOut != null) t.realisedAmountOut = BigInt(t.realisedAmountOut);
      }
    }
    return state;
  }

  save(state: BotState) {
    const json = JSON.stringify(state, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
    fs.writeFileSync(this.path, json);
  }

  upsertTrade(state: BotState, t: TradeState) {
    const P = state.pairs[t.pairId] ?? { tradeIds: [], trades: {} };
    if (!P.tradeIds.includes(t.tradeId)) P.tradeIds.push(t.tradeId);
    P.trades[t.tradeId] = { ...P.trades[t.tradeId], ...t };
    state.pairs[t.pairId] = P;
  }

  markCompleted(state: BotState, pairId: string, tradeId: string) {
    const P = state.pairs[pairId];
    if (!P) return;
    if (P.trades[tradeId]) P.trades[tradeId].completed = true;
  }

  outstandingPairIds(state: BotState): string[] {
    return Object.entries(state.pairs)
      .filter(([, P]) => P.tradeIds.some((tid) => !P.trades[tid].completed))
      .map(([pid]) => pid);
  }
}
