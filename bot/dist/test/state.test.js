import { describe, it, expect } from 'vitest';
import { StateStore } from '../src/state.js';
import fs from 'fs';
describe('StateStore', () => {
    const path = 'tmp-state.json';
    it('saves and loads with bigint revival', () => {
        const store = new StateStore(path);
        const state = {
            lastScannedBlock: 123n,
            pairs: {
                '0xabc': {
                    tradeIds: ['1'],
                    trades: {
                        '1': {
                            tradeId: '1',
                            pairId: '0xabc',
                            lastSweetSpot: 5n,
                            amountRemaining: 42n,
                            realisedAmountOut: 7n,
                        },
                    },
                },
            },
        };
        store.save(state);
        const loaded = store.load();
        expect(loaded.lastScannedBlock).toBe(123n);
        expect(loaded.pairs['0xabc'].trades['1'].amountRemaining).toBe(42n);
        fs.unlinkSync(path);
    });
    it('upserts trades and computes outstanding pairs', () => {
        const store = new StateStore(path);
        let state = store.load();
        store.upsertTrade(state, { tradeId: '2', pairId: '0xpid', amountRemaining: 1n });
        expect(state.pairs['0xpid'].tradeIds).toContain('2');
        expect(store.outstandingPairIds(state)).toEqual(['0xpid']);
        store.markCompleted(state, '0xpid', '2');
        expect(store.outstandingPairIds(state)).toEqual([]);
    });
});
