import { formatUnits, parseUnits } from "viem";
export const tokenAmount = (value: string) => parseUnits(value || "0", 18);
export const displayAmount = (value: bigint) => formatUnits(value, 18);
