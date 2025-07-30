# Config.sol - Configuration Contract

Ce fichier `Config.sol` charge dynamiquement toutes les adresses des tokens qui forment des paires avec USDC depuis le fichier JSON `config/usdc_pairs_clean.json`.

## Fonctionnalités

- ✅ **Aucune adresse hardcodée** - Toutes les adresses sont chargées depuis le JSON
- ✅ **89 adresses USDC pairs** - Tous les tokens du fichier JSON sont disponibles
- ✅ **Recherche par nom** - Obtenez une adresse par nom de token
- ✅ **Recherche par adresse** - Obtenez le nom d'un token par son adresse
- ✅ **Fonctions utilitaires** - Vérification, indexation, sous-ensembles

## Utilisation dans votre CoreFork.t.sol

### 1. Import et Setup

```solidity
// Dans votre fichier test/fork/CoreFork.t.sol
import { Config } from "../../config/Config.sol";

contract CoreForkTest is Fork_Test {
    Config public config;
    address[] public usdcPairAddresses;

    function setUp() public virtual override {
        super.setUp();

        // Setup Config
        config = new Config();
        config.loadUSDCPairAddresses();

        // Load addresses locally (optionnel)
        usdcPairAddresses = config.getUSDCPairAddresses();
    }
}
```

### 2. Fonctions Principales

```solidity
// Obtenir toutes les adresses
address[] memory allAddresses = config.getUSDCPairAddresses();

// Obtenir le nombre d'adresses
uint256 count = config.getUSDCPairAddressesCount();

// Obtenir une adresse par index
address tokenAddr = config.getUSDCPairAddressAt(0);

// Obtenir une adresse par nom
address usdcAddr = config.getTokenAddress("USDC");
address wethAddr = config.getTokenAddress("WETH");

// Obtenir le nom par adresse
string memory tokenName = config.getTokenName(tokenAddr);

// Vérifier si une adresse est dans les pairs USDC
bool isUSDCPair = config.isUSDCPairAddress(someAddress);

// Trouver l'index d'une adresse
(bool found, uint256 index) = config.findUSDCPairAddressIndex(tokenAddr);
```

### 3. Fonctions Utilitaires

```solidity
// Obtenir les N premières adresses
address[] memory first10 = config.getFirstNAddresses(10);

// Obtenir des adresses par noms
string[] memory tokenNames = new string[](3);
tokenNames[0] = "USDC";
tokenNames[1] = "WETH";
tokenNames[2] = "WBTC";
address[] memory addresses = config.getAddressesByNames(tokenNames);

// Obtenir des adresses par indices
uint256[] memory indices = new uint256[](3);
indices[0] = 0;
indices[1] = 5;
indices[2] = 10;
address[] memory selectedAddresses = config.getAddressesByIndices(indices);
```

### 4. Exemple Complet pour CoreFork.t.sol

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import { Fork_Test } from "test/fork/Fork.t.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Config } from "../../config/Config.sol";

contract CoreForkTest is Fork_Test {
    Config public config;
    address[] public usdcPairAddresses;

    function setUp() public virtual override {
        super.setUp();

        // Setup Config - charge toutes les adresses depuis JSON
        config = new Config();
        config.loadUSDCPairAddresses();

        // Optionnel: charger localement pour performance
        usdcPairAddresses = config.getUSDCPairAddresses();
    }

    function test_PlaceTradeWithAllUSDCPairs() public {
        uint256 count = config.getUSDCPairAddressesCount();
        console.log("Testing with", count, "USDC pair tokens");

        // Test avec les 5 premiers tokens
        for (uint256 i = 0; i < 5 && i < count; i++) {
            address tokenIn = config.getUSDCPairAddressAt(i);
            address tokenOut = config.getTokenAddress("USDC");
            string memory tokenName = config.getTokenName(tokenIn);

            console.log("Testing trade:", tokenName, "->", "USDC");

            // Votre logique de test ici
            // uint256 amountIn = formatTokenAmount(tokenIn, 1);
            // bytes memory tradeData = abi.encode(tokenIn, tokenOut, amountIn, 0, false, 0.0005 ether);
            // core.placeTrade(tradeData);
        }
    }

    function test_SpecificTokenTrades() public {
        // Test avec des tokens spécifiques
        address wethAddr = config.getTokenAddress("WETH");
        address wbtcAddr = config.getTokenAddress("WBTC");
        address linkAddr = config.getTokenAddress("link");

        assertTrue(wethAddr != address(0), "WETH should be available");
        assertTrue(wbtcAddr != address(0), "WBTC should be available");
        assertTrue(linkAddr != address(0), "LINK should be available");

        // Test trades avec ces tokens...
    }

    function test_BatchProcessing() public {
        // Traiter par lots de 10
        uint256 batchSize = 10;
        uint256 totalCount = config.getUSDCPairAddressesCount();

        for (uint256 batch = 0; batch < totalCount; batch += batchSize) {
            uint256 endIndex = batch + batchSize;
            if (endIndex > totalCount) endIndex = totalCount;

            console.log("Processing batch", batch, "to", endIndex);

            for (uint256 i = batch; i < endIndex; i++) {
                address tokenAddr = config.getUSDCPairAddressAt(i);
                // Process token...
            }
        }
    }
}
```

## Tokens Disponibles

Le fichier JSON contient **89 tokens** incluant :

- USDC, USDT, WBTC, WETH
- 1inch, AAVE, APE, ARB, BNB
- DAI, ENS, CVX, SHIB, SAND
- MKR, FRAX, SNX, LDO, LINK
- STETH, WSTETH, et bien d'autres...

## Gestion d'Erreurs

```solidity
// Toujours vérifier si les données sont chargées
require(config.isLoaded(), "Config not loaded");

// Vérifier les indices
require(index < config.getUSDCPairAddressesCount(), "Index out of bounds");

// Vérifier les adresses nulles
address tokenAddr = config.getTokenAddress("SOME_TOKEN");
require(tokenAddr != address(0), "Token not found");
```

## Performance

- **Chargement initial** : ~8M gas (une seule fois)
- **Accès aux données** : ~2-5k gas par appel
- **Recherche** : O(n) pour recherche par adresse, O(1) pour recherche par nom

## Test

```bash
# Tester Config.sol
forge script script/TestConfig.s.sol:TestConfig --ffi -vv

# Voir l'exemple d'utilisation
forge script script/ExampleUsage.s.sol:ExampleUsage --ffi -vv
```
