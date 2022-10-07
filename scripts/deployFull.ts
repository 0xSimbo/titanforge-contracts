import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { KoboldMultipliersFacet__factory,
    AppStorageFacet__factory,
    KoboldStakingFacet__factory,
    KoboldHealthBoosterFacet__factory
    } from "../typechain-types";
import * as fs from 'fs';
async function main() {
 
    const[owner,otherAccount] = await ethers.getSigners();
    const DIAMOND = await ethers.getContractFactory("TitanforgeDiamond");
    const diamond = await DIAMOND.deploy();
    await diamond.deployed();
    console.log(`Diamond deployed to: ${diamond.address}`);

    const INGOT = await ethers.getContractFactory("IngotToken");
    const ingot = await INGOT.deploy();
    await ingot.deployed();
    console.log(`Ingot deployed to: ${ingot.address}`);

    const KOBOLDS =  await ethers.getContractFactory("Kobolds");
    const kobolds = await KOBOLDS.deploy();
    await kobolds.deployed();
    console.log(`Kobolds deployed to: ${kobolds.address}`);

    const tx = await kobolds.approveStakingContract(diamond.address);
    await tx.wait();
    const tx2 = await kobolds.setApprovalForAll(diamond.address, true);
    await tx2.wait();


    const MULTIPLIER_FACET = await ethers.getContractFactory("KoboldMultipliersFacet");
    const multiplierFacet = await MULTIPLIER_FACET.deploy();
    await multiplierFacet.deployed();
    console.log(`Deployed Multiplier Facet at ${multiplierFacet.address}`);
    
    const KOBOLD_STAKING_FACET  = await ethers.getContractFactory("KoboldStakingFacet");
    const koboldStakingFacet = await KOBOLD_STAKING_FACET.deploy();
    await koboldStakingFacet.deployed();
    console.log("Kobold Staking Facet deployed to:", koboldStakingFacet.address);

    const KOBOLD_HEALTH_BOOSTER_FACET = await ethers.getContractFactory("KoboldHealthBoosterFacet");
    const koboldHealthBoosterFacet = await KOBOLD_HEALTH_BOOSTER_FACET.deploy();
    await koboldHealthBoosterFacet.deployed();
    console.log(`Deployed koboldHealthBoosterFacet to: ${koboldHealthBoosterFacet.address}`);


    //Approve the diamond to mint the ingot tokens
    const approveMinter = await ingot.approveMinter(diamond.address);
    await approveMinter.wait();
    console.log("Diamond is approved to mint ingots");

    const APP_STORAGE_FACET = await ethers.getContractFactory("AppStorageFacet");
    const appStorageFacet = await APP_STORAGE_FACET.deploy();
    await appStorageFacet.deployed();
    console.log("Deployed AppStorageFacet To: ", appStorageFacet.address);

        const appStorageFunctionNames  = [
          "initializeAppStorage",
          "setIngotTokenAddress",
          "setKoboldAddress",
          "setTitanAddress",
          "getIngotTokenAddress",
          "getKoboldAddress",
          "getTitanAddress",
        ]
        const appStorageFunctionSignatures = appStorageFunctionNames.map(
          (name) => appStorageFacet.interface.getSighash(name)
        );

        const facetCuts = [
          {
            target: appStorageFacet.address,
            action: 0,
            selectors: appStorageFunctionSignatures,
          }
        ]
        const appStorageCut = await diamond.diamondCut(facetCuts, ethers.constants.AddressZero, "0x");
        await appStorageCut.wait();
        const diamondAttachedToAppStorage = AppStorageFacet__factory.connect(diamond.address, owner);
        const setIngotInAppStorage = await diamondAttachedToAppStorage.setIngotTokenAddress(ingot.address);
        await setIngotInAppStorage.wait();
        const setKoboldInAppStorage = await diamondAttachedToAppStorage.setKoboldAddress(kobolds.address);
        await setKoboldInAppStorage.wait();
        console.log("AppStorage Set In Diamond");

        // !Setting Up Kobold Staking Facet
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
        const koboldStakingFunctionSignatures = koboldStakingFunctionNames.map(
          (name) => koboldStakingFacet.interface.getSighash(name)
        );

        const koboldStakingFacetCuts = [
          {
            target: koboldStakingFacet.address,
            action: 0,
            selectors: koboldStakingFunctionSignatures,
          }
        ]
       const koboldStakingCut = await diamond.diamondCut(koboldStakingFacetCuts, ethers.constants.AddressZero, "0x");
        await koboldStakingCut.wait();
        console.log("Kobold Staking Facet Cut");

        const diamondAttachedToKoboldStaking = KoboldStakingFacet__factory.connect(diamond.address, owner);
        const setDiamondKoboldSigner = await diamondAttachedToKoboldStaking.setSigner(owner.address);
        await setDiamondKoboldSigner.wait();
        console.log("Set Signer In Diamond Kobold Staking Facet ")
        // const setStakingRewardPerSecond = await diamondAttachedToKoboldStaking.setRewardPerSecond(BigNumber.from(10).pow(17).div(86400));  //.1 Per Day
        const setStakingRewardPerSecond = await diamondAttachedToKoboldStaking.setRewardPerSecond(BigNumber.from(10).pow(17));  //.1 Per Second

        await setStakingRewardPerSecond.wait();
        console.log("Set Staking Rewrad Per Second");
        const setAcceptableTimelag = await diamondAttachedToKoboldStaking.setAcceptableTimelag(240);  
        await setAcceptableTimelag.wait();
        console.log("Set Acceptable Time Lag")

        // console.log('staking reward per second = ' , (await diamondAttachedToKoboldStaking["getRewardPerSecond()"]()).toString()); 

    



    

        // !Setting Up Kobold Multipliers Facet
        const koboldMultipliersFunctionNames  = [
          "setKoboldMultiplier",
          "getKoboldMultiplier",
          "purchaseKoboldMultiplier",
          "getKoboldMultiplierUserBalance",
          "approveKoboldMultiplierSpender",
          "unapproveKoboldMultiplierSpender",
          "queryBatchKoboldMultipliers",
          "queryUserBalanceBatchMultipliers"

        ]
        const koboldMultipliersFunctionSignatures = koboldMultipliersFunctionNames.map(
          (name) => multiplierFacet.interface.getSighash(name)
        );

        const koboldMultipliersFacetCuts = [
          {
            target: multiplierFacet.address,
            action: 0,
            selectors: koboldMultipliersFunctionSignatures,
          }
        ]
        const multiplierFacetCut = await diamond.diamondCut(koboldMultipliersFacetCuts, ethers.constants.AddressZero, "0x");
        await multiplierFacetCut.wait();
        console.log("Kobold Multipliers Cut");

        const diamondAttachedToKoboldMultipliers = KoboldMultipliersFacet__factory.connect(diamond.address, owner);

        //Setting First Two Multipliers
        const axe = {
          price: ethers.utils.parseEther('1'),
          multiplier: 5,
          isAvailableForPurchase: true,
          maxQuantity: BigNumber.from(10).pow(3).mul(50),
          quantitySold:0,
          name: "Axe",
        }
        const candle = {
          price: ethers.utils.parseEther('2'),
          multiplier: 10,
          isAvailableForPurchase: true,
          maxQuantity: BigNumber.from(10).pow(3).mul(50),
          quantitySold:0,
          name: "Candle",
        }
        const setAxe = await diamondAttachedToKoboldMultipliers.setKoboldMultiplier(axe);
        await setAxe.wait();
        console.log('axe set');
       const setCandle =  await diamondAttachedToKoboldMultipliers.setKoboldMultiplier(candle);
        await setCandle.wait();
        console.log("set Candle")

  

       const other = await KoboldMultipliersFacet__factory.connect(diamond.address, otherAccount);
       

       



        //! Adding Kobold Health Booster Facet
        const koboldHealthBoosterFunctionNames  = [
          "setKoboldHealthBooster",
          "getKoboldHealthBooster",
          "purchaseKoboldHealthBooster",
          "getKoboldHealthBoosterUserBalance",
          "approveKoboldHealthBoosterSpender",
          "unapproveKoboldHealthBoosterSpender",
          "queryBatchKoboldHealthBoosters",
          "queryUserBalanceBatchHealthBoosters"
        ]
        const koboldHealthBoosterFunctionSignatures = koboldHealthBoosterFunctionNames.map(
          (name) => koboldHealthBoosterFacet.interface.getSighash(name)
        );

        const koboldHealthBoosterFacetCuts = [
          {
            target: koboldHealthBoosterFacet.address,
            action: 0,
            selectors: koboldHealthBoosterFunctionSignatures,
          }
        ]
        const healthBoosterFacetCut = await diamond.diamondCut(koboldHealthBoosterFacetCuts, ethers.constants.AddressZero, "0x");
        await healthBoosterFacetCut.wait();
        console.log('health booster cut complete');

        const diamondAttachedToKoboldHealthBooster = KoboldHealthBoosterFacet__factory.connect(diamond.address, owner);

        // Set The First Health Booster
        const healthBooster = {
          price: ethers.utils.parseEther('1'),
          isAvailableForPurchase: true,
          healthBoost: 5,
          name:"Basic Health Potion"
        }
        const setBasicHpPotion = await diamondAttachedToKoboldHealthBooster.setKoboldHealthBooster(healthBooster);
        await setBasicHpPotion.wait();
        console.log("Basic Health Potion Set");


      
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
