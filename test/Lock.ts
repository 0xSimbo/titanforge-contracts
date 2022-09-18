import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { KoboldMultipliersFacet__factory,
AppStorageFacet__factory,
KoboldStakingFacet__factory
} from "../typechain-types";
import { BigNumber } from "ethers";

describe("Diamond", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const lockedAmount = ONE_GWEI;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const DIAMOND = await ethers.getContractFactory("TitanforgeDiamond");
    const diamond = await DIAMOND.deploy();

    const INGOT = await ethers.getContractFactory("IngotToken");
    const ingot = await INGOT.deploy();

    const KOBOLDS =  await ethers.getContractFactory("Kobolds");
    const kobolds = await KOBOLDS.deploy();

    await kobolds.approveStakingContract(diamond.address);
    await kobolds.setApprovalForAll(diamond.address, true);


    const MULTIPLIER_FACET = await ethers.getContractFactory("KoboldMultipliersFacet");
    const multiplierFacet = await MULTIPLIER_FACET.deploy();
    
    const KOBOLD_STAKING_FACET  = await ethers.getContractFactory("KoboldStakingFacet");
    const koboldStakingFacet = await KOBOLD_STAKING_FACET.deploy();

    //Approve the diamond to mint the ingot tokens
    await ingot.approveMinter(diamond.address);


    return { diamond, owner, otherAccount,multiplierFacet,ingot,kobolds,koboldStakingFacet};
  }

  describe("Deployment", function () {
    
    it("Should...", async function() {
      // We use loadFixture to run the fixture and get the returned values
      const { diamond, otherAccount, owner,multiplierFacet,ingot,kobolds,koboldStakingFacet } = await loadFixture(
        deployOneYearLockFixture
      );

      
        // !Setting Up App Storage
        const APP_STORAGE_FACET = await ethers.getContractFactory("AppStorageFacet");
        const appStorageFacet = await APP_STORAGE_FACET.deploy();

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
        await diamond.diamondCut(facetCuts, ethers.constants.AddressZero, "0x");
        const diamondAttachedToAppStorage = AppStorageFacet__factory.connect(diamond.address, owner);
        await diamondAttachedToAppStorage.setIngotTokenAddress(ingot.address);
        await diamondAttachedToAppStorage.setKoboldAddress(kobolds.address);

        console.log(`ingot = ${ingot.address}`);
        console.log(`kobolds = ${kobolds.address}`);
       expect(await diamondAttachedToAppStorage.getIngotTokenAddress()).to.equal(ingot.address);
        expect(await diamondAttachedToAppStorage.getKoboldAddress()).to.equal(kobolds.address);
        
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
        await diamond.diamondCut(koboldStakingFacetCuts, ethers.constants.AddressZero, "0x");

        const diamondAttachedToKoboldStaking = KoboldStakingFacet__factory.connect(diamond.address, owner);
        await diamondAttachedToKoboldStaking.setSigner(owner.address);
        await diamondAttachedToKoboldStaking.setRewardPerSecond(ethers.utils.parseEther('.1'));
        await diamondAttachedToKoboldStaking.setAcceptableTimelag(240);  

        expect(await diamondAttachedToKoboldStaking.getSigner()).to.equal(owner.address);
        expect(await diamondAttachedToKoboldStaking.getRewardPerSecond()).to.equal(ethers.utils.parseEther('.1'));
        expect(await diamondAttachedToKoboldStaking.getAcceptableTimelag()).to.equal(240);

        const tokensToStake = [0,1,2,3,4,5]
        await diamondAttachedToKoboldStaking.startKoboldBatchStake(tokensToStake);
        await time.increase(60);
        await diamondAttachedToKoboldStaking.endKoboldBatchStake(tokensToStake);

        console.log(`kobold 0 = ${await diamondAttachedToKoboldStaking.getKoboldAccumulatedReward(0)}`);

        // await diamondAttachedToKoboldStaking.withdrawReward([0]);
        // console.log(`kobold 0  after redeeming= ${await diamondAttachedToKoboldStaking.getKoboldAccumulatedReward(0)}`);
        // expect(await diamondAttachedToKoboldStaking.getKoboldAccumulatedReward(0)).to.equal(0);
        // console.log(`user ignot balance = ${await ingot.balanceOf(owner.address)}`);

        // expect(await diamondAttachedToKoboldStaking.viewKoboldTotalReward(0)).to.equal(ethers.utils.parseEther('0'));

        // !Setting Up Kobold Multipliers Facet
        const koboldMultipliersFunctionNames  = [
          "setKoboldMultiplier",
          "getKoboldMultiplier",
          "purchaseKoboldMultiplier",
          "getUserBalance",
          "approveSpender",
          "unapproveSpender",
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
        await diamond.diamondCut(koboldMultipliersFacetCuts, ethers.constants.AddressZero, "0x");

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
        await diamondAttachedToKoboldMultipliers.setKoboldMultiplier(axe);
        await diamondAttachedToKoboldMultipliers.setKoboldMultiplier(candle);

        // //Buying First Multiplier
        // await ingot.approve(diamond.address, axe.price);
        // await diamondAttachedToKoboldMultipliers.purchaseKoboldMultiplier(0,1);
        // expect(await diamondAttachedToKoboldMultipliers.getUserBalance(owner.address,0)).to.equal(1);

        // //Buying Second Multiplier
        // await ingot.approve(diamond.address, candle.price);
        // await diamondAttachedToKoboldMultipliers.purchaseKoboldMultiplier(1,1);
        // expect(await diamondAttachedToKoboldMultipliers.getUserBalance(owner.address,1)).to.equal(1);

       const other = await KoboldMultipliersFacet__factory.connect(diamond.address, otherAccount);
       
       //Try To Set A Multiplier With Wrong Signer
       await expect(other.setKoboldMultiplier(axe)).to.be.reverted;
       
       console.log(await diamondAttachedToKoboldMultipliers.queryBatchKoboldMultipliers([0,1]));
       console.log(await diamondAttachedToKoboldMultipliers.queryUserBalanceBatchMultipliers(owner.address,[0,1]));

        //Increasing Time
        await time.increase(60);

        //Withdraw Rewards With Multiplier This Time
        //get current block.timestamp
        const currentBlock = await ethers.provider.getBlock('latest');
        const currentTimestamp = currentBlock.timestamp;
        const healthPoints = [100,100,100,100,100,100];
        const messageToSign = ethers.utils.solidityKeccak256([
          'uint',
          'uint[]',
          'string',
          'uint[]'
        ], [currentTimestamp, tokensToStake, 'KHPS', healthPoints]);
        const signature = await owner.signMessage(ethers.utils.arrayify(messageToSign));
        await diamondAttachedToKoboldStaking.withdrawReward(tokensToStake,healthPoints,currentTimestamp,signature);
        console.log(`kobold 1  after redeeming= ${await diamondAttachedToKoboldStaking.getKoboldAccumulatedReward(1)}`);
        expect(await diamondAttachedToKoboldStaking.getKoboldAccumulatedReward(1)).to.equal(0);

        //Check User Balance
        console.log(`user ignot balance = ${await ingot.balanceOf(owner.address)}`);

        //Check Balance of Multiplier 0 
        const multiplierBalance = await diamondAttachedToKoboldMultipliers.getUserBalance(owner.address,0);
        console.log(`multiplier 0 balance = ${multiplierBalance}`);
        expect(multiplierBalance).to.equal(0);
    })
  })
});
