import '@nomiclabs/hardhat-waffle';
import '@solidstate/hardhat-4byte-uploader';
import '@typechain/hardhat';
import fs from 'fs';
// import 'hardhat-abi-exporter';
import 'hardhat-contract-sizer';
import 'hardhat-gas-reporter';
// import 'hardhat-spdx-license-identifier';
import { task } from 'hardhat/config';
import path from 'path';
import 'solidity-coverage';
import * as dotenv from 'dotenv'
import "@nomicfoundation/hardhat-toolbox";
dotenv.config();

export default {
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks:{
    rinkeby:{
      url: process.env.RINKEBY_URL? process.env.RINKEBY_URL : '',
      accounts: [process.env.KOBOLD_DEPLOYER_PRIVATE_KEY? process.env.KOBOLD_DEPLOYER_PRIVATE_KEY : ''],
    },
    goerli:{
      url: process.env.GOERLI_URL? process.env.GOERLI_URL : '',
      accounts: [process.env.PRIVATE_KEY? process.env.PRIVATE_KEY : ''],
    },
    mainnet:{
      url: process.env.MAINNET_URL? process.env.MAINNET_URL : '',
      accounts: [process.env.KOBOLD_DEPLOYER_PRIVATE_KEY? process.env.KOBOLD_DEPLOYER_PRIVATE_KEY : ''],
    }
  },
  etherscan:{
    apiKey: process.env.ETHERSCAN_API_KEY? process.env.ETHERSCAN_API_KEY : ''
  },

  abiExporter: {
    runOnCompile: true,
    clear: true,
    flat: true,
    except: ['.*Mock$'],
  },

  

  gasReporter: {
    enabled: true,
  },

  spdxLicenseIdentifier: {
    overwrite: false,
    runOnCompile: true,
  },

  typechain: {
    alwaysGenerateOverloads: true,
  },
};