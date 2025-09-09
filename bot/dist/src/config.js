import 'dotenv/config';
const must = (k) => {
    const v = process.env[k];
    if (!v)
        throw new Error(`Missing env ${k}`);
    return v;
};
export const CONFIG = {
    rpcHttpUrl: must('RPC_HTTP_URL'),
    wsUrl: process.env.WS_URL || '',
    contractAddress: must('CONTRACT_ADDRESS'),
    deploymentBlock: BigInt(must('DEPLOYMENT_BLOCK')),
    privateKey: must('PRIVATE_KEY'),
    chainId: Number(must('CHAIN_ID')),
    logChunk: Number(process.env.LOG_CHUNK || 2000),
    stateFile: process.env.STATE_FILE || './state.json',
    maxParallelTx: Number(process.env.MAX_PARALLEL_TX || 3),
    gasMultiplier: Number(process.env.GAS_MULTIPLIER || 1.0),
    confirmations: Number(process.env.CONFIRMATIONS || 2),
};
