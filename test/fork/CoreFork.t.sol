// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {Fork_Test} from "test/fork/Fork.t.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Config} from "../../config/Config.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IUniversalDexInterface} from "src/interfaces/IUniversalDexInterface.sol";

import "forge-std/console.sol";

contract CoreForkTest is Fork_Test {
    using SafeERC20 for IERC20;

    address constant USDC_WHALE = 0x55FE002aefF02F77364de339a1292923A15844B8;
    address constant USDT_WHALE = 0x5754284f345afc66a98fbB0a0Afe71e0F007B949;
    address constant WETH_WHALE = 0x8EB8a3b98659Cce290402893d0123abb75E3ab28;
    address constant WBTC_WHALE = 0xBF72Da2Bd84c5170618Fbe5914B0ECA9638d5eb5;

    // Events to capture test results
    event TokenTestResult(
        string indexed baseTokenSymbol,
        string tokenName,
        address indexed tokenAddress,
        bool success,
        string failureReason
    );

    event TestSummary(string indexed baseTokenSymbol, uint256 totalTests, uint256 successCount, uint256 failureCount);

    // Config and token pair addresses
    Config public config;
    address[] public usdcPairAddresses;
    address[] public usdtPairAddresses;
    address[] public wethPairAddresses;
    address[] public wbtcPairAddresses;

    function setUp() public virtual override {
        super.setUp();

        // Initialize config and load all token pair addresses
        console.log("Loading all token pair addresses...");
        config = new Config();
        config.loadAllTokenPairAddresses();

        // Get all addresses in local arrays
        usdcPairAddresses = config.getUSDCPairAddresses();
        usdtPairAddresses = config.getUSDTPairAddresses();
        wethPairAddresses = config.getWETHPairAddresses();
        wbtcPairAddresses = config.getWBTCPairAddresses();

        console.log("Number of USDC addresses loaded:", usdcPairAddresses.length);
        console.log("Number of USDT addresses loaded:", usdtPairAddresses.length);
        console.log("Number of WETH addresses loaded:", wethPairAddresses.length);
        console.log("Number of WBTC addresses loaded:", wbtcPairAddresses.length);
        console.log("Setup complete with all token pairs loaded");
    }

    // ===== UTILITY FUNCTIONS TO ACCESS ADDRESSES =====

    // USDC functions
    function getUSDCPairAddress(uint256 index) public view returns (address) {
        require(index < usdcPairAddresses.length, "Index out of bounds");
        return usdcPairAddresses[index];
    }

    function getUSDCPairAddressesCount() public view returns (uint256) {
        return usdcPairAddresses.length;
    }

    function isUSDCPair(address tokenAddress) public view returns (bool) {
        return config.isUSDCPairAddress(tokenAddress);
    }

    // USDT functions
    function getUSDTPairAddress(uint256 index) public view returns (address) {
        require(index < usdtPairAddresses.length, "Index out of bounds");
        return usdtPairAddresses[index];
    }

    function getUSDTPairAddressesCount() public view returns (uint256) {
        return usdtPairAddresses.length;
    }

    function isUSDTPair(address tokenAddress) public view returns (bool) {
        return config.isUSDTPairAddress(tokenAddress);
    }

    // WETH functions
    function getWETHPairAddress(uint256 index) public view returns (address) {
        require(index < wethPairAddresses.length, "Index out of bounds");
        return wethPairAddresses[index];
    }

    function getWETHPairAddressesCount() public view returns (uint256) {
        return wethPairAddresses.length;
    }

    function isWETHPair(address tokenAddress) public view returns (bool) {
        return config.isWETHPairAddress(tokenAddress);
    }

    // WBTC functions
    function getWBTCPairAddress(uint256 index) public view returns (address) {
        require(index < wbtcPairAddresses.length, "Index out of bounds");
        return wbtcPairAddresses[index];
    }

    function getWBTCPairAddressesCount() public view returns (uint256) {
        return wbtcPairAddresses.length;
    }

    function isWBTCPair(address tokenAddress) public view returns (bool) {
        return config.isWBTCPairAddress(tokenAddress);
    }

    // Global functions
    function getTokenByName(string memory tokenName) public view returns (address) {
        return config.getTokenAddress(tokenName);
    }

    // ===== UTILITY FUNCTIONS FOR TESTING =====

    /**
     * @dev Generic function to test trades for any token
     */
    function _testTradesForToken(
        string memory tokenSymbol,
        address[] memory pairAddresses,
        address baseToken,
        address whaleAddress
    ) internal {
        console.log("Test with", tokenSymbol, "pair tokens");

        uint8 maxTestCount = 50;

        uint256 testCount = pairAddresses.length > maxTestCount ? maxTestCount : pairAddresses.length;
        string[] memory successfulTrades = new string[](testCount);
        string[] memory failedTrades = new string[](testCount);
        string[] memory failureReasons = new string[](testCount);
        uint256 successCount = 0;
        uint256 failureCount = 0;

        for (uint256 i = 0; i < testCount; i++) {
            address tokenAddress = pairAddresses[i];
            string memory tokenName = config.getTokenName(tokenAddress);

            console.log("================================");
            console.log("Testing token", i, ":", tokenName);

            if (tokenAddress != address(0)) {
                uint256 amountIn = getAggreateTokenInAmount(baseToken, tokenAddress);
                console.log("Amount in for token", tokenSymbol, ":", amountIn);

                bytes memory tradeData = abi.encode(baseToken, tokenAddress, amountIn, 0, false, 0.0005 ether);
                vm.startPrank(whaleAddress);
                SafeERC20.forceApprove(IERC20(baseToken), address(core), amountIn);

                try core.placeTrade(tradeData) {
                    successfulTrades[successCount] = tokenName;
                    successCount++;
                    // Emit success event
                    emit TokenTestResult(tokenSymbol, tokenName, tokenAddress, true, "");
                } catch Error(string memory reason) {
                    failedTrades[failureCount] = tokenName;
                    failureReasons[failureCount] = reason;
                    failureCount++;
                    // Emit failure event
                    emit TokenTestResult(tokenSymbol, tokenName, tokenAddress, false, reason);
                } catch (bytes memory lowLevelData) {
                    string memory errorMsg = _bytesToString(lowLevelData);
                    failedTrades[failureCount] = tokenName;
                    failureReasons[failureCount] = errorMsg;
                    failureCount++;
                    // Emit failure event
                    emit TokenTestResult(tokenSymbol, tokenName, tokenAddress, false, errorMsg);
                }
                vm.stopPrank();
            } else {
                // Emit event for zero token address
                emit TokenTestResult(tokenSymbol, tokenName, tokenAddress, false, "Token address is zero");
            }
        }

        _logTradeSummary(
            tokenSymbol, testCount, successCount, failureCount, successfulTrades, failedTrades, failureReasons
        );

        // Emit test summary
        emit TestSummary(tokenSymbol, testCount, successCount, failureCount);

        // Alternative option: Structured logging for simple extraction
        console.log("JSON_RESULT_START");
        console.log("{");
        console.log('  "baseToken": "%s",', tokenSymbol);
        console.log('  "totalTests": %s,', vm.toString(testCount));
        console.log('  "successCount": %s,', vm.toString(successCount));
        console.log('  "failureCount": %s,', vm.toString(failureCount));
        console.log('  "results": [');

        // Log individual results in JSON format
        for (uint256 i = 0; i < testCount; i++) {
            address tokenAddress = pairAddresses[i];
            string memory tokenName = config.getTokenName(tokenAddress);
            bool isSuccess = false;
            string memory reason = "";

            // Determine token status
            for (uint256 j = 0; j < successCount; j++) {
                if (_compareStrings(successfulTrades[j], tokenName)) {
                    isSuccess = true;
                    break;
                }
            }

            if (!isSuccess) {
                for (uint256 j = 0; j < failureCount; j++) {
                    if (_compareStrings(failedTrades[j], tokenName)) {
                        reason = failureReasons[j];
                        break;
                    }
                }
            }

            console.log("    {");
            console.log('      "tokenName": "%s",', tokenName);
            console.log('      "tokenAddress": "%s",', vm.toString(tokenAddress));
            console.log('      "success": %s,', isSuccess ? "true" : "false");
            console.log('      "failureReason": "%s"', reason);
            if (i < testCount - 1) {
                console.log("    },");
            } else {
                console.log("    }");
            }
        }

        console.log("  ]");
        console.log("}");
        console.log("JSON_RESULT_END");
    }

    /**
     * @dev Convert bytes to readable string for error messages
     */
    function _bytesToString(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "Unknown error";

        // Try to decode as a revert reason (Error(string) selector + string)
        if (data.length >= 4) {
            bytes4 errorSelector = bytes4(data);

            // Error(string) selector is 0x08c379a0
            if (errorSelector == 0x08c379a0) {
                // Decode the string from the error data
                (string memory reason) = abi.decode(_slice(data, 4, data.length - 4), (string));
                return reason;
            }

            // Panic(uint256) selector is 0x4e487b71
            if (errorSelector == 0x4e487b71) {
                (uint256 code) = abi.decode(_slice(data, 4, data.length - 4), (uint256));
                return string.concat("Panic code: ", vm.toString(code));
            }
        }

        // If we can't decode it, return hex representation of first 32 bytes
        string memory hexStr = "0x";
        uint256 len = data.length > 32 ? 32 : data.length;
        for (uint256 i = 0; i < len; i++) {
            bytes1 b = data[i];
            hexStr = string.concat(hexStr, _byteToHex(uint8(b)));
        }
        if (data.length > 32) {
            hexStr = string.concat(hexStr, "...");
        }
        return hexStr;
    }

    /**
     * @dev Convert byte to hex string
     */
    function _byteToHex(uint8 b) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory result = new bytes(2);
        result[0] = hexChars[b >> 4];
        result[1] = hexChars[b & 0x0f];
        return string(result);
    }

    /**
     * @dev Slice bytes array
     */
    function _slice(bytes memory data, uint256 start, uint256 length) internal pure returns (bytes memory) {
        bytes memory result = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = data[start + i];
        }
        return result;
    }

    /**
     * @dev Log trade summary
     */
    function _logTradeSummary(
        string memory tokenSymbol,
        uint256 testCount,
        uint256 successCount,
        uint256 failureCount,
        string[] memory successfulTrades,
        string[] memory failedTrades,
        string[] memory failureReasons
    ) internal view {
        if (successCount > 0) {
            console.log("\n--- SUCCESSFUL TRADES ---");
            for (uint256 i = 0; i < successCount; i++) {
                console.log("[SUCCESS]", successfulTrades[i]);
            }
        }

        if (failureCount > 0) {
            console.log("\n--- FAILED TRADES ---");
            for (uint256 i = 0; i < failureCount; i++) {
                console.log("[FAILED]", failedTrades[i]);
                console.log("  Reason:", failureReasons[i]);
            }
        }

        console.log(string.concat("\n====== ", tokenSymbol, " TRADE SUMMARY ======"));
        console.log("Total trades attempted:", testCount);
        console.log("Successful trades:", successCount);
        console.log("Failed trades:", failureCount);
        console.log("============================");
    }

    // ===== TESTS =====

    function test_USDCAddressesLoaded() public view {
        // Verify that addresses are loaded
        assertTrue(usdcPairAddresses.length > 0, "No USDC addresses loaded");
        console.log("Total USDC addresses:", usdcPairAddresses.length);

        // Verify some known tokens (using lowercase names as in JSON)
        address usdc = getTokenByName("usdc");
        address weth = getTokenByName("weth");
        address wbtc = getTokenByName("wbtc");
        address usdt = getTokenByName("usdt");

        assertTrue(usdc != address(0), "USDC not found");
        assertTrue(weth != address(0), "WETH not found");
        assertTrue(wbtc != address(0), "WBTC not found");
        assertTrue(usdt != address(0), "USDT not found");

        console.log("USDC address:", usdc);
        console.log("WETH address:", weth);
        console.log("WBTC address:", wbtc);
        console.log("USDT address:", usdt);

        // Display the first 5 tokens
        console.log("\nFirst 5 tokens:");
        uint256 displayCount = usdcPairAddresses.length > 5 ? 5 : usdcPairAddresses.length;
        for (uint256 i = 0; i < displayCount; i++) {
            address addr = usdcPairAddresses[i];
            string memory name = config.getTokenName(addr);
            console.log("Token", i, ":", name);
            console.log("  Address:", addr);
        }
    }

    function test_PlaceTradeWithUSDCTokens() public {
        address usdc = getTokenByName("usdc");
        _testTradesForToken("USDC", usdcPairAddresses, usdc, USDC_WHALE);
    }

    function test_PlaceTradeWithUSDTTokens() public {
        address usdt = getTokenByName("usdt");
        _testTradesForToken("USDT", usdtPairAddresses, usdt, USDT_WHALE);
    }

    function test_PlaceTradeWithWETHTokens() public {
        address weth = getTokenByName("weth");
        _testTradesForToken("WETH", wethPairAddresses, weth, WETH_WHALE);
    }

    function test_PlaceTradeWithWBTCTokens() public {
        address wbtc = getTokenByName("wbtc");
        _testTradesForToken("WBTC", wbtcPairAddresses, wbtc, WBTC_WHALE);
    }

    /**
     * @dev Test a specific trade between two tokens
     * Usage: test_TradeSpecificPair("usdc", "uni", 1000)
     */
    function test_TradeSpecificPair(string memory fromToken, string memory toToken, uint256 readableTokenInAmount)
        public
    {
        address fromAddress = getTokenByName(fromToken);
        address toAddress = getTokenByName(toToken);

        require(fromAddress != address(0), string.concat("From token not found: ", fromToken));
        require(toAddress != address(0), string.concat("To token not found: ", toToken));

        console.log("=== SPECIFIC PAIR TRADE TEST ===");
        console.log("Trading:", fromToken, "->", toToken);
        console.log("From address:", fromAddress);
        console.log("To address:", toAddress);

        // Determine which whale to use based on fromToken
        address whale = _getWhaleForToken(fromToken);
        uint256 amountIn = formatTokenAmount(fromAddress, readableTokenInAmount);

        console.log("Amount in:", amountIn);
        console.log("Using whale:", whale);

        // Execute the trade
        bytes memory tradeData = abi.encode(fromAddress, toAddress, amountIn, 0, false, 0.0005 ether);
        vm.startPrank(whale);
        SafeERC20.forceApprove(IERC20(fromAddress), address(core), amountIn);

        try core.placeTrade(tradeData) {
            console.log("[SUCCESS] Trade executed successfully!");
        } catch Error(string memory reason) {
            console.log("[FAILED] Trade failed");
            console.log("Reason:", reason);
        } catch (bytes memory lowLevelData) {
            console.log("[FAILED] Trade failed");
            console.log("Reason:", _bytesToString(lowLevelData));
        }

        vm.stopPrank();
        console.log("================================");
    }

    /**
     * @dev Get the appropriate whale address for a token
     */
    function _getWhaleForToken(string memory tokenName) internal pure returns (address) {
        if (_compareStrings(tokenName, "usdc")) return USDC_WHALE;
        if (_compareStrings(tokenName, "usdt")) return USDT_WHALE;
        if (_compareStrings(tokenName, "weth")) return WETH_WHALE;
        if (_compareStrings(tokenName, "wbtc")) return WBTC_WHALE;

        // For other tokens, default to USDC whale
        return USDC_WHALE;
    }

    /**
     * @dev Compare two strings
     */
    function _compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    function getAggreateTokenInAmount(address tokenIn, address tokenOut)
        public
        view
        returns (uint256 aggregateTokenInAmount)
    {
        for (uint256 i = 0; i < dexes.length; i++) {
            IUniversalDexInterface fetcher = IUniversalDexInterface(dexes[i]);
            try fetcher.getReserves(tokenIn, tokenOut) returns (uint256 reserveTokenIn, uint256) {
                aggregateTokenInAmount += reserveTokenIn;
            } catch Error(string memory reason) {
                console.log("Error:", reason);
                continue;
            } catch Panic(uint256 errorCode) {
                console.log("Panic error code:", errorCode);
                continue;
            }
        }
    }
}

//USDC USDT WETH WBTC
