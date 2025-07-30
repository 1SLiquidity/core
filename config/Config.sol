// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import "forge-std/console.sol";

/**
 * @title Config
 * @dev Configuration contract that loads USDC pair addresses from JSON file
 * This contract provides access to token addresses that form pairs with USDC
 */
contract Config is Script {
    using stdJson for string;

    struct TokenPair {
        string name;
        address addr; // Changed from tokenAddress to match JSON field "address"
    }

    // Storage for loaded addresses
    address[] internal _usdcPairAddresses;
    mapping(address => string) internal _tokenNames;
    mapping(string => address) internal _nameToAddress;
    bool internal _isLoaded = false;

    /**
     * @dev Load USDC pair addresses from JSON file
     * This function reads the config/usdc_pairs_clean.json file and extracts all addresses
     */
    function loadUSDCPairAddresses() public {
        if (_isLoaded) {
            return; // Already loaded
        }

        try this.readUSDCPairsFromJSON() returns (TokenPair[] memory pairs) {
            console.log("Successfully loaded", pairs.length, "USDC pair addresses from JSON");

            // Clear existing data
            delete _usdcPairAddresses;

            // Store the loaded data
            for (uint256 i = 0; i < pairs.length; i++) {
                address tokenAddress = pairs[i].addr;
                string memory tokenName = pairs[i].name;

                _usdcPairAddresses.push(tokenAddress);
                _tokenNames[tokenAddress] = tokenName;
                _nameToAddress[tokenName] = tokenAddress;
            }

            _isLoaded = true;
            console.log("USDC pair addresses loaded successfully");
        } catch Error(string memory reason) {
            console.log("Failed to load USDC addresses from JSON:", reason);
            revert("Failed to load USDC pair addresses from JSON");
        } catch {
            console.log("Failed to load USDC addresses from JSON: Unknown error");
            revert("Failed to load USDC pair addresses from JSON");
        }
    }

    /**
     * @dev External function to read USDC pairs from JSON
     * This needs to be external to be callable with try/catch
     */
    function readUSDCPairsFromJSON() external view returns (TokenPair[] memory) {
        // Read the JSON file
        string memory jsonFile = vm.readFile("config/usdc_pairs_clean.json");

        // Get the total count first
        uint256 totalCount = jsonFile.readUint(".totalCount");

        // Create array to store pairs
        TokenPair[] memory pairs = new TokenPair[](totalCount);

        // Read each pair individually
        for (uint256 i = 0; i < totalCount; i++) {
            string memory basePath = string.concat(".pairs[", vm.toString(i), "]");
            pairs[i].name = jsonFile.readString(string.concat(basePath, ".name"));
            pairs[i].addr = jsonFile.readAddress(string.concat(basePath, ".address"));
        }

        return pairs;
    }

    // ===== GETTER FUNCTIONS =====

    /**
     * @dev Get all USDC pair addresses
     * @return Array of all token addresses that form pairs with USDC
     */
    function getUSDCPairAddresses() external view returns (address[] memory) {
        require(_isLoaded, "Addresses not loaded. Call loadUSDCPairAddresses() first");
        return _usdcPairAddresses;
    }

    /**
     * @dev Get the number of USDC pair addresses
     * @return Number of token addresses loaded
     */
    function getUSDCPairAddressesCount() external view returns (uint256) {
        require(_isLoaded, "Addresses not loaded. Call loadUSDCPairAddresses() first");
        return _usdcPairAddresses.length;
    }

    /**
     * @dev Get USDC pair address at specific index
     * @param index Index of the address to retrieve
     * @return Token address at the specified index
     */
    function getUSDCPairAddressAt(uint256 index) external view returns (address) {
        require(_isLoaded, "Addresses not loaded. Call loadUSDCPairAddresses() first");
        require(index < _usdcPairAddresses.length, "Index out of bounds");
        return _usdcPairAddresses[index];
    }

    /**
     * @dev Check if an address is a USDC pair token
     * @param tokenAddress Address to check
     * @return True if the address is in the USDC pairs list
     */
    function isUSDCPairAddress(address tokenAddress) external view returns (bool) {
        require(_isLoaded, "Addresses not loaded. Call loadUSDCPairAddresses() first");

        for (uint256 i = 0; i < _usdcPairAddresses.length; i++) {
            if (_usdcPairAddresses[i] == tokenAddress) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Find the index of a USDC pair address
     * @param tokenAddress Address to find
     * @return found True if address was found
     * @return index Index of the address (0 if not found)
     */
    function findUSDCPairAddressIndex(address tokenAddress) external view returns (bool found, uint256 index) {
        require(_isLoaded, "Addresses not loaded. Call loadUSDCPairAddresses() first");

        for (uint256 i = 0; i < _usdcPairAddresses.length; i++) {
            if (_usdcPairAddresses[i] == tokenAddress) {
                return (true, i);
            }
        }
        return (false, 0);
    }

    /**
     * @dev Get token name by address
     * @param tokenAddress Address of the token
     * @return Token name
     */
    function getTokenName(address tokenAddress) external view returns (string memory) {
        require(_isLoaded, "Addresses not loaded. Call loadUSDCPairAddresses() first");
        return _tokenNames[tokenAddress];
    }

    /**
     * @dev Get token address by name
     * @param tokenName Name of the token
     * @return Token address
     */
    function getTokenAddress(string calldata tokenName) external view returns (address) {
        require(_isLoaded, "Addresses not loaded. Call loadUSDCPairAddresses() first");
        return _nameToAddress[tokenName];
    }

    /**
     * @dev Check if addresses are loaded
     * @return True if addresses have been loaded from JSON
     */
    function isLoaded() external view returns (bool) {
        return _isLoaded;
    }

    // ===== UTILITY FUNCTIONS =====

    /**
     * @dev Get addresses by token names
     * @param tokenNames Array of token names to look up
     * @return addresses Array of corresponding addresses
     */
    function getAddressesByNames(string[] calldata tokenNames) external view returns (address[] memory addresses) {
        require(_isLoaded, "Addresses not loaded. Call loadUSDCPairAddresses() first");

        addresses = new address[](tokenNames.length);
        for (uint256 i = 0; i < tokenNames.length; i++) {
            addresses[i] = _nameToAddress[tokenNames[i]];
        }
        return addresses;
    }

    /**
     * @dev Get a subset of addresses by indices
     * @param indices Array of indices to retrieve
     * @return addresses Array of addresses at specified indices
     */
    function getAddressesByIndices(uint256[] calldata indices) external view returns (address[] memory addresses) {
        require(_isLoaded, "Addresses not loaded. Call loadUSDCPairAddresses() first");

        addresses = new address[](indices.length);
        for (uint256 i = 0; i < indices.length; i++) {
            require(indices[i] < _usdcPairAddresses.length, "Index out of bounds");
            addresses[i] = _usdcPairAddresses[indices[i]];
        }
        return addresses;
    }

    /**
     * @dev Get first N addresses
     * @param count Number of addresses to retrieve
     * @return addresses Array of first N addresses
     */
    function getFirstNAddresses(uint256 count) external view returns (address[] memory addresses) {
        require(_isLoaded, "Addresses not loaded. Call loadUSDCPairAddresses() first");
        require(count <= _usdcPairAddresses.length, "Count exceeds available addresses");

        addresses = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            addresses[i] = _usdcPairAddresses[i];
        }
        return addresses;
    }

    // ===== INFO FUNCTIONS =====

    /**
     * @dev Get summary information about loaded addresses
     * @return totalCount Total number of addresses loaded
     * @return isDataLoaded Whether data has been loaded
     */
    function getSummary() external view returns (uint256 totalCount, bool isDataLoaded) {
        return (_usdcPairAddresses.length, _isLoaded);
    }

    /**
     * @dev Print all loaded addresses for debugging
     */
    function printAllAddresses() external view {
        require(_isLoaded, "Addresses not loaded. Call loadUSDCPairAddresses() first");

        console.log("=== USDC PAIR ADDRESSES ===");
        console.log("Total addresses:", _usdcPairAddresses.length);

        for (uint256 i = 0; i < _usdcPairAddresses.length; i++) {
            console.log("Index", i);
            console.log("  Name:", _tokenNames[_usdcPairAddresses[i]]);
            console.log("  Address:", _usdcPairAddresses[i]);
        }
    }
}
