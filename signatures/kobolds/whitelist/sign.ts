import * as fs from 'fs';
import * as dotenv from 'dotenv';
import {ethers} from 'ethers'
dotenv.config();


const {PRIVATE_KEY,MAINNET_URL} = process.env;
if(!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");
if(!MAINNET_URL) throw new Error("MAINNET_URL is required");

//read in addresses.json
const provider = new ethers.providers.JsonRpcProvider(MAINNET_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

const addresses:string[] = JSON.parse(fs.readFileSync('./signatures/kobolds/whitelist/addresses.json', 'utf8'));

const invalidAddresses:string[] = [];
const MAX_MINTS_WL =2;
async function signIndividual(address:string) {
    try{
        const checksumAddress = ethers.utils.getAddress(address);
        const message = ethers.utils.solidityKeccak256(["string","uint","address"], ["KBLD",MAX_MINTS_WL,checksumAddress]);
        const arrayifiedMessage = ethers.utils.arrayify(message);

        const signature = await signer.signMessage(arrayifiedMessage);

        return signature;

    }
    catch(err){
        invalidAddresses.push(address);
        return null;
    }

}

type sigObject = {
    address:string,
    signature:string
    max:number
}
const signBatch = async (addresses:string[]) => {
    const signatures:sigObject[] = [];
    for(const address of addresses){
        const signature = await signIndividual(address);
        if(signature !== null){ 
            let tempSigObj = {address,signature,max:MAX_MINTS_WL};
            signatures.push(tempSigObj);
        }
    }

    //output signatures to ./signatures/whitelist/signatures.json
    fs.writeFileSync('./signatures/kobolds/whitelist/koboldWhitelistSigs.json', JSON.stringify(signatures, null, 4));
    //output invalid addresses to ./signatures/whitelist/invalidAddresses.json
    fs.writeFileSync('./signatures/kobolds/whitelist/invalidAddresses.json', JSON.stringify(invalidAddresses, null, 4));
}

//if main run signbatch
if(require.main === module){
    signBatch(addresses);
}
