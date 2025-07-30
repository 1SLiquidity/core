// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import { Fork_Test } from "test/fork/Fork.t.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Config } from "../../config/Config.sol";
import "forge-std/console.sol";

contract CoreForkTest is Fork_Test {
    address constant USDC_WHALE = 0x55FE002aefF02F77364de339a1292923A15844B8;

    // Config et adresses USDC
    Config public config;
    address[] public usdcPairAddresses;

    function setUp() public virtual override {
        super.setUp();

        // Charger les adresses USDC depuis le JSON
        console.log("Chargement des adresses USDC...");
        config = new Config();
        config.loadUSDCPairAddresses();

        // Récupérer toutes les adresses dans le tableau local
        usdcPairAddresses = config.getUSDCPairAddresses();

        console.log("Nombre d'adresses USDC chargees:", usdcPairAddresses.length);
        console.log("Setup complete avec", usdcPairAddresses.length, "tokens USDC");
    }

    // ===== FONCTIONS UTILITAIRES POUR ACCEDER AUX ADRESSES =====

    function getUSDCPairAddress(uint256 index) public view returns (address) {
        require(index < usdcPairAddresses.length, "Index out of bounds");
        return usdcPairAddresses[index];
    }

    function getUSDCPairAddressesCount() public view returns (uint256) {
        return usdcPairAddresses.length;
    }

    function getTokenByName(string memory tokenName) public view returns (address) {
        return config.getTokenAddress(tokenName);
    }

    function isUSDCPair(address tokenAddress) public view returns (bool) {
        return config.isUSDCPairAddress(tokenAddress);
    }

    // ===== TESTS =====

    function test_USDCAddressesLoaded() public view {
        // Vérifier que les adresses sont chargées
        assertTrue(usdcPairAddresses.length > 0, "Aucune adresse USDC chargee");
        console.log("Total adresses USDC:", usdcPairAddresses.length);

        // Vérifier quelques tokens connus
        address usdc = getTokenByName("USDC");
        address weth = getTokenByName("WETH");
        address wbtc = getTokenByName("WBTC");

        assertTrue(usdc != address(0), "USDC not found");
        assertTrue(weth != address(0), "WETH not found");
        assertTrue(wbtc != address(0), "WBTC not found");

        console.log("USDC address:", usdc);
        console.log("WETH address:", weth);
        console.log("WBTC address:", wbtc);

        // Afficher les 5 premiers tokens
        console.log("\nPremiers 5 tokens:");
        uint256 displayCount = usdcPairAddresses.length > 5 ? 5 : usdcPairAddresses.length;
        for (uint256 i = 0; i < displayCount; i++) {
            address addr = usdcPairAddresses[i];
            string memory name = config.getTokenName(addr);
            console.log("Token", i, ":", name);
            console.log("  Address:", addr);
        }
    }

    function test_PlaceTradeWithUSDCTokens() public {
        console.log("Test avec les tokens USDC pairs");

        // Test avec les 3 premiers tokens du tableau
        uint256 testCount = usdcPairAddresses.length > 10 ? 10 : usdcPairAddresses.length;

        for (uint256 i = 0; i < testCount; i++) {
            address tokenAddress = usdcPairAddresses[i];
            string memory tokenName = config.getTokenName(tokenAddress);

            console.log("Testing token", i, ":", tokenName);
            console.log("  Address:", tokenAddress);

            // Vérifier que c'est bien un token USDC pair
            assertTrue(isUSDCPair(tokenAddress), "Token should be USDC pair");

            if (tokenAddress != address(0)) {
                address usdc = getTokenByName("USDC");
                uint256 amountIn = formatTokenAmount(usdc, 10);
                bytes memory tradeData = abi.encode(usdc, tokenAddress, amountIn, 0, false, 0.0005 ether);
                vm.startPrank(USDC_WHALE);
                approveToken(usdc, address(core), amountIn);
                try core.placeTrade(tradeData) {
                    console.log("Trade successful");
                } catch (bytes memory reason) {
                    console.log("Trade failed");
                    console.logBytes(reason);
                }
                vm.stopPrank();
            }
        }
    }
}
