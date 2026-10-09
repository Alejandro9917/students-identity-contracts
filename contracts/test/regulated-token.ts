import { expect } from "chai";
import { ethers } from "hardhat";

describe("RegulatedToken", function () {
  async function fixture() {
    const [admin, provider, custodian, alice, bob, outsider] = await ethers.getSigners();
    const registry = await (await ethers.getContractFactory("IdentityRegistry")).deploy(admin.address, provider.address);
    const validator = await (await ethers.getContractFactory("ComplianceValidator")).deploy(await registry.getAddress());
    const token = await (await ethers.getContractFactory("RegulatedToken")).deploy("Token", "TKN", await registry.getAddress(), await validator.getAddress());
    await token.grantRole(await token.MINTER_ROLE(), admin.address);
    await token.grantRole(await token.CUSTODIAN_ROLE(), custodian.address);
    await registry.connect(provider).registerIdentity(alice.address, ethers.id("alice"));
    await registry.connect(provider).setVerified(alice.address, true);
    await registry.connect(provider).registerIdentity(bob.address, ethers.id("bob"));
    await token.mint(alice.address, 100n);
    return { admin, provider, custodian, alice, bob, outsider, registry, token };
  }

  it("rejects minting to an unverified wallet", async () => {
    const { token, bob, outsider } = await fixture();
    await expect(token.mint(bob.address, 1)).to.be.revertedWith("recipient is not verified");
    await expect(token.mint(outsider.address, 1)).to.be.revertedWith("recipient is not verified");
  });
  it("rejects transfer to Bob until he is verified, then updates balances", async () => {
    const { token, provider, registry, alice, bob } = await fixture();
    await expect(token.connect(alice).transfer(bob.address, 10)).to.be.revertedWith("transfer not compliant");
    await registry.connect(provider).setVerified(bob.address, true);
    await expect(token.connect(alice).transfer(bob.address, 10)).not.to.be.reverted;
    expect(await token.balanceOf(alice.address)).to.equal(90);
    expect(await token.balanceOf(bob.address)).to.equal(10);
  });
  it("restricts provider, minter, and custodian roles", async () => {
    const { token, registry, outsider, bob, alice } = await fixture();
    await expect(registry.connect(outsider).setVerified(bob.address, true)).to.be.reverted;
    await expect(token.connect(outsider).mint(alice.address, 1)).to.be.reverted;
    await expect(token.connect(outsider).custodianTransfer(alice.address, bob.address, 1)).to.be.reverted;
  });
  it("allows a custodian transfer only between verified identities", async () => {
    const { token, provider, custodian, alice, bob, registry } = await fixture();
    await registry.connect(provider).setVerified(bob.address, true);
    await expect(token.connect(custodian).custodianTransfer(alice.address, bob.address, 25)).not.to.be.reverted;
    await registry.connect(provider).revokeIdentity(bob.address);
    await expect(token.connect(custodian).custodianTransfer(alice.address, bob.address, 1)).to.be.revertedWith("transfer not compliant");
  });
});
