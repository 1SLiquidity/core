// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IUniversalDexInterface} from "./interfaces/IUniversalDexInterface.sol";
import {Ownable} from "lib/openzeppelin-contracts/contracts/access/Ownable.sol";

contract StreamDaemon is Ownable {
    
    IUniversalDexInterface public universalDexInterface;
    address[] public dexs; // goes to Core.sol

    constructor(address _reserveFetcherContract, address[] memory _dexs) Ownable(msg.sender) {
        universalDexInterface = IUniversalDexInterface(_reserveFetcherContract);
        for (uint256 i = 0; i < _dexs.length; i++) {
            dexs.push(_dexs[i]);
        }
    }

    function registerDex(address _fetcher) external onlyOwner {
        dexs.push(_fetcher);
    }

    function evaluateSweetSpotAndDex(address tokenId, address tokenOut, uint256 volume, uint256 effectiveGas) public view returns (uint256 sweetSpot, address bestFetcher) {
        (address identifiedFetcher, uint256 maxReserve) = findHighestReservesForTokenPair(tokenId, tokenOut);
        bestFetcher = identifiedFetcher;
        sweetSpot = _sweetSpotAlgo(volume, maxReserve, effectiveGas);
    }

    /**
     * @dev always written in terms of 
     *  **the token that is being added to the pool** (tokenIn)
     */

    function findHighestReservesForTokenPair(
        address tokenIn,
        address tokenOut
    ) public view returns (address bestFetcher, uint256 maxReserve) {

        for (uint256 i = 0; i < dexs.length; i++) {
            IUniversalDexInterface fetcher = IUniversalDexInterface(dexs[i]);
            (uint256 reserve,) = fetcher.getReserves(tokenIn, tokenOut);

            if (reserve > maxReserve && reserve > 0) {
                maxReserve = reserve;
                bestFetcher = address(fetcher);
            }
        }
    }

    function _sweetSpotAlgo(uint256 volume, uint256 reserves, uint256 effectiveGas) public pure returns (uint256 sweetSpot) {
        sweetSpot = volume / (sqrt(reserves * effectiveGas));
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
