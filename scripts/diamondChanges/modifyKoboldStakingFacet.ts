import * as fs from 'fs';
import { ethers } from 'hardhat';
import { KoboldStakingFacet__factory } from '../../typechain-types';
import { TitanforgeDiamond__factory } from '../../typechain-types';

const koboldStakingFunctionNames  = [
    "getSigner",
    "getKoboldAccumulatedReward",
    "nextRewardForKobold",
    "viewKoboldTotalReward",
    "getRewardPerSecond",
    "getAcceptableTimelag",
    "setRewardPerSecond",
    "setSigner",
    "setAcceptableTimelag",
    "startKoboldBatchStake",
    "endKoboldBatchStake",
    "withdrawReward",
    "withdrawRewardWithMultiplier",
  ]

async function main() {
    // 0x1Edbce0B9586093ED271eBb4C151C5cA4EcBFf57
    const KOBOLD_STAKING_FACET  = await ethers.getContractFactory("KoboldStakingFacet");
    const koboldStakingFacet = await KOBOLD_STAKING_FACET.deploy();
    await koboldStakingFacet.deployed();
    console.log("Kobold Staking Facet deployed to:", koboldStakingFacet.address);


  const diamond = TitanforgeDiamond__factory.connect('0x1Edbce0B9586093ED271eBb4C151C5cA4EcBFf57', (await ethers.getSigners())[0]);
  const koboldStakingFunctionSignatures = koboldStakingFunctionNames.map(
    (name) => koboldStakingFacet.interface.getSighash(name)
  );
    const koboldStakingFacetCut = [{
    target: koboldStakingFacet.address,
    action: 1,
    selectors: koboldStakingFunctionSignatures,
    }];

    const tx = await diamond.diamondCut(koboldStakingFacetCut, ethers.constants.AddressZero, "0x", { gasLimit: 5000000 });
    await tx.wait();



}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
  