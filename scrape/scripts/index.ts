import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';

import { ethers } from 'ethers';

const abi =['function ownerOf(uint256) external view  returns (address)'];
const MAINNET_URL = process.env.MAINNET_URL;
if(!MAINNET_URL) throw new Error('Rinkeby url is required');
const koboldsAddress = "0xc7DE53a189A02ee37ece610b15a6796a46F074EE";

type Holder = {
    address: string;
    balance: number;
}

const tokenHolders:Holder[] = []; 
const main = async () => {
    for(let i = 0; i<1260; i++){
    const provider = new ethers.providers.JsonRpcProvider(MAINNET_URL);
    const contract = new ethers.Contract(koboldsAddress, abi, provider);
    const owner = await contract.ownerOf(i);
    const holder = tokenHolders.find(holder => holder.address === owner);
    if(holder){
        holder.balance++;
    }else{
        tokenHolders.push({
            address: owner,
            balance: 1
        })
    
        console.log(`Token ${i} is owned by ${owner}`);
    }
}
fs.writeFileSync('./scrape/data/tokenHolders.json', JSON.stringify(tokenHolders, null, 4));

}

if(require.main === module){
    main();
}