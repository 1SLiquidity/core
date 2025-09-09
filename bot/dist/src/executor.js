import { ethers } from 'ethers';
import pLimit from 'p-limit';
import CoreABI from './abi/Core.min.json' assert { type: 'json' };
export class Executor {
    gasMultiplier;
    maxParallelTx;
    read;
    write;
    constructor(signer, address, gasMultiplier, maxParallelTx) {
        this.gasMultiplier = gasMultiplier;
        this.maxParallelTx = maxParallelTx;
        this.read = new ethers.Contract(address, CoreABI, signer.provider);
        this.write = new ethers.Contract(address, CoreABI, signer);
    }
    async executeOutstanding(state, store) {
        const limit = pLimit(this.maxParallelTx);
        const pairIds = Object.keys(state.pairs);
        await Promise.all(pairIds.map((pid) => limit(async () => {
            const P = state.pairs[pid];
            if (P.tradeIds.every((tid) => P.trades[tid].completed))
                return;
            const queue = await this.read.getPairIdTradeIds(pid);
            if (queue.length === 0) {
                // defensively mark trades completed if chain says empty
                P.tradeIds.forEach((tid) => (P.trades[tid].completed = true));
                store.save(state);
                return;
            }
            try {
                const est = await this.write.executeTrades.estimateGas(pid);
                const bump = (n) => (n * BigInt(Math.ceil(this.gasMultiplier * 100))) / 100n;
                const tx = await this.write.executeTrades(pid, { gasLimit: bump(est) });
                console.log(`[execute] ${pid} tx=${tx.hash}`);
                const rcpt = await tx.wait();
                console.log(`[execute] mined block=${rcpt?.blockNumber}`);
            }
            catch (err) {
                const msg = String(err?.message || err);
                if (/empty|no trades|already|revert/i.test(msg)) {
                    console.log(`[execute] benign revert for ${pid}: ${msg}`);
                    return;
                }
                console.error(`[execute] error ${pid}: ${msg}`);
            }
            finally {
                store.save(state);
            }
        })));
    }
}
