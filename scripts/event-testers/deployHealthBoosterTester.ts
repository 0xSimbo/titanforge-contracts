import { ethers } from "hardhat";

async function main() {


  const HP_TESTER = await ethers.getContractFactory("HealthBoosterTester");
  const healthBoosterTester = await HP_TESTER.deploy();

  await healthBoosterTester.deployed();

  console.log(`HP Tester deployed to ${healthBoosterTester.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
