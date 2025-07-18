// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/console.sol";

import {IUniversalDexInterface} from "./interfaces/IUniversalDexInterface.sol";
import {Ownable} from "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IERC20Metadata} from "lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract StreamDaemon is Ownable {
    IUniversalDexInterface public universalDexInterface;
    address[] public dexs; // goes to Core.sol
    mapping(address => address) public dexToRouters; // goes to Core.sol

    event DEXRouteAdded(
        address indexed dex
    );

    event DEXRouteRemoved(
        address indexed dex
    );

    // temporarily efine a constant for minimum effective gas in dollars
    uint256 public constant MIN_EFFECTIVE_GAS_DOLLARS = 1; // i.e $1 minimum @audit this should be valuated against TOKEN-USDC value during execution in production

    constructor(address[] memory _dexs, address[] memory _routers) Ownable(msg.sender) {
        for (uint256 i = 0; i < _dexs.length; i++) {
            dexs.push(_dexs[i]);
        }
        for (uint256 i = 0; i < _routers.length; i++) {
            dexToRouters[_dexs[i]] = _routers[i];
        } // @audit make sure to pass the routers in the appropriate order wrt how the dex's are inputted on deployment
    }

    function registerDex(address _fetcher) external onlyOwner {
        dexs.push(_fetcher); // @audit this storage allocation has multiple dependancies in order to actually function, including deployments of appropriate fetchers and configuration of the relevant dex's interface
        emit DEXRouteAdded(_fetcher);
    }

    function removeDex(address _fetcher) external onlyOwner {
        for (uint256 i = 0; i < dexs.length; i++) {
            if (dexs[i] == _fetcher) {
                dexs[i] = dexs[dexs.length - 1];
                dexs.pop();
                delete dexToRouters[_fetcher];
                emit DEXRouteRemoved(_fetcher);
                break;
            }
        }
    }

    function evaluateSweetSpotAndDex(address tokenIn, address tokenOut, uint256 volume, uint256 effectiveGas)
        public
        view
        returns (uint256 sweetSpot, address bestFetcher, address router)
    {
        console.log("evaluating sweet spot and dex");
        (address identifiedFetcher, uint256 maxReserveIn, uint256 maxReserveOut) =
            findHighestReservesForTokenPair(tokenIn, tokenOut);
        bestFetcher = identifiedFetcher;
        router = dexToRouters[bestFetcher];
        console.log("bestFetcher", bestFetcher);

        // Ensure effective gas is at least the minimum
        if (effectiveGas < MIN_EFFECTIVE_GAS_DOLLARS) {
            effectiveGas = MIN_EFFECTIVE_GAS_DOLLARS;
        }

        sweetSpot = _sweetSpotAlgo(tokenIn, tokenOut, volume, maxReserveIn, maxReserveOut, effectiveGas);
    }

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
            try fetcher.getReserves(tokenIn, tokenOut) returns (uint256 reserveTokenIn, uint256 reserveTokenOut) {

                if (reserveTokenIn > maxReserveIn && reserveTokenIn > 0) {
                    maxReserveIn = reserveTokenIn;
                    maxReserveOut = reserveTokenOut;
                    bestFetcher = address(fetcher);
                }
            } catch Error(string memory reason) {
                reason;
            }
            // catch (bytes memory lowLevelData) {
            // }
        }
        require(bestFetcher != address(0), "No DEX found for token pair");
    }

    /**
     * @dev scaling requirements due to variable gas consumptions lead to requirement of alpha
     * alpha represents a scalar variable which scales the sweet spot elementaries to
     * eliminate shifts in algo output due to reserve differences
     */
    function computeAlpha(uint256 numerator, uint256 denominator) internal pure returns (uint256 alpha) {
        // alpha = reserveOut / (reserveIn^2)
        require(numerator > 0, "Invalid reserve");
        require(denominator > 0, "Invalid reserve");

        // scale by 1e24 to maintain precision in division
        return ((numerator * 1e24) / (denominator * denominator));
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
        console.log("Start |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||");
        console.log("reserveOut", reserveOut);
        console.log("effectiveGas", effectiveGas);
        console.log("volume", volume);

        uint8 decimalsIn = IERC20Metadata(tokenIn).decimals();
        console.log("decimalsIn", decimalsIn);
        uint8 decimalsOut = IERC20Metadata(tokenOut).decimals();
        console.log("decimalsOut", decimalsOut);

        // scale tokens to decimal zero
        uint256 scaledVolume = volume / (10 ** decimalsIn);
        console.log("scaledVolume", scaledVolume);
        uint256 scaledReserveIn = reserveIn / (10 ** decimalsIn);
        console.log("scaledReserveIn", scaledReserveIn);
        uint256 scaledReserveOut = reserveOut / (10 ** decimalsOut);
        console.log("scaledReserveOut", scaledReserveOut);

        uint256 alpha;

        if (scaledReserveIn >= scaledReserveOut) {
            alpha = computeAlpha(scaledReserveIn, scaledReserveOut);
        } else {
            alpha = computeAlpha(scaledReserveOut, scaledReserveIn);
        }

        console.log("alpha", alpha);

        // N = sqrt(alpha * V^2)
        uint256 numerator = alpha * scaledVolume * scaledVolume;
        console.log("numerator", numerator);
        uint256 denominator = 1e24;
        console.log("denominator", denominator);

        require(denominator > 0, "Invalid effective gas");

        sweetSpot = sqrt(numerator / denominator);
        console.log("calculated sweetSpot", sweetSpot);

        if (sweetSpot == 0) {
            sweetSpot = 4;
        } else if (sweetSpot < 4) {
            sweetSpot = 4;
        }
        if (sweetSpot > 500) {
            sweetSpot = 500;
        }
        // @audit need to add a case for volume < 0.001 pool depth whereby sweetspot = 1
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
