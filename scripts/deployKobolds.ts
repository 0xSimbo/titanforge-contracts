import { ethers } from "hardhat";

async function main() {
 

  const KOBOLDS = await ethers.getContractFactory("Kobolds");
  const kobolds = await KOBOLDS.deploy();

  await kobolds.deployed();

//   const setWhitelistOn = await k

  console.log(`Kobolds deployed to ${kobolds.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
