// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract IdentityRegistry is AccessControl {
    bytes32 public constant IDENTITY_PROVIDER_ROLE = keccak256("IDENTITY_PROVIDER_ROLE");

    struct Identity { bytes32 identityId; bool registered; bool verified; }

    mapping(address => Identity) private identities;
    mapping(bytes32 => address) private identityOwners;
    address[] private registeredWallets;
    mapping(address => uint256) private registeredWalletIndexes;

    event IdentityRegistered(address indexed wallet, bytes32 indexed identityId);
    event IdentityVerificationUpdated(address indexed wallet, bool verified);
    event IdentityRevoked(address indexed wallet);

    constructor(address admin, address identityProvider) {
        require(admin != address(0) && identityProvider != address(0), "zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(IDENTITY_PROVIDER_ROLE, identityProvider);
    }

    function registerIdentity(address wallet, bytes32 identityId) external onlyRole(IDENTITY_PROVIDER_ROLE) {
        require(wallet != address(0), "zero wallet");
        require(identityId != bytes32(0), "zero identity id");
        require(!identities[wallet].registered, "wallet already registered");
        require(identityOwners[identityId] == address(0), "identity id already used");
        identities[wallet] = Identity(identityId, true, false);
        identityOwners[identityId] = wallet;
        registeredWallets.push(wallet);
        registeredWalletIndexes[wallet] = registeredWallets.length;
        emit IdentityRegistered(wallet, identityId);
    }

    function setVerified(address wallet, bool verified) external onlyRole(IDENTITY_PROVIDER_ROLE) {
        require(identities[wallet].registered, "identity not registered");
        identities[wallet].verified = verified;
        emit IdentityVerificationUpdated(wallet, verified);
    }

    function revokeIdentity(address wallet) external onlyRole(IDENTITY_PROVIDER_ROLE) {
        require(identities[wallet].registered, "identity not registered");
        bytes32 id = identities[wallet].identityId;
        delete identityOwners[id];
        delete identities[wallet];
        uint256 index = registeredWalletIndexes[wallet] - 1;
        uint256 lastIndex = registeredWallets.length - 1;
        if (index != lastIndex) {
            address lastWallet = registeredWallets[lastIndex];
            registeredWallets[index] = lastWallet;
            registeredWalletIndexes[lastWallet] = index + 1;
        }
        registeredWallets.pop();
        delete registeredWalletIndexes[wallet];
        emit IdentityRevoked(wallet);
    }

    function isVerified(address wallet) external view returns (bool) { return identities[wallet].registered && identities[wallet].verified; }
    function getIdentity(address wallet) external view returns (Identity memory) { return identities[wallet]; }
    function getRegisteredIdentities() external view returns (address[] memory wallets, Identity[] memory records) {
        wallets = registeredWallets;
        records = new Identity[](wallets.length);
        for (uint256 i = 0; i < wallets.length; i++) records[i] = identities[wallets[i]];
    }
}
