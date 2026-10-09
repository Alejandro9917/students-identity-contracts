import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";
import { polygon, polygonAmoy } from "viem/chains";

export const localChain = defineChain({ id: 31337, name: "Hardhat Localhost", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_LOCAL_RPC_URL ?? "http://127.0.0.1:8545"] } } });
export const config = createConfig({ chains: [localChain, polygonAmoy, polygon], connectors: [injected()], transports: { [localChain.id]: http(process.env.NEXT_PUBLIC_LOCAL_RPC_URL), [polygonAmoy.id]: http(process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC_URL), [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL) } });
