import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const polygonAccounts = [
  process.env.PRIVATE_KEY,
  process.env.IDENTITY_PROVIDER_PRIVATE_KEY,
  process.env.CUSTODIAN_PRIVATE_KEY,
  process.env.ALICE_PRIVATE_KEY,
  process.env.BOB_PRIVATE_KEY
].filter((key): key is string => Boolean(key));

export default {
  solidity: "0.8.24",
  networks: {
    hardhat: { chainId: 31337 },
    localhost: { url: process.env.RPC_URL ?? "http://127.0.0.1:8545", chainId: 31337 },
    polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC_URL ?? "https://rpc-amoy.polygon.technology/",
      chainId: 80002,
      accounts: polygonAccounts
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL ?? "https://polygon-rpc.com",
      chainId: 137,
      accounts: polygonAccounts
    }
  }
};
