// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {StreamDaemon} from "../src/StreamDaemon.sol";
import {IUniversalDexInterface} from "../src/interfaces/IUniversalDexInterface.sol";

// Mock DEX interface for testing
contract MockUniversalDexInterface is IUniversalDexInterface {
    mapping(address => mapping(address => uint256)) public mockReserves;

    // Set mock reserve for a token pair
    function setReserve(address tokenA, address tokenB, uint256 reserveA, uint256 reserveB) external {
        mockReserves[tokenA][tokenB] = reserveA;
        mockReserves[tokenB][tokenA] = reserveB;
    }

    function getReserves(address tokenA, address tokenB) external view returns (uint256 reserveA, uint256 reserveB) {
        return (mockReserves[tokenA][tokenB], mockReserves[tokenB][tokenA]);
    }
}

contract StreamDaemonTest is Test {
    StreamDaemon public streamDaemon;
    MockUniversalDexInterface public mockDex1;
    MockUniversalDexInterface public mockDex2;

    address public constant TOKEN_A = address(0x1);
    address public constant TOKEN_B = address(0x2);

    function setUp() public {
        // Create mock DEXes
        mockDex1 = new MockUniversalDexInterface();
        mockDex2 = new MockUniversalDexInterface();

        // Set up initial reserves
        mockDex1.setReserve(TOKEN_A, TOKEN_B, 1000, 500);
        mockDex2.setReserve(TOKEN_A, TOKEN_B, 2000, 1000); // Higher reserves

        // Setup dex addresses array
        address[] memory dexAddresses = new address[](2);
        dexAddresses[0] = address(mockDex1);
        dexAddresses[1] = address(mockDex2);

        // Deploy StreamDaemon with the mock interface
        streamDaemon = new StreamDaemon(address(mockDex1), dexAddresses);
    }

    function testConstructorInitialization() public {
        // Check that the universalDexInterface was set correctly
        assertEq(address(streamDaemon.universalDexInterface()), address(mockDex1));

        // Check that the dexs array was initialized correctly
        assertEq(streamDaemon.dexs(0), address(mockDex1));
        assertEq(streamDaemon.dexs(1), address(mockDex2));
    }

    function testRegisterDex() public {
        // Create a new mock DEX
        MockUniversalDexInterface mockDex3 = new MockUniversalDexInterface();

        // Register the new DEX
        streamDaemon.registerDex(address(mockDex3));

        // Check that the new DEX was added to the array
        assertEq(streamDaemon.dexs(2), address(mockDex3));
    }

    function testFindHighestReservesForTokenPair() public {
        // Test the findHighestReservesForTokenPair function
        (address bestFetcher, uint256 maxReserve) = streamDaemon.findHighestReservesForTokenPair(TOKEN_A, TOKEN_B);

        // mockDex2 has higher reserves, so it should be selected
        assertEq(bestFetcher, address(mockDex2));
        assertEq(maxReserve, 2000); // This should be the reserve of TOKEN_A in mockDex2
    }

    function testEvaluateSweetSpotAndDex() public {
        // Let's set some values for testing
        uint256 volume = 100;
        uint256 effectiveGas = 10;

        // Call the function
        (uint256 sweetSpot, address bestFetcher) =
            streamDaemon.evaluateSweetSpotAndDex(TOKEN_A, TOKEN_B, volume, effectiveGas);

        // Check that the best fetcher is mockDex2 (which has higher reserves)
        assertEq(bestFetcher, address(mockDex2));

        // Calculate the expected sweet spot using our own sqrt implementation
        // The formula is: volume / sqrt(reserves * effectiveGas)
        uint256 expectedSweetSpot = volume / sqrt(2000 * effectiveGas);
        assertEq(sweetSpot, expectedSweetSpot);
    }

    function testSweetSpotAlgo() public {
        // Test the _sweetSpotAlgo function with simple values
        uint256 volume = 1000;
        uint256 reserves = 10000;
        uint256 effectiveGas = 5;

        uint256 sweetSpot = streamDaemon._sweetSpotAlgo(volume, reserves, effectiveGas);

        // Calculate the expected result using our own sqrt implementation
        uint256 expectedSweetSpot = volume / sqrt(reserves * effectiveGas);
        assertEq(sweetSpot, expectedSweetSpot);
    }

    function testSqrtFunction() public {
        // Test known results to verify our sweet spot algorithm works correctly
        // We can't directly test the sqrt function since it's internal

        // But we can test _sweetSpotAlgo with values that have known results
        // For example, if volume = 100, reserves = 100, effectiveGas = 1
        // Then sweetSpot = 100 / sqrt(100 * 1) = 100 / 10 = 10
        uint256 sweetSpot = streamDaemon._sweetSpotAlgo(100, 100, 1);
        assertEq(sweetSpot, 10);

        // Another test: volume = 100, reserves = 25, effectiveGas = 4
        // Then sweetSpot = 100 / sqrt(25 * 4) = 100 / sqrt(100) = 100 / 10 = 10
        sweetSpot = streamDaemon._sweetSpotAlgo(100, 25, 4);
        assertEq(sweetSpot, 10);
    }

    function testOnlyOwnerCanRegisterDex() public {
        // Create a new address
        address nonOwner = makeAddr("nonOwner");

        // Try to register a new DEX from the non-owner address
        vm.prank(nonOwner);
        vm.expectRevert(); // This should revert since only the owner can register DEXes
        streamDaemon.registerDex(address(0x123));
    }

    // Our own implementation of sqrt for testing purposes
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
