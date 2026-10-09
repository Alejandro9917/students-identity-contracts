# Regulated Token DApp

Demostración académica de un ERC-20 cuyas transferencias requieren identidad verificada. No almacena datos personales en cadena y no depende de una red pública.

## Uso local

```bash
npm install
npm run compile
npm run test
```

En una terminal:

```bash
npm run chain
```

En otra terminal:

```bash
npm run deploy:local
npm run dev
```

Importa en MetaMask una cuenta de prueba que muestre Hardhat y configura `http://127.0.0.1:8545`, chain ID `31337`. El despliegue genera `frontend/src/generated/contracts.json` con las direcciones y ABI del último despliegue exitoso.

## Polygon

La configuración incluye Polygon Amoy (testnet, chain ID `80002`) y Polygon Mainnet (chain ID `137`). Para desplegar en Amoy, copia `contracts/.env.example` a `contracts/.env`, completa cinco claves de desarrollo separadas y ejecuta:

```bash
npx hardhat run scripts/deploy.ts --network polygonAmoy
```

Usa fondos de prueba POL en Amoy. Para Mainnet configura `POLYGON_RPC_URL`, usa cuentas seguras y ejecuta el mismo comando con `--network polygon`; Mainnet requiere POL real para gas. La dApp detecta el `chainId` generado y advierte si MetaMask está en otra red.

La dApp distingue la transferencia normal de la transferencia por custodia y muestra hashes, confirmaciones y errores de revert. Los formularios administrativos requieren que la wallet conectada tenga `IDENTITY_PROVIDER_ROLE`; emisión requiere `MINTER_ROLE` y custodia `CUSTODIAN_ROLE`.
