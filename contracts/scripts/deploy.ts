import { ethers, artifacts, network } from "hardhat";
import fs from "node:fs/promises";
import path from "node:path";

async function main() {
  const [deployer, identityProvider, custodian, alice, bob] = await ethers.getSigners();
  if (!deployer || !identityProvider || !custodian || !alice || !bob) {
    throw new Error("Este despliegue requiere cinco cuentas: PRIVATE_KEY, IDENTITY_PROVIDER_PRIVATE_KEY, CUSTODIAN_PRIVATE_KEY, ALICE_PRIVATE_KEY y BOB_PRIVATE_KEY.");
  }
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  if (network.name !== "hardhat" && network.name !== "localhost" && chainId !== 31337) {
    console.warn("ADVERTENCIA: estás desplegando en una red externa. Verifica RPC, cuentas y fondos antes de confirmar.");
  }
  const Registry = await ethers.getContractFactory("IdentityRegistry");
  const registry = await Registry.deploy(deployer.address, identityProvider.address);
  await registry.waitForDeployment();

  const Validator = await ethers.getContractFactory("ComplianceValidator");
  const validator = await Validator.deploy(await registry.getAddress());
  await validator.waitForDeployment();

  const Token = await ethers.getContractFactory("RegulatedToken");
  const token = await Token.deploy("Academic Regulated Token", "ART", await registry.getAddress(), await validator.getAddress());
  await token.waitForDeployment();

  await (await token.grantRole(await token.MINTER_ROLE(), deployer.address)).wait();
  await (await token.grantRole(await token.CUSTODIAN_ROLE(), custodian.address)).wait();
  await (await registry.connect(identityProvider).registerIdentity(alice.address, ethers.id("alice"))).wait();
  await (await registry.connect(identityProvider).setVerified(alice.address, true)).wait();
  await (await registry.connect(identityProvider).registerIdentity(bob.address, ethers.id("bob"))).wait();
  await (await token.mint(alice.address, ethers.parseUnits("100", 18))).wait();

  const [identityAbi, validatorAbi, tokenAbi] = await Promise.all([
    artifacts.readArtifact("IdentityRegistry"),
    artifacts.readArtifact("ComplianceValidator"),
    artifacts.readArtifact("RegulatedToken")
  ]);
  const output = {
    chainId,
    contracts: {
      identityRegistry: { address: await registry.getAddress(), abi: identityAbi.abi },
      complianceValidator: { address: await validator.getAddress(), abi: validatorAbi.abi },
      regulatedToken: { address: await token.getAddress(), abi: tokenAbi.abi }
    },
    demoAccounts: { identityProvider: identityProvider.address, custodian: custodian.address, alice: alice.address, bob: bob.address }
  };
  const target = path.resolve(__dirname, "../../frontend/src/generated/contracts.json");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(output, null, 2) + "\n");
  console.log("\n=== Local deployment ===");
  console.log(`Network: ${network.name} (chainId ${output.chainId})`);
  console.log(`IdentityRegistry: ${output.contracts.identityRegistry.address}`);
  console.log(`ComplianceValidator: ${output.contracts.complianceValidator.address}`);
  console.log(`RegulatedToken: ${output.contracts.regulatedToken.address}`);
  console.log("\n=== Demo accounts ===");
  console.log(`Identity provider: ${output.demoAccounts.identityProvider}`);
  console.log(`Custodian: ${output.demoAccounts.custodian}`);
  console.log(`Alice: ${output.demoAccounts.alice}`);
  console.log(`Bob: ${output.demoAccounts.bob}`);
  console.log(`\nGenerated frontend configuration: ${target}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
