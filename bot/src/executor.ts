import { ethers } from 'ethers';
import pLimit from 'p-limit';
import type { BotState, StateStore } from './state.js';
import CoreABI from './abi/Core.min.json';

export class Executor {
  private read: ethers.Contract;
  private write: ethers.Contract;
  constructor(
    signer: ethers.Signer,
    address: string,
    private gasMultiplier: number,
    private maxParallelTx: number,
  ) {
    this.read = new ethers.Contract(address, CoreABI, signer.provider!);
    this.write = new ethers.Contract(address, CoreABI, signer);
  }

  async executeOutstanding(state: BotState, store: StateStore) {
    const limit = pLimit(this.maxParallelTx);
    const pairIds = Object.keys(state.pairs);

    await Promise.all(
      pairIds.map((pid) =>
        limit(async () => {
          const P = state.pairs[pid];
          if (P.tradeIds.every((tid) => P.trades[tid].completed)) return;

          const queue: bigint[] = await this.read.getPairIdTradeIds(pid);
          if (queue.length === 0) {
            // defensively mark trades completed if chain says empty
            P.tradeIds.forEach((tid) => (P.trades[tid].completed = true));
            store.save(state);
            return;
          }

          try {
            const est = await this.write.executeTrades.estimateGas(pid);
            const bump = (n: bigint) => (n * BigInt(Math.ceil(this.gasMultiplier * 100))) / 100n;
            const tx = await this.write.executeTrades(pid, { gasLimit: bump(est) });
            console.log(`[execute] ${pid} tx=${tx.hash}`);
            const rcpt = await tx.wait();
            console.log(`[execute] mined block=${rcpt?.blockNumber}`);
          } catch (err: any) {
            const msg = String(err?.message || err);
            if (/empty|no trades|already|revert/i.test(msg)) {
              console.log(`[execute] benign revert for ${pid}: ${msg}`);
              return;
            }
            console.error(`[execute] error ${pid}: ${msg}`);
          } finally {
            store.save(state);
          }
        }),
      ),
    );
  }
}
