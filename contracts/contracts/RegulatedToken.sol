// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ComplianceValidator} from "./ComplianceValidator.sol";

contract RegulatedToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant CUSTODIAN_ROLE = keccak256("CUSTODIAN_ROLE");
    address private immutable _identityRegistry;
    address private immutable _complianceValidator;

    event CustodianTransfer(address indexed custodian, address indexed from, address indexed to, uint256 amount);

    constructor(string memory name_, string memory symbol_, address identityRegistry_, address complianceValidator_)
        ERC20(name_, symbol_)
    {
        require(identityRegistry_ != address(0) && complianceValidator_ != address(0), "zero dependency");
        _identityRegistry = identityRegistry_;
        _complianceValidator = complianceValidator_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(ComplianceValidator(_complianceValidator).canReceive(to), "recipient is not verified");
        _mint(to, amount);
    }

    function custodianTransfer(address from, address to, uint256 amount) external onlyRole(CUSTODIAN_ROLE) {
        _transfer(from, to, amount);
        emit CustodianTransfer(msg.sender, from, to, amount);
    }

    function identityRegistry() external view returns (address) { return _identityRegistry; }
    function complianceValidator() external view returns (address) { return _complianceValidator; }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            require(ComplianceValidator(_complianceValidator).canTransfer(from, to, value), "transfer not compliant");
        }
        super._update(from, to, value);
    }
}
