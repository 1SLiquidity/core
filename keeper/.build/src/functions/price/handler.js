"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const dex_1 = require("../../services/dex");
const dexService = new dex_1.DEXService();
const main = async (event) => {
    try {
        const tokenAddress = event.queryStringParameters?.tokenAddress;
        if (!tokenAddress) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Token address is required' })
            };
        }
        const priceData = await dexService.getPrice(tokenAddress);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(priceData)
        };
    }
    catch (error) {
        console.error('Error in price handler:', error);
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
