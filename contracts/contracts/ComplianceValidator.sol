// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IdentityRegistry} from "./IdentityRegistry.sol";

contract ComplianceValidator {
    IdentityRegistry public immutable registry;

    constructor(address identityRegistryAddress) {
        require(identityRegistryAddress != address(0), "zero registry");
        registry = IdentityRegistry(identityRegistryAddress);
    }

    function canTransfer(address from, address to, uint256 amount) external view returns (bool) {
        return amount > 0 && registry.isVerified(from) && registry.isVerified(to);
    }

    function canReceive(address to) external view returns (bool) { return registry.isVerified(to); }
}
