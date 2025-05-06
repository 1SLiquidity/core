// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IUniversalDexInterface} from "./interfaces/IUniversalDexInterface.sol";
import {Ownable} from "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IERC20Metadata} from "lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract StreamDaemon is Ownable {
    IUniversalDexInterface public universalDexInterface;
    address[] public dexs; // goes to Core.sol

    // Define a constant for minimum effective gas in dollars
    uint256 public constant MIN_EFFECTIVE_GAS_DOLLARS = 1; // $1 minimum

    constructor(address _reserveFetcherContract, address[] memory _dexs) Ownable(msg.sender) {
        universalDexInterface = IUniversalDexInterface(_reserveFetcherContract);
        for (uint256 i = 0; i < _dexs.length; i++) {
            dexs.push(_dexs[i]);
        }
    }

    function registerDex(address _fetcher) external onlyOwner {
        dexs.push(_fetcher);
    }

    function evaluateSweetSpotAndDex(address tokenIn, address tokenOut, uint256 volume, uint256 effectiveGas)
        public
        view
        returns (uint256 sweetSpot, address bestFetcher)
    {
        (address identifiedFetcher, uint256 maxReserve) = findHighestReservesForTokenPair(tokenIn, tokenOut);
        bestFetcher = identifiedFetcher;

        // Ensure effective gas is at least the minimum
        if (effectiveGas < MIN_EFFECTIVE_GAS_DOLLARS) {
            effectiveGas = MIN_EFFECTIVE_GAS_DOLLARS;
        }

        sweetSpot = _sweetSpotAlgo(tokenIn, tokenOut, volume, maxReserve, effectiveGas);
    }

    function returnReserveForTokenPairFromDex(address tokenIn, address tokenOut)
        public
        view
        returns (uint256 reserve)
    {}

    /**
     * @dev always written in terms of
     *  **the token that is being added to the pool** (tokenIn)
     */
    function findHighestReservesForTokenPair(address tokenIn, address tokenOut)
        public
        view
        returns (address bestFetcher, uint256 maxReserve)
    {
        for (uint256 i = 0; i < dexs.length; i++) {
            IUniversalDexInterface fetcher = IUniversalDexInterface(dexs[i]);
            (uint256 reserveTokenIn,) = fetcher.getReserves(tokenIn, tokenOut);

            if (reserveTokenIn > maxReserve && reserveTokenIn > 0) {
                maxReserve = reserveTokenIn;
                bestFetcher = address(fetcher);
            }
        }
    }

    function _sweetSpotAlgo(address tokenIn, address tokenOut, uint256 volume, uint256 reserves, uint256 effectiveGas)
        public
        view
        returns (uint256 sweetSpot)
    {
        // Ensure we don't divide by zero / run the trade on impossible params
        if (reserves == 0 || effectiveGas == 0) {
            revert("No reserves or appropriate gas estimation"); // **revert** if no reserves
        }

        uint8 decimalsIn = IERC20Metadata(tokenIn).decimals();
        
        // Scale down to human-readable numbers (e.g., 33333333333333333333 -> 33)
        uint256 scaledVolume = volume / (10 ** decimalsIn);
        uint256 scaledReserves = reserves / (10 ** decimalsIn);

        // Original equation: volume / (sqrt(reserves * effectiveGas))
        sweetSpot = scaledVolume / (sqrt(scaledReserves * effectiveGas));

        // Ensure minimum of 2 splits
        if (sweetSpot < 2) {
            sweetSpot = 2;
        }
    }

    // babylonian
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
