// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IUniversalDexInterface} from "./interfaces/IUniversalDexInterface.sol";
import {Ownable} from "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IERC20Metadata} from "lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract StreamDaemon is Ownable {
    IUniversalDexInterface public universalDexInterface;
    address[] public dexs; // goes to Core.sol

    // temporarily efine a constant for minimum effective gas in dollars
    uint256 public constant MIN_EFFECTIVE_GAS_DOLLARS = 1; // i.e $1 minimum @audit this should be valuated against TOKEN-USDC value during execution in production

    uint256 public gasConsumption;
    uint256 public lastCachedTimestamp;
    uint256 public constant CACHE_DURATION = 30 seconds;

    constructor(address _dexInterface, address[] memory _dexs) Ownable(msg.sender) {
        universalDexInterface = IUniversalDexInterface(_dexInterface);
        for (uint256 i = 0; i < _dexs.length; i++) {
            dexs.push(_dexs[i]);
        }
    }

    function _updateGasStats(uint256 startGas, uint256 endGas) internal {
        uint256 currentGasUsed = startGas - endGas;
        if (gasConsumption == 0) {
            gasConsumption = currentGasUsed;
        } else {
            gasConsumption = (gasConsumption + currentGasUsed) / 2; // TODO needs proper implementation as TWAP algo
        }
        lastCachedTimestamp = block.timestamp;
    }

    function readGasCache() internal view returns (uint256) {
        return gasConsumption * tx.gasprice;
    }

    function registerDex(address _fetcher) external onlyOwner {
        dexs.push(_fetcher);
    }

    function evaluateSweetSpotAndDex(address tokenIn, address tokenOut, uint256 volume, uint256 effectiveGas)
        public
        view
        returns (uint256 sweetSpot, address bestFetcher)
    {
        (address identifiedFetcher, uint256 maxReserveIn, uint256 maxReserveOut) =
            findHighestReservesForTokenPair(tokenIn, tokenOut);
        bestFetcher = identifiedFetcher;

        // Ensure effective gas is at least the minimum
        if (effectiveGas < MIN_EFFECTIVE_GAS_DOLLARS) {
            effectiveGas = MIN_EFFECTIVE_GAS_DOLLARS;
        }

        sweetSpot = _sweetSpotAlgo(tokenIn, tokenOut, volume, maxReserveIn, maxReserveOut, effectiveGas);
    }

    // function returnReserveForTokenPairFromDex(address tokenIn, address tokenOut)
    //     public
    //     view
    //     returns (uint256 reserve)
    // {}

    /**
     * @dev always written in terms of
     *  **the token that is being added to the pool** (tokenIn)
     */
    function findHighestReservesForTokenPair(address tokenIn, address tokenOut)
        public
        view
        returns (address bestFetcher, uint256 maxReserveIn, uint256 maxReserveOut)
    {
        for (uint256 i = 0; i < dexs.length; i++) {
            IUniversalDexInterface fetcher = IUniversalDexInterface(dexs[i]);
            (uint256 reserveTokenIn, uint256 reserveTokenOut) = fetcher.getReserves(tokenIn, tokenOut);

            if (reserveTokenIn > maxReserveIn && reserveTokenIn > 0) {
                maxReserveIn = reserveTokenIn;
                maxReserveOut = reserveTokenOut;        
                bestFetcher = address(fetcher);
            }
        }
    }

    /**
     * @dev scaling requirements due to variable gas consumptions lead to requirement of alpha
     * alpha represents a scalar variable which scales the sweet spot elementaries to
     * eliminate shifts in algo output due to reserve differences
     */
    function computeAlpha(uint256 reserveIn, uint256 reserveOut) public pure returns (uint256) {
        // alpha = reserveOut / (reserveIn^2)
        require(reserveIn > 0, "Invalid reserve");
        require(reserveOut > 0, "Invalid reserve");
        return reserveOut * 1e18 / (reserveIn * reserveIn);
    }

    function _sweetSpotAlgo(
        address tokenIn,
        address tokenOut,
        uint256 volume,
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 effectiveGas
    ) public view returns (uint256 sweetSpot) {
        // ensure no division by 0
        if (reserveIn == 0 || reserveOut == 0 || effectiveGas == 0) {
            revert("No reserves or appropriate gas estimation"); // **revert** if no reserves
        }

        // @audit effectiveGas is in dollars, not gas, and an appropriate gas algo should be used on execution

        // if (effectiveGas < 1e17 || effectiveGas <= 1e18) {
        //     revert("Effective gas inappropriate");
        // }

        /**
         *
         * limits
         * N >= 2 (so, if the algo returns a value < 1, default to stream count = 2)
         * @audit if the 'lastStreamCount' of a trade = 2, ergo the last execution was the penultimate stream,
         * this algo shouldn't be called (otherwise we would infinitely divide the remaining stream by 2 per stream esxecution)
         *
         * if N > 500 (values of n > 500 show significant trade volume vs the pool reserves. these trades should be flagged and warnings provided)
         * GENERAL EQUATION the equation is built from the premise of quadratic slippage. this yields a best guess approximation, as otherwise
         * we would require an iterative method, likely a finite series, to identify these points, which may result in something very gas heavy.
         *
         * for now, at this stage, the algorithm works in splitting trades for the effect of optimising trade efficiency on a block - by - block basis
         */
        uint8 decimalsIn = IERC20Metadata(tokenIn).decimals();
        uint8 decimalsOut = IERC20Metadata(tokenOut).decimals();

        // csale alll to 18 decimals
        uint256 scaledVolume = volume;
        uint256 scaledReserveIn = reserveIn;
        uint256 scaledReserveOut = reserveOut;

        if (decimalsIn != 18) {
            if (decimalsIn > 18) {
                scaledVolume = volume / (10 ** (decimalsIn - 18));
                scaledReserveIn = reserveIn / (10 ** (decimalsIn - 18));
            } else {
                scaledVolume = volume * (10 ** (18 - decimalsIn));
                scaledReserveIn = reserveIn * (10 ** (18 - decimalsIn));
            }
        }

        if (decimalsOut != 18) {
            if (decimalsOut > 18) {
                scaledReserveOut = reserveOut / (10 ** (decimalsOut - 18));
            } else {
                scaledReserveOut = reserveOut * (10 ** (18 - decimalsOut));
            }
        }

        uint256 alpha = computeAlpha(scaledReserveIn, scaledReserveOut);

        sweetSpot = volume / (sqrt((alpha * volume ^ 2) / effectiveGas));

        if (sweetSpot < 2) {
            sweetSpot = 2;
        }

        if (sweetSpot > 500) {
            sweetSpot = 500;
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

    /**
     * DEPRECATED
     */
    // function _sweetSpotAlgoOld(
    //     address tokenIn,
    //     address tokenOut,
    //     uint256 volume,
    //     uint256 reserves,
    //     uint256 effectiveGas
    // ) public view returns (uint256 sweetSpot) {
    //     if (reserves == 0 || effectiveGas == 0) {
    //         revert("No reserves or appropriate gas estimation"); // **revert** if no reserves
    //     }

    //     uint8 decimalsIn = IERC20Metadata(tokenIn).decimals();
    //     uint256 scaledVolume = volume / (10 ** decimalsIn);
    //     uint256 scaledReserves = reserves / (10 ** decimalsIn);

    //     // Original equation: volume / (sqrt(reserves * effectiveGas))
    //     sweetSpot = scaledVolume / (sqrt(scaledReserves * effectiveGas));

    //     // Ensure minimum of 2 splits
    //     if (sweetSpot < 2) {
    //         sweetSpot = 2;
    //     }
    // }
}
