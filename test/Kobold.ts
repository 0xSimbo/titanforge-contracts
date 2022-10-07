// import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
// import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
// import { expect } from "chai";
// import { ethers } from "hardhat";
// import { KoboldMultipliersFacet__factory,
// AppStorageFacet__factory,
// KoboldStakingFacet__factory,
// KoboldHealthBoosterFacet__factory
// } from "../typechain-types";
// import { BigNumber } from "ethers";

// describe("Diamond", function () {
//   // We define a fixture to reuse the same setup in every test.
//   // We use loadFixture to run this setup once, snapshot that state,
//   // and reset Hardhat Network to that snapshot in every test.
//   async function deployOneYearLockFixture() {
    
//     const[owner,otherAccount] = await ethers.getSigners();

//     const KOBOLDS =  await ethers.getContractFactory("Kobolds");
//     const kobolds = await KOBOLDS.deploy();

   



//     return { owner, otherAccount,kobolds};
//   }

//   describe("Kobolds", function () {
    
//     it("Should...", async function() {
//       // We use loadFixture to run the fixture and get the returned values
//       const {kobolds,owner } = await loadFixture(
//         deployOneYearLockFixture
//       );

//       const turnOGSaleOn = await kobolds["setOgOn()"]();
//       const mintOg = await kobolds.ogMint(1,1,ethers.utils.randomBytes(32));
//       console.log(`Minted OG Kobold: ${await kobolds.getNumMintedOG(owner.address)}`);

//       const turnPublicOn = await kobolds.setPublicOn();
//       const mintPublic = await kobolds.publicMint(5);

//         console.log(`Minted OG Kobold: ${await kobolds.getNumMintedOG(owner.address)}`);

//         console.log(`Minted Public Kobold: ${await kobolds.getNumMintedPublic(owner.address)}`);
//         console.log(`Minted OG Kobold: ${await kobolds.getNumMintedOG(owner.address)}`);


      
       


//     })
//   })
// });
