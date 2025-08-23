// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import {PointsToken} from "contracts/PointsToken.sol";
import {AdminMinterLeaderboard} from "contracts/AdminMinterLeaderboard.sol";

contract DeployPointsAndAdminScript is Script {
    function run()
        external
        returns (PointsToken token, AdminMinterLeaderboard aml)
    {
        vm.startBroadcast(); // or vm.startBroadcast(PRIVATE_KEY) overload

        // Make the *broadcasting EOA* (tx.origin) the temporary minter
        token = new PointsToken(tx.origin);

        // Deploy AML wired to token
        aml = new AdminMinterLeaderboard(address(token));

        vm.stopBroadcast();
    }
}
