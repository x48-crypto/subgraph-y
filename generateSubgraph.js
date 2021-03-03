const fetch = require("node-fetch");
const delay = require("delay");
const fs = require("fs");
const { promisify } = require("util");
const url = "https://vaults.finance/all";
const writeFileAsync = promisify(fs.writeFile);

const header = `
specVersion: 0.0.2
schema:
  file: ./schema.graphql
dataSources:`;

// const startBlock = 10604000;
const startBlock = 0;

const generateV1Source = (vault) => `
  - kind: ethereum/contract
    name: ${vault.name}
    network: mainnet
    source:
      address: "${vault.address}"
      abi: V1Contract
      startBlock: ${startBlock}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.4
      language: wasm/assemblyscript
      entities:
        - Vault
        - Deposit
        - Withdraw
        - Transfer
      abis:
        - name: V1Contract
          file: ./abis/V1Contract.json
        - name: erc20Contract
          file: ./abis/erc20Contract.json
      eventHandlers:
        - event: Transfer(indexed address,indexed address,uint256)
          handler: handleTransferV1
      file: ./src/v1.ts`;

const generateV2Source = (vault) => `
  - kind: ethereum/contract
    name: ${vault.name} v2
    network: mainnet
    source:
      address: "${vault.address}"
      abi: V2Contract
      startBlock: ${startBlock}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.4
      language: wasm/assemblyscript
      entities:
        - Vault
        - Deposit
        - Withdraw
        - Transfer
      abis:
        - name: V2Contract
          file: ./abis/V2Contract.json
        - name: erc20Contract
          file: ./abis/erc20Contract.json
      eventHandlers:
        - event: Transfer(indexed address,indexed address,uint256)
          handler: handleTransferV2
      file: ./src/v2.ts`;

const generateSubgraph = async () => {
  let vaults = await fetch(url).then((res) => res.json());
  const excludeVaults = [
    "0x881b06da56BB5675c54E4Ed311c21E54C5025298", // LINK
    "0x29E240CFD7946BA20895a7a02eDb25C210f9f324", // aLINK
    "0xc5bDdf9843308380375a611c18B50Fb9341f502A", // veCRV-DAO
  ];
  vaults = vaults.filter((vault) => excludeVaults.indexOf(vault.address) == -1);
  vaults = vaults.filter((vault) => vault.endorsed);

  let v1Vaults = vaults.filter((vault) => vault.type === "v1");
  let v2Vaults = vaults.filter((vault) => vault.type === "v2");

  const v1VaultSources = v1Vaults.map(generateV1Source).join("");
  const v2VaultSources = v2Vaults.map(generateV2Source).join("");

  let data = header;
  data += v1VaultSources;
  data += "\n";
  data += v2VaultSources;
  const fileName = "./subgraph.yaml";
  fs.writeFileSync(fileName, data, "utf-8");
};

generateSubgraph();
