"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const dex_1 = require("../../services/dex");
const dexService = new dex_1.DEXService();
function validateTokenAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}
function parseRequestBody(event) {
    if (!event.body)
        return null;
    try {
        return JSON.parse(event.body);
    }
    catch (error) {
        return null;
    }
}
const main = async (event) => {
    try {
        let tokenA;
        let tokenB;
        // Handle both GET and POST requests
        if (event.httpMethod === 'GET') {
            tokenA = event.queryStringParameters?.tokenA;
            tokenB = event.queryStringParameters?.tokenB;
        }
        else if (event.httpMethod === 'POST') {
            const body = parseRequestBody(event);
            if (!body) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Invalid request body' })
                };
            }
            tokenA = body.tokenA;
            tokenB = body.tokenB;
        }
        if (!tokenA || !tokenB) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Both tokenA and tokenB addresses are required' })
            };
        }
        if (!validateTokenAddress(tokenA) || !validateTokenAddress(tokenB)) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Invalid token address format' })
            };
        }
        const reservesData = await dexService.getReserves(tokenA, tokenB);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(reservesData)
        };
    }
    catch (error) {
        console.error('Error in reserves handler:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
exports.main = main;
