// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Vault} from "./Vault.sol";

/**
 * @notice Deploys vaults that hold either ERC20 OR native MON (chosen at creation).
 */
contract VaultFactory {
    event VaultCreated(
        address indexed creator,
        address vault,
        address indexed asset, // zero address when native
        bool isNative,
        uint256 goal,
        string name
    );

    mapping(address => address[]) private _creatorVaults;
    address[] private _allVaults;

    /// @notice Create an ERC20-denominated vault.
    function createVaultERC20(IERC20 asset, uint256 goal, string calldata name)
        external
        returns (address vault)
    {
        vault = address(new Vault(msg.sender, asset, false, goal, name));
        _creatorVaults[msg.sender].push(vault);
        _allVaults.push(vault);
        emit VaultCreated(msg.sender, vault, address(asset), false, goal, name);
    }

    /// @notice Create a native MON vault.
    /// @dev `goal` is in wei.
    function createVaultNative(uint256 goal, string calldata name)
        external
        returns (address vault)
    {
        vault = address(new Vault(msg.sender, IERC20(address(0)), true, goal, name));
        _creatorVaults[msg.sender].push(vault);
        _allVaults.push(vault);
        emit VaultCreated(msg.sender, vault, address(0), true, goal, name);
    }

    function getCreatorVaults(address creator) external view returns (address[] memory) {
        return _creatorVaults[creator];
    }

    function allVaultsLength() external view returns (uint256) {
        return _allVaults.length;
    }

    function allVaults(uint256 i) external view returns (address) {
        return _allVaults[i];
    }
}
