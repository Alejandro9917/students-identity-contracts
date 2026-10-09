# DApp de token regulado con identidad verificable

## Rol del agente

Actúa como un agente de desarrollo full stack. Inicializa y completa un monorepo funcional para una demostración académica de contratos inteligentes. No desarrolles una implementación completa de T-REX o ERC-3643: construye una versión reducida y legible que evidencie cómo un token puede restringir transferencias con base en una identidad verificada.

El resultado debe poder ejecutarse localmente, sin depender de una red pública ni de credenciales reales. No almacenes nombres, documentos de identidad, correos ni datos KYC en la blockchain.

## Objetivo funcional

Construir una aplicación con dos modos de transferir un token ERC-20:

1. **Transferencia del titular:** el dueño ejecuta `transfer` o autoriza a un tercero mediante `approve` y `transferFrom`.
2. **Transferencia por custodia:** una cuenta con el rol de custodio ejecuta `custodianTransfer` sin requerir una aprobación previa del titular.

En ambos modos, la transferencia debe fallar cuando el origen o el destino no tenga una identidad verificada. La emisión también debe fallar cuando el destinatario no esté verificado.

## Estructura obligatoria

```text
regulated-token-dapp/
├── package.json
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── src/generated/contracts.json
│   ├── .env.local.example
│   └── package.json
└── contracts/
    ├── contracts/
    │   ├── IdentityRegistry.sol
    │   ├── ComplianceValidator.sol
    │   └── RegulatedToken.sol
    ├── scripts/deploy.ts
    ├── test/
    ├── hardhat.config.ts
    ├── .env.example
    └── package.json
```

Usa `npm` workspaces desde la raíz. La carpeta `frontend` debe contener únicamente la dApp Next.js y `contracts` el proyecto Hardhat con Solidity, scripts y pruebas.

## Tecnologías requeridas

- Node.js LTS y npm.
- Next.js con TypeScript y App Router.
- `viem` y `wagmi` para conectar la wallet y ejecutar lecturas/escrituras de contratos desde la dApp.
- Hardhat, TypeScript, `ethers` y OpenZeppelin Contracts para los contratos, pruebas y despliegue local.
- Una wallet de navegador compatible con EIP-1193, como MetaMask.
- Red local de Hardhat con `chainId` `31337`.

Instala versiones entre sí compatibles; no fijes versiones obsoletas sin verificar su compatibilidad con la versión actual de Hardhat y Next.js.

## Inicialización

Desde una carpeta vacía, crea el monorepo y los dos proyectos:

```bash
mkdir regulated-token-dapp
cd regulated-token-dapp
npm init -y
npm pkg set private=true
npm pkg set workspaces[0]=frontend
npm pkg set workspaces[1]=contracts

npx create-next-app@latest frontend --typescript --eslint --app --src-dir --use-npm
mkdir contracts
cd contracts
npm init -y
```

Configura Hardhat en `contracts` con TypeScript y agrega las dependencias necesarias para compilar, probar y desplegar contratos con `ethers`. Instala OpenZeppelin Contracts para reutilizar `ERC20` y `AccessControl`.

En la raíz agrega estos scripts, ajustando los comandos internos según las versiones compatibles instaladas:

```json
{
  "scripts": {
    "dev": "npm run dev --workspace frontend",
    "chain": "npm run node --workspace contracts",
    "compile": "npm run compile --workspace contracts",
    "test": "npm run test --workspace contracts",
    "deploy:local": "npm run deploy:local --workspace contracts"
  }
}
```

## Diseño de contratos

Implementa exactamente tres contratos de aplicación. No agregues contratos de claims, emisores confiables, temas de claims, proxies, fábricas ni módulos de cumplimiento avanzados.

### 1. `IdentityRegistry.sol`

Responsabilidad: representar un proveedor de identidad simplificado.

Debe usar `AccessControl` y declarar el rol `IDENTITY_PROVIDER_ROLE`. El administrador inicial puede otorgar o revocar ese rol, pero ninguna wallet común puede verificar su propia identidad.

Guarda únicamente un identificador opaco y el estado de cada wallet:

```solidity
struct Identity {
    bytes32 identityId;
    bool registered;
    bool verified;
}
```

Implementa, como mínimo, estas funciones y eventos:

```solidity
function registerIdentity(address wallet, bytes32 identityId) external;
function setVerified(address wallet, bool verified) external;
function revokeIdentity(address wallet) external;
function isVerified(address wallet) external view returns (bool);
function getIdentity(address wallet) external view returns (Identity memory);

event IdentityRegistered(address indexed wallet, bytes32 indexed identityId);
event IdentityVerificationUpdated(address indexed wallet, bool verified);
event IdentityRevoked(address indexed wallet);
```

Reglas:

- `registerIdentity`, `setVerified` y `revokeIdentity` requieren `IDENTITY_PROVIDER_ROLE`.
- Rechaza wallets nulas e `identityId` nulos.
- No permitas que el mismo `identityId` se registre para dos wallets.
- `revokeIdentity` debe dejar la wallet sin identidad válida y emitir su evento.

### 2. `ComplianceValidator.sol`

Responsabilidad: aislar la regla de negocio que autoriza o rechaza movimientos de tokens.

El constructor recibe la dirección de `IdentityRegistry`. Implementa:

```solidity
function canTransfer(address from, address to, uint256 amount)
    external
    view
    returns (bool);

function canReceive(address to) external view returns (bool);
```

Reglas iniciales:

- Una emisión requiere `canReceive(to) == true`.
- Una transferencia requiere que `amount > 0`, `from` esté verificado y `to` esté verificado.
- No agregues reglas de país, listas de bloqueo, límites o fechas; se discutirán como extensiones de clase.

### 3. `RegulatedToken.sol`

Responsabilidad: emitir y mover un token ERC-20 aplicando la validación de cumplimiento de forma centralizada.

Debe heredar de `ERC20` y `AccessControl`. Declara los roles:

```solidity
bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
bytes32 public constant CUSTODIAN_ROLE = keccak256("CUSTODIAN_ROLE");
```

El constructor recibe el nombre, símbolo, dirección de `IdentityRegistry` y dirección de `ComplianceValidator`. Define las siguientes funciones públicas:

```solidity
function mint(address to, uint256 amount) external;
function custodianTransfer(address from, address to, uint256 amount) external;
function identityRegistry() external view returns (address);
function complianceValidator() external view returns (address);
```

Requisitos de implementación:

- `mint` requiere `MINTER_ROLE` y solamente puede emitir a una wallet verificada.
- Conserva el comportamiento estándar de `transfer`, `approve` y `transferFrom` de ERC-20.
- Todas las transferencias entre wallets deben usar una única regla de validación. Si se usa OpenZeppelin Contracts 5, sobrescribe `_update` para validar antes de llamar a `super._update`.
- `transfer`, `transferFrom` y `custodianTransfer` deben terminar aplicando la misma llamada a `ComplianceValidator.canTransfer`.
- `custodianTransfer` requiere `CUSTODIAN_ROLE`, no consume allowance y no puede eludir la validación de identidad.
- No incluyas una función pública que permita saltarse la validación.
- Emite un evento específico para la operación de custodia:

```solidity
event CustodianTransfer(address indexed custodian, address indexed from, address indexed to, uint256 amount);
```

## Despliegue centralizado y vinculación

Crea un único script `contracts/scripts/deploy.ts`. Una sola ejecución debe realizar, en este orden:

1. Obtener las cuentas locales: `deployer`, `identityProvider`, `custodian`, `alice` y `bob`.
2. Desplegar `IdentityRegistry` con `deployer` como administrador e `identityProvider` con el rol de proveedor de identidad.
3. Desplegar `ComplianceValidator`, apuntando al `IdentityRegistry` recién creado.
4. Desplegar `RegulatedToken`, apuntando a ambos contratos anteriores.
5. Otorgar al `deployer` el rol `MINTER_ROLE` y a `custodian` el rol `CUSTODIAN_ROLE`.
6. Registrar y verificar a Alice. Registrar a Bob sin verificarlo.
7. Emitir una cantidad pequeña de tokens para Alice. La emisión debe suceder después de verificarla.
8. Crear `frontend/src/generated/contracts.json` solamente cuando todos los pasos anteriores hayan finalizado con éxito.

El archivo generado debe incluir:

```json
{
  "chainId": 31337,
  "contracts": {
    "identityRegistry": { "address": "", "abi": [] },
    "complianceValidator": { "address": "", "abi": [] },
    "regulatedToken": { "address": "", "abi": [] }
  },
  "demoAccounts": {
    "identityProvider": "",
    "custodian": "",
    "alice": "",
    "bob": ""
  }
}
```

Obtén los ABI desde los artefactos compilados de Hardhat. No copies ABI manualmente ni uses direcciones fijas. Si el archivo existe, reemplázalo para que la dApp siempre use el último despliegue local.

Agrega los scripts necesarios para ejecutar el despliegue en localhost. El comando de despliegue debe ser equivalente a:

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

## dApp en Next.js

La aplicación debe leer `src/generated/contracts.json`. Si el archivo no existe, muestra una instrucción clara para iniciar la red local y ejecutar el despliegue antes de usar la interfaz.

Implementa las siguientes secciones:

1. **Conexión de wallet:** conectar y desconectar una wallet; mostrar cuenta y red actual; advertir si no es `localhost:31337`.
2. **Estado de identidad:** consultar y mostrar si la wallet conectada está registrada y verificada.
3. **Administración de identidad:** formulario para registrar una wallet con un `identityId` y actualizar su estado de verificación. Puede mostrarse solo cuando la wallet conectada tiene el rol correspondiente; si no se implementa esa lectura, deshabilita los botones y explica el rol requerido.
4. **Emisión:** formulario para emitir tokens hacia una wallet verificada. Debe mostrar el error de revert si el destinatario no está verificado.
5. **Transferencia del titular:** formulario para ejecutar `transfer` hacia una wallet. Permite comprobar el fallo con Bob no verificado y el éxito una vez que el proveedor lo verifique.
6. **Transferencia por custodia:** formulario para que la cuenta custodio ejecute `custodianTransfer(from, to, amount)`.
7. **Resultado de transacciones:** mostrar el hash, estado pendiente, confirmación, error legible y un botón para limpiar el estado.

Usa `bigint` y las utilidades de `viem` para manejar cantidades. No uses `number` de JavaScript para saldos ni montos de tokens. Separa las configuraciones de wallet, contratos y utilidades en archivos dentro de `frontend/src/lib`.

## Variables de entorno

Crea archivos de ejemplo, nunca claves reales:

`contracts/.env.example`

```env
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=REPLACE_WITH_LOCAL_DEVELOPMENT_KEY
```

`frontend/.env.local.example`

```env
NEXT_PUBLIC_LOCAL_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=31337
```

Incluye `.env` y `.env.local` en `.gitignore`. No expongas claves privadas mediante variables `NEXT_PUBLIC_*`.

## Pruebas mínimas

Agrega pruebas automatizadas para comprobar que:

1. Una wallet sin identidad o sin verificar no puede recibir una emisión.
2. Una transferencia hacia Bob sin verificar falla.
3. Al verificar a Bob, una transferencia desde Alice tiene éxito y actualiza ambos balances.
4. Un usuario común no puede verificar identidades ni emitir tokens.
5. Un usuario común no puede ejecutar `custodianTransfer`.
6. El custodio puede ejecutar `custodianTransfer` entre dos identidades verificadas.
7. La transferencia por custodia también falla si una identidad es revocada o no está verificada.

## Ejecución local esperada

Documenta en el README del repositorio estos pasos:

```bash
npm install
npm run compile
npm run test
```

En una primera terminal:

```bash
npm run chain
```

En una segunda terminal:

```bash
npm run deploy:local
npm run dev
```

Después de desplegar, importa en MetaMask una cuenta de prueba mostrada por Hardhat y agrega la red local con RPC `http://127.0.0.1:8545` y Chain ID `31337`.

## Criterios de aceptación

Da por terminado el ejercicio únicamente cuando se cumpla todo lo siguiente:

- El proyecto tiene solamente las carpetas de aplicación `frontend` y `contracts` en la raíz.
- Los tres contratos compilan y sus pruebas pasan.
- Un único script despliega y vincula todos los contratos.
- El script genera el archivo de direcciones y ABI consumido por Next.js.
- La dApp permite conectar una wallet, consultar identidad, emitir, transferir y ejecutar transferencia por custodia.
- La dApp muestra claramente la diferencia entre una transferencia fallida por identidad no verificada y una transferencia autorizada.
- No hay datos personales ni claves privadas versionados en el repositorio.
