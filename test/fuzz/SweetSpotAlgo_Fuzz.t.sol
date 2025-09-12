// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {Deploys} from "test/shared/Deploys.sol";
import {MockERC20} from "test/mock/MockERC20.sol";

contract SweetSpotAlgo_Fuzz_Test is Deploys {
    MockERC20 tokenIn;
    MockERC20 tokenOut;

    function setUp() public override {
        super.setUp();

        // Deploy mock tokens with different decimals
        tokenIn = new MockERC20("Token In", "TKI", 18);
        tokenOut = new MockERC20("Token Out", "TKO", 18);
    }

    // Test fuzz pour les paramètres valides de sweetSpotAlgo
    function testFuzz_SweetSpotAlgo_ValidInputs(uint96 reserveIn, uint96 reserveOut, uint96 volume, uint96 effectiveGas)
        public
    {
        // Utiliser bound pour contrôler les plages de valeurs
        uint256 boundedReserveIn = bound(uint256(reserveIn), 10 ** 18, type(uint96).max);
        uint256 boundedReserveOut = bound(uint256(reserveOut), 10 ** 18, type(uint96).max);
        uint256 boundedVolume = bound(uint256(volume), 10 ** 18, type(uint96).max);
        uint256 boundedEffectiveGas = bound(uint256(effectiveGas), 1, 1e6);

        // Appeler la fonction
        uint256 sweetSpot = streamDaemon._sweetSpotAlgo(
            address(tokenIn), address(tokenOut), boundedVolume, boundedReserveIn, boundedReserveOut, boundedEffectiveGas
        );

        // Vérifications invariantes
        assertTrue(sweetSpot >= 4, "Sweet spot should be at least 4");
        assertTrue(sweetSpot <= 500, "Sweet spot should be at most 500");
    }

    // Test fuzz pour vérifier que les reverts fonctionnent correctement
    function testFuzz_SweetSpotAlgo_RevertOnInvalidInputs(
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 volume,
        uint256 effectiveGas
    ) public {
        // Test avec reserveIn = 0
        if (reserveIn == 0 && reserveOut > 0 && effectiveGas > 0) {
            vm.expectRevert("No reserves or appropriate gas estimation");
            streamDaemon._sweetSpotAlgo(
                address(tokenIn), address(tokenOut), volume, reserveIn, reserveOut, effectiveGas
            );
        }

        // Test avec reserveOut = 0
        if (reserveOut == 0 && reserveIn > 0 && effectiveGas > 0) {
            vm.expectRevert("No reserves or appropriate gas estimation");
            streamDaemon._sweetSpotAlgo(
                address(tokenIn), address(tokenOut), volume, reserveIn, reserveOut, effectiveGas
            );
        }

        // Test avec effectiveGas = 0
        if (effectiveGas == 0 && reserveIn > 0 && reserveOut > 0) {
            vm.expectRevert("No reserves or appropriate gas estimation");
            streamDaemon._sweetSpotAlgo(
                address(tokenIn), address(tokenOut), volume, reserveIn, reserveOut, effectiveGas
            );
        }
    }

    // Test fuzz pour vérifier la monotonie du sweet spot
    function testFuzz_SweetSpotAlgo_Monotonicity(
        uint96 reserveIn,
        uint96 reserveOut,
        uint96 volume1,
        uint96 volume2,
        uint96 effectiveGas
    ) public {
        // Utiliser bound pour contrôler les plages de valeurs
        uint256 boundedReserveIn = bound(uint256(reserveIn), 10 ** 18, type(uint96).max);
        uint256 boundedReserveOut = bound(uint256(reserveOut), 10 ** 18, type(uint96).max);
        uint256 boundedVolume1 = bound(uint256(volume1), 10 ** 18, type(uint96).max);
        uint256 boundedVolume2 = bound(uint256(volume2), 10 ** 18, type(uint96).max);
        uint256 boundedEffectiveGas = bound(uint256(effectiveGas), 1, 1e6);

        // S'assurer que volume1 < volume2
        if (boundedVolume1 >= boundedVolume2) {
            uint256 temp = boundedVolume1;
            boundedVolume1 = boundedVolume2;
            boundedVolume2 = temp;
        }

        uint256 sweetSpot1 = streamDaemon._sweetSpotAlgo(
            address(tokenIn),
            address(tokenOut),
            boundedVolume1,
            boundedReserveIn,
            boundedReserveOut,
            boundedEffectiveGas
        );

        uint256 sweetSpot2 = streamDaemon._sweetSpotAlgo(
            address(tokenIn),
            address(tokenOut),
            boundedVolume2,
            boundedReserveIn,
            boundedReserveOut,
            boundedEffectiveGas
        );

        // Avec un volume plus grand, le sweet spot devrait être plus grand
        assertTrue(sweetSpot2 >= sweetSpot1, "Sweet spot should increase with volume");
    }

    // Test fuzz pour vérifier les cas limites (minimum et maximum sweet spot)
    function testFuzz_SweetSpotAlgo_BoundaryConditions(
        uint96 reserveIn,
        uint96 reserveOut,
        uint96 volume,
        uint96 effectiveGas
    ) public {
        // Utiliser bound pour contrôler les plages de valeurs
        uint256 boundedReserveIn = bound(uint256(reserveIn), 10 ** 18, type(uint96).max);
        uint256 boundedReserveOut = bound(uint256(reserveOut), 10 ** 18, type(uint96).max);
        uint256 boundedVolume = bound(uint256(volume), 10 ** 18, type(uint96).max);
        uint256 boundedEffectiveGas = bound(uint256(effectiveGas), 1, 1e6);

        uint256 sweetSpot = streamDaemon._sweetSpotAlgo(
            address(tokenIn), address(tokenOut), boundedVolume, boundedReserveIn, boundedReserveOut, boundedEffectiveGas
        );

        // Vérifier les bornes
        assertTrue(sweetSpot >= 4, "Sweet spot should never be less than 4");
        assertTrue(sweetSpot <= 500, "Sweet spot should never be more than 500");

        // Si le sweet spot calculé est 0, il devrait être remplacé par 4
        // Si le sweet spot calculé est < 4, il devrait être remplacé par 4
        // Si le sweet spot calculé est > 500, il devrait être remplacé par 500
    }

    // Test fuzz pour vérifier la cohérence avec différents tokens
    function testFuzz_SweetSpotAlgo_TokenDecimals(
        uint96 reserveIn,
        uint96 reserveOut,
        uint96 volume,
        uint96 effectiveGas
    ) public {
        // Utiliser bound pour contrôler les plages de valeurs
        uint256 boundedReserveIn = bound(uint256(reserveIn), 10 ** 18, type(uint96).max);
        uint256 boundedReserveOut = bound(uint256(reserveOut), 10 ** 18, type(uint96).max);
        uint256 boundedVolume = bound(uint256(volume), 10 ** 18, type(uint96).max);
        uint256 boundedEffectiveGas = bound(uint256(effectiveGas), 1, 1e6);

        // Créer des tokens avec différentes décimales pour tester le scaling
        MockERC20 tokenIn8 = new MockERC20("Token In 8", "TKI8", 8);
        MockERC20 tokenOut12 = new MockERC20("Token Out 12", "TKO12", 12);

        uint256 sweetSpotOriginal = streamDaemon._sweetSpotAlgo(
            address(tokenIn), address(tokenOut), boundedVolume, boundedReserveIn, boundedReserveOut, boundedEffectiveGas
        );

        uint256 sweetSpotDifferentDecimals = streamDaemon._sweetSpotAlgo(
            address(tokenIn8),
            address(tokenOut12),
            boundedVolume,
            boundedReserveIn,
            boundedReserveOut,
            boundedEffectiveGas
        );

        // Les sweet spots devraient être dans les mêmes bornes
        assertTrue(sweetSpotOriginal >= 4 && sweetSpotOriginal <= 500, "Original sweet spot out of bounds");
        assertTrue(
            sweetSpotDifferentDecimals >= 4 && sweetSpotDifferentDecimals <= 500,
            "Different decimals sweet spot out of bounds"
        );
    }
}
