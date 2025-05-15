// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/// elts use console.log to debug
import "forge-std/console.sol";

import {IUniversalDexInterface} from "./interfaces/IUniversalDexInterface.sol";
import {Ownable} from "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IERC20Metadata} from "lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract StreamDaemon is Ownable {
    IUniversalDexInterface public universalDexInterface;
    address[] public dexs; // goes to Core.sol

    // temporarily efine a constant for minimum effective gas in dollars
    uint256 public constant MIN_EFFECTIVE_GAS_DOLLARS = 1; // i.e $1 minimum @audit this should be valuated against TOKEN-USDC value during execution in production

    // uint256 public gasConsumption;
    // uint256 public lastCachedTimestamp;
    // uint256 public constant CACHE_DURATION = 30 seconds;

    constructor(address _dexInterface, address[] memory _dexs) Ownable(msg.sender) {
        universalDexInterface = IUniversalDexInterface(_dexInterface);
        for (uint256 i = 0; i < _dexs.length; i++) {
            dexs.push(_dexs[i]);
        }
    }

    // function _updateGasStats(uint256 startGas, uint256 endGas) internal {
    //     uint256 currentGasUsed = startGas - endGas;
    //     if (gasConsumption == 0) {
    //         gasConsumption = currentGasUsed;
    //     } else {
    //         gasConsumption = (gasConsumption + currentGasUsed) / 2; // TODO needs proper implementation as TWAP algo
    //     }
    //     lastCachedTimestamp = block.timestamp;
    // }

    // function readGasCache() internal view returns (uint256) {
    //     return gasConsumption * tx.gasprice;
    // }

    function registerDex(address _fetcher) external onlyOwner {
        dexs.push(_fetcher);
    }

    function evaluateSweetSpotAndDex(address tokenIn, address tokenOut, uint256 volume, uint256 effectiveGas)
        public
        returns (uint256 sweetSpot, address bestFetcher)
    {
        (address identifiedFetcher, uint256 maxReserveIn, uint256 maxReserveOut) =
            findHighestReservesForTokenPair(tokenIn, tokenOut);
        bestFetcher = identifiedFetcher;
        console.log("bestFetcher", bestFetcher);

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
    function computeAlpha(uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256 alpha) {
        // alpha = reserveOut / (reserveIn^2)
        require(reserveIn > 0, "Invalid reserve");
        require(reserveOut > 0, "Invalid reserve");
        
        // Scale up by 1e18 to maintain precision in division
        return ((reserveOut * 1e24) / (reserveIn * reserveIn));
    }

    function _yetAnotherAlgo (address tokenIn,
        address tokenOut,
        uint256 volume,
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 effectiveGas) public returns (uint256 sweetSpot) {

            uint8 decimalsIn = IERC20Metadata(tokenIn).decimals();

            if (decimalsIn != 18) {
                if (decimalsIn > 18) {
                    volume = volume / (10 ** (decimalsIn - 18));
                    reserveIn = reserveIn / (10 ** (decimalsIn - 18));
                } else {
                    volume = volume * (10 ** (18 - decimalsIn));
                    reserveIn = reserveIn * (10 ** (18 - decimalsIn));
                }
            }

            //now change to human readable format

            volume = volume / 1e18;
            reserveIn = reserveIn / 1e18;

            sweetSpot = volume / sqrt(reserveIn);
            console.log("sweetSpot", sweetSpot);

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
        console.log("Start |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||\n                        ||||||||");

        console.log("reserveIn", reserveIn);
        console.log("reserveOut", reserveOut);
        console.log("effectiveGas", effectiveGas);
        console.log("volume", volume);

        uint8 decimalsIn = IERC20Metadata(tokenIn).decimals();
        uint8 decimalsOut = IERC20Metadata(tokenOut).decimals();

        // Scale all to 18 decimals
        uint256 scaledVolume = volume;
        console.log("scaledVolume", scaledVolume);
        uint256 scaledReserveIn = reserveIn;
        console.log("scaledReserveIn", scaledReserveIn);
        uint256 scaledReserveOut = reserveOut;
        console.log("scaledReserveOut", scaledReserveOut);

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

        console.log("scaledVolume", scaledVolume);
        console.log("scaledReserveIn", scaledReserveIn);
        console.log("scaledReserveOut", scaledReserveOut);

        uint256 alpha = computeAlpha(scaledReserveIn, scaledReserveOut);
        console.log("alpha", alpha);
        
        // Calculate sweet spot with proper scaling
        // N = sqrt(a*V^2/g)
        uint256 numerator = alpha * scaledVolume * scaledVolume;
        console.log("numerator", numerator);
        uint256 denominator = effectiveGas * 1e24;
        console.log("denominator", denominator);
        
        // Ensure we don't divide by zero
        require(denominator > 0, "Invalid effective gas");
        
        // Scale up numerator to maintain precision
        numerator = numerator * 1e18;        // Calculate sqrt of (numerator/denominator)
        sweetSpot = sqrt(numerator / denominator);
        console.log("calculated sweetSpot", sweetSpot);
        require(sweetSpot > 0, "Invalid sqrt calculation");
        sweetSpot = sweetSpot / 1e17;

        // Ensure minimum of 2 splits and maximum of 500
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
