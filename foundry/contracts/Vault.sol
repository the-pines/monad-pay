// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ERC2771Context } from "@openzeppelin/contracts/metatx/ERC2771Context.sol";

interface IERC20Permit {
    function permit(
        address owner, address spender, uint256 value,
        uint256 deadline, uint8 v, bytes32 r, bytes32 s
    ) external;
}

/**
 * @title Vault
 * @notice Holds either ONE ERC20 or native MON. Meta-tx aware via ERC2771.
 */
contract Vault is ReentrancyGuard, ERC2771Context {
    using SafeERC20 for IERC20;

    address public immutable creator;
    IERC20  public immutable asset;      
    bool    public immutable isNative;   
    uint256 public immutable goal;      
    string  public name;

    // State
    bool public isWithdrawn;

    // Events
    event Deposited(address indexed from, uint256 amount, uint256 newBalance, bool isNative);
    event GoalReached(uint256 timestamp, uint256 balance);
    event Withdrawn(address indexed to, uint256 amount, bool isNative);

    // Errors
    error NotCreator();
    error GoalNotReached();
    error AlreadyWithdrawn();
    error InvalidParam();
    error ZeroAmount();
    error WrongAsset();

    constructor(
        address _creator,
        IERC20 _asset,           
        bool _isNative,
        uint256 _goal,
        string memory _name,
        address trustedForwarder
    ) ERC2771Context(trustedForwarder) {
        if (_creator == address(0) || _goal == 0) revert InvalidParam();
        if (_isNative) {
            if (address(_asset) != address(0)) revert InvalidParam();
        } else {
            if (address(_asset) == address(0)) revert InvalidParam();
        }
        creator = _creator;
        asset = _asset;
        isNative = _isNative;
        goal = _goal;
        name = _name;
    }

    // Views
    function assetBalance() public view returns (uint256) {
        return isNative ? address(this).balance : asset.balanceOf(address(this));
    }

    function canWithdraw() public view returns (bool) {
        return !isWithdrawn && assetBalance() >= goal;
    }


    /// @notice Contribute ERC20 (only for ERC20 vaults). Caller must have approved OR use permit helper.
    function contribute(uint256 amount) external nonReentrant {
        if (isNative) revert WrongAsset();
        if (amount == 0) revert ZeroAmount();
        asset.safeTransferFrom(_msgSender(), address(this), amount);
        uint256 bal = asset.balanceOf(address(this));
        emit Deposited(_msgSender(), amount, bal, false);
        if (!isWithdrawn && bal >= goal) emit GoalReached(block.timestamp, bal);
    }

    /// @notice Contribute ERC20 using EIP-2612 permit in the same (meta-)tx.
    function contributeWithPermit(
        uint256 amount,
        uint256 deadline,
        uint8 v, bytes32 r, bytes32 s
    ) external nonReentrant {
        if (isNative) revert WrongAsset();
        if (amount == 0) revert ZeroAmount();
        IERC20Permit(address(asset)).permit(_msgSender(), address(this), amount, deadline, v, r, s);
        asset.safeTransferFrom(_msgSender(), address(this), amount);
        uint256 bal = asset.balanceOf(address(this));
        emit Deposited(_msgSender(), amount, bal, false);
        if (!isWithdrawn && bal >= goal) emit GoalReached(block.timestamp, bal);
    }

    /// @notice Contribute native MON via explicit function (use this for meta-tx).
    function contributeNative() external payable nonReentrant {
        if (!isNative) revert WrongAsset();
        if (msg.value == 0) revert ZeroAmount();
        uint256 bal = address(this).balance;
        emit Deposited(_msgSender(), msg.value, bal, true);
        if (!isWithdrawn && bal >= goal) emit GoalReached(block.timestamp, bal);
    }

    /// @notice Bare receives are allowed for normal EOAs only (not via forwarder).
    receive() external payable {
        if (!isNative) revert WrongAsset();
        // If this comes via a forwarder, calldata will be non-empty → it would hit fallback (not defined) and revert.
        // Normal EOAs (no calldata) hit receive() and are accepted:
        if (msg.value == 0) revert ZeroAmount();
        uint256 bal = address(this).balance;
        emit Deposited(msg.sender, msg.value, bal, true); // raw sender for direct sends
        if (!isWithdrawn && bal >= goal) emit GoalReached(block.timestamp, bal);
    }


    function withdraw() external nonReentrant {
        if (_msgSender() != creator) revert NotCreator();
        if (isWithdrawn) revert AlreadyWithdrawn();

        uint256 bal = assetBalance();
        if (bal < goal) revert GoalNotReached();

        isWithdrawn = true;

        if (isNative) {
            (bool ok, ) = payable(creator).call{value: bal}("");
            require(ok, "native transfer failed");
            emit Withdrawn(creator, bal, true);
        } else {
            asset.safeTransfer(creator, bal);
            emit Withdrawn(creator, bal, false);
        }
    }

    function _msgSender() internal view override returns (address s) {
        return ERC2771Context._msgSender();
    }
    function _msgData() internal view override returns (bytes calldata d) {
        return ERC2771Context._msgData();
    }
}
