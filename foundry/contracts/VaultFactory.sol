// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import {Vault} from "./Vault.sol";

contract VaultFactory is ERC2771Context {
    event VaultCreated(
        address indexed creator,
        address vault,
        address indexed asset,
        bool isNative,
        uint256 goal,
        string name
    );

    mapping(address => address[]) private _creatorVaults;
    address[] private _allVaults;

    address public immutable forwarder;

    constructor(address _forwarder) ERC2771Context(_forwarder) {
        require(_forwarder != address(0), "forwarder=0");
        forwarder = _forwarder;
    }

    function createVaultERC20(IERC20 asset, uint256 goal, string calldata name)
        external
        returns (address vault)
    {
        address creator = _msgSender();
        vault = address(new Vault(creator, asset, false, goal, name, forwarder));
        _creatorVaults[creator].push(vault);
        _allVaults.push(vault);
        emit VaultCreated(creator, vault, address(asset), false, goal, name);
    }

    function createVaultNative(uint256 goal, string calldata name)
        external
        returns (address vault)
    {
        address creator = _msgSender();
        vault = address(new Vault(creator, IERC20(address(0)), true, goal, name, forwarder));
        _creatorVaults[creator].push(vault);
        _allVaults.push(vault);
        emit VaultCreated(creator, vault, address(0), true, goal, name);
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

    // Required overrides (explicit)
    function _msgSender() internal view override returns (address s) {
        return ERC2771Context._msgSender();
    }
    function _msgData() internal view override returns (bytes calldata d) {
        return ERC2771Context._msgData();
    }
}
