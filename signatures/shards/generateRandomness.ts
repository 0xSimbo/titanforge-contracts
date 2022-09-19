import axios from 'axios';
// ES6 Modules
import { Random } from "random-js";
import * as fs from 'fs';
const BASE_SHARD_CHANCE = 5; //5%
const random = new Random(); // uses the nativeMath engine
import {ethers} from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config();

const {PRIVATE_KEY,RINKEBY_URL} = process.env;
if(!PRIVATE_KEY) throw new Error('PRIVATE_KEY is not defined');
if(!RINKEBY_URL) throw new Error('RINKEBRY_URL is not defined');
const provider = new ethers.providers.JsonRpcProvider(RINKEBY_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);



async function generateRandomness() {
    try{
         const koboldShardsData = fs.readFileSync('./signatures/shards/shards.json', 'utf8');
        const koboldShards = JSON.parse(koboldShardsData);
        const req = await axios.get('https://smuphotobucket.s3.amazonaws.com/kobolds/allKobolds.json');
        const allKoboldData: any[] = req.data;
        //@ts-ignore
        for(let i = 0; i< allKoboldData.length;++i){
            let shardBoostChance = BASE_SHARD_CHANCE;
            const currentKobold = koboldShards[i];
            //@ts-ignore
            for(let j = 0; j < allKoboldData[i].shardBoosts.length; ++j){
                //@ts-ignore
                const boost = allKoboldData[i].shardBoosts[j].boost;
                //@ts-ignore
                const endTimestamp = allKoboldData[i].shardBoosts[j].endTimestamp;
                if(Date.now() < endTimestamp){
                    shardBoostChance = Math.floor(shardBoostChance * ((100 + (boost * 100)) / 100));
                }
                // console.log(allKoboldData[i].shardBoosts[j]);
            
            }
        const value = random.integer(0, 100);
        koboldShards[i].maxShards =  shardBoostChance > value ? currentKobold.maxShards + 1: currentKobold.maxShards;
        const message = ethers.utils.solidityKeccak256(['uint','string','uint'],[i,"MBS",koboldShards[i].maxShards]);
        const signature = await wallet.signMessage(ethers.utils.arrayify(message));
        koboldShards[i].signature = signature;
    
        //@ts-ignore
                    
    }
    fs.writeFileSync('./signatures/shards/shards.json', JSON.stringify(koboldShards,null,4));
}
    catch(err){
        console.log(err);
        const firstWrite = [];
        for(let i = 0; i < 10000; ++i){
            const dataToWrite = {
                koboldId: i,
                maxShards: 0,
                signature: null
            }
            firstWrite.push(dataToWrite);
        }
        fs.writeFileSync('./signatures/shards/shards.json', JSON.stringify(firstWrite, null, 4));
        generateRandomness();
    }
    
}

if(require.main === module){
    generateRandomness();
}