// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";

import { Vault } from "../contracts/Vault.sol";
import { VaultFactory } from "../contracts/VaultFactory.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/* ----------------------------- Mock ERC20 ----------------------------- */
contract MockToken is ERC20 {
    uint8 private immutable _decimals;
    constructor(string memory n, string memory s, uint8 d) ERC20(n, s) {
        _decimals = d;
    }
    function decimals() public view override returns (uint8) { return _decimals; }
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}

/* ------------------------------ Test Suite --------------------------- */
contract VaultTest is Test {
    VaultFactory factory;
    MockToken usdc; // 6 decimals
    address creator = address(0xC0FFEE);
    address alice   = address(0xA11CE);
    address bob     = address(0xB0B);

    function setUp() public {
        // label addresses for nicer traces
        vm.label(creator, "creator");
        vm.label(alice, "alice");
        vm.label(bob, "bob");

        // Deploy contracts
        factory = new VaultFactory();
        vm.label(address(factory), "VaultFactory");

        usdc = new MockToken("Test USD", "tUSD", 6);
        vm.label(address(usdc), "tUSD");

        // fund test users with MON for gas in native tests
        vm.deal(creator, 100 ether);
        vm.deal(alice,   100 ether);
        vm.deal(bob,     100 ether);
    }

    /* ------------------------- ERC20 vault flow ------------------------ */
    function test_CreateERC20Vault_NameAndState() public {
        string memory name_ = "Trip Fund";
        uint256 goal = 1_000_000; // 1.0 tUSD (6 decimals)

        vm.startPrank(creator);
        address vaddr = factory.createVaultERC20(IERC20(address(usdc)), goal, name_);
        vm.stopPrank();

        Vault v = Vault(payable(vaddr));
        vm.label(vaddr, "Vault(ERC20)");

        assertEq(v.creator(), creator, "creator");
        assertEq(address(v.asset()), address(usdc), "asset");
        assertEq(v.isNative(), false, "isNative");
        assertEq(v.goal(), goal, "goal");
        assertEq(v.name(), name_, "name");
        assertEq(v.assetBalance(), 0, "start bal");
        assertFalse(v.canWithdraw(), "cannot withdraw yet");
    }

    function test_ERC20_ContributeThenWithdrawAfterGoal() public {
        string memory name_ = "Laptop";
        uint256 goal = 1_000_000; // 1.0 tUSD
        vm.prank(creator);
        address vaddr = factory.createVaultERC20(IERC20(address(usdc)), goal, name_);
        Vault v = Vault(payable(vaddr));

        // Mint to contributors and approve
        MockToken(address(usdc)).mint(alice, 400_000);
        MockToken(address(usdc)).mint(bob,   600_000);

        vm.startPrank(alice);
        usdc.approve(vaddr, 400_000);
        v.contribute(400_000);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(vaddr, 600_000);
        v.contribute(600_000);
        vm.stopPrank();

        assertEq(v.assetBalance(), goal, "reached goal");
        assertTrue(v.canWithdraw(), "can withdraw");

        // Withdraw as creator
        uint256 before = usdc.balanceOf(creator);
        vm.prank(creator);
        v.withdraw();
        uint256 after_ = usdc.balanceOf(creator);
        assertEq(after_ - before, goal, "creator got funds");

        // one-shot
        vm.prank(creator);
        vm.expectRevert(Vault.AlreadyWithdrawn.selector);
        v.withdraw();
    }

    function test_ERC20_WithdrawBeforeGoal_Reverts() public {
        vm.prank(creator);
        address vaddr = factory.createVaultERC20(IERC20(address(usdc)), 1_000_000, "Goalie");
        Vault v = Vault(payable(vaddr));

        vm.prank(creator);
        vm.expectRevert(Vault.GoalNotReached.selector);
        v.withdraw();
    }

    function test_ERC20_ContributeZero_Reverts() public {
        vm.prank(creator);
        address vaddr = factory.createVaultERC20(IERC20(address(usdc)), 1_000_000, "Zero");
        Vault v = Vault(payable(vaddr));

        vm.prank(alice);
        vm.expectRevert(Vault.ZeroAmount.selector);
        v.contribute(0);
    }

    function test_OnlyCreatorCanWithdraw_ERC20() public {
        vm.prank(creator);
        address vaddr = factory.createVaultERC20(IERC20(address(usdc)), 1_000_000, "OnlyMe");
        Vault v = Vault(payable(vaddr));

        // fund to goal
        MockToken(address(usdc)).mint(alice, 1_000_000);
        vm.startPrank(alice);
        usdc.approve(vaddr, 1_000_000);
        v.contribute(1_000_000);
        vm.stopPrank();

        // bob tries
        vm.prank(bob);
        vm.expectRevert(Vault.NotCreator.selector);
        v.withdraw();

        // creator succeeds
        vm.prank(creator);
        v.withdraw();
    }

    function test_ERC20_CallContributeNative_RevertsWrongAsset() public {
        vm.prank(creator);
        address vaddr = factory.createVaultERC20(IERC20(address(usdc)), 1_000_000, "WrongAsset");
        Vault v = Vault(payable(vaddr));

        // calling payable function on an ERC20 vault should revert
        vm.prank(alice);
        vm.expectRevert(Vault.WrongAsset.selector);
        v.contributeNative{value: 1 ether}();
    }

    /* ------------------------- Native MON vault flow ------------------- */
    function test_CreateNativeVault_NameAndState() public {
        string memory name_ = "Native Fund";
        uint256 goalWei = 2 ether;

        vm.prank(creator);
        address vaddr = factory.createVaultNative(goalWei, name_);
        Vault v = Vault(payable(vaddr));

        assertEq(v.creator(), creator, "creator");
        assertEq(address(v.asset()), address(0), "asset zero");
        assertEq(v.isNative(), true, "isNative");
        assertEq(v.goal(), goalWei, "goal");
        assertEq(v.name(), name_, "name");
        assertEq(v.assetBalance(), 0, "start bal");
        assertFalse(v.canWithdraw(), "cannot withdraw yet");
    }

    function test_Native_ContributeViaFunctionAndReceive() public {
        uint256 goalWei = 3 ether;

        vm.prank(creator);
        address vaddr = factory.createVaultNative(goalWei, "MonFund");
        Vault v = Vault(payable(vaddr));

        // contributeNative()
        vm.prank(alice);
        v.contributeNative{value: 1 ether}();

        // plain transfer (receive)
        vm.prank(bob);
        (bool ok, ) = vaddr.call{value: 2 ether}("");
        assertTrue(ok, "receive failed");

        assertEq(v.assetBalance(), goalWei, "reached goal");
        assertTrue(v.canWithdraw(), "can withdraw");

        // withdraw to creator
        uint256 before = creator.balance;
        vm.prank(creator);
        v.withdraw();
        uint256 after_ = creator.balance;

        assertEq(after_ - before, goalWei, "creator got native");
    }

    function test_Native_SendERC20PathRevertsWrongAsset() public {
        uint256 goalWei = 1 ether;
        vm.prank(creator);
        address vaddr = factory.createVaultNative(goalWei, "OnlyNative");
        Vault v = Vault(payable(vaddr));

        // ERC20 contribute on native vault should revert
        MockToken(address(usdc)).mint(alice, 10);
        vm.startPrank(alice);
        usdc.approve(vaddr, 10);
        vm.expectRevert(Vault.WrongAsset.selector);
        v.contribute(10);
        vm.stopPrank();
    }

    function test_Native_WithdrawBeforeGoal_Reverts() public {
        vm.prank(creator);
        address vaddr = factory.createVaultNative(5 ether, "WIP");
        Vault v = Vault(payable(vaddr));

        vm.prank(creator);
        vm.expectRevert(Vault.GoalNotReached.selector);
        v.withdraw();
    }

    function test_OnlyCreatorCanWithdraw_Native() public {
        vm.prank(creator);
        address vaddr = factory.createVaultNative(1 ether, "OnlyMeNative");
        Vault v = Vault(payable(vaddr));

        // reach goal
        vm.prank(alice);
        v.contributeNative{value: 1 ether}();

        // bob tries
        vm.prank(bob);
        vm.expectRevert(Vault.NotCreator.selector);
        v.withdraw();

        // creator succeeds
        vm.prank(creator);
        v.withdraw();
    }
}
