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
type Holder = {
    address: string;
    balance: number;
}
const addresses:string[] = JSON.parse(fs.readFileSync('./signatures/kobolds/og/addresses.json', 'utf8'));
const extraAddresses:Holder[] = JSON.parse(fs.readFileSync('./scrape/data/tokenHolders.json', 'utf8'));
const specialWallets = [ 
    {
        wallet:"0xdD35B3bE27499edB3f0073FF3D6b3AcDFa91929D",
        max:10
    },
    {
        wallet:"0x13D62E5ac93F9C74eb5AEf64EaC12a1fF0d32861",
        max:5
    },
    {
        wallet:"0xd9213633F0B463d80DB0C1E6F9064DC49973d284",
        max:10
    },
    {
        wallet:"0x5251231815b5Af16A6784da997a8e513998d2cb4",
        max:5
    },
    {
        wallet:"0x2ea4815F47D685eD317e8bd243b89bCb26b369Fa",
        max:10
    }

    
]
const invalidAddresses:string[] = [];
const MAX_MINTS_WL =1;
async function signIndividual(address:string) {
    try{
        const checksumAddress = ethers.utils.getAddress(address);
        const extraAddressesCheck = extraAddresses.find(holder => holder.address === checksumAddress);
        let numExtraToGive = 0;
        if(extraAddressesCheck){
            numExtraToGive = extraAddressesCheck.balance;
        }

        const message = ethers.utils.solidityKeccak256(["string","uint","address"], ["KOG",MAX_MINTS_WL+numExtraToGive,checksumAddress]);
        const arrayifiedMessage = ethers.utils.arrayify(message);

        const signature = await signer.signMessage(arrayifiedMessage);

        return {
            signature,
            maxMints:MAX_MINTS_WL+numExtraToGive
        };

    }
    catch(err){
        invalidAddresses.push(address);
        return null;
    }

}
async function signSpecialWallet(address:string, max:number) {
    try{
        const checksumAddress = ethers.utils.getAddress(address);
        const extraAddressesToCheck = extraAddresses.find(holder => holder.address === checksumAddress);
        let numExtraToGive = 0;
        if(extraAddressesToCheck){
            numExtraToGive = extraAddressesToCheck.balance;
        }

        const message = ethers.utils.solidityKeccak256(["string","uint","address"], ["KOG",max+numExtraToGive,checksumAddress]);
        const arrayifiedMessage = ethers.utils.arrayify(message);

        const signature = await signer.signMessage(arrayifiedMessage);
        return {
            signature,
            maxMints:max+numExtraToGive
        };

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
    const extraSigs = await signTheRest();
    const signatures:sigObject[] = [];
    for(const address of addresses){
        try{
            //@ts-ignore
            const {signature,maxMints} = await signIndividual(address);
            const checkSummed = ethers.utils.getAddress(address);
            if(signature !== null){ 
                let tempSigObj = {address:checkSummed,signature,max:maxMints};
                signatures.push(tempSigObj);
            }

        }
        catch(e){

        }
    }
    for(const wallet of specialWallets){
        try{
            //@ts-ignore
            const {signature,maxMints} = await signSpecialWallet(wallet.wallet,wallet.max);
            const checkSummed = ethers.utils.getAddress(wallet.wallet);
            if(signature !== null){
                let tempSigObj = {address:checkSummed,signature,max:maxMints};
                signatures.push(tempSigObj);
            }

        }
        catch(e){

        }
    }

    const concatSigs = signatures.concat(extraSigs);

    //output signatures to ./signatures/og/signatures.json
    fs.writeFileSync('./signatures/kobolds/og/koboldOgSigs.json', JSON.stringify(concatSigs, null, 4));
    //output invalid addresses to ./signatures/og/invalidAddresses.json
    fs.writeFileSync('./signatures/kobolds/og/invalidAddresses.json', JSON.stringify(invalidAddresses, null, 4));
}

const signTheRest = async () => {
    //if extraAddresses isnt in addresses, let's create the signature
    const addressesToSign = extraAddresses.filter(holder => !addresses.includes(holder.address));
    const signatures:sigObject[] = [];
    for(const address of addressesToSign){
        try{
            const checkSummed = ethers.utils.getAddress(address.address);
         let signature = ethers.utils.solidityKeccak256(["string","uint","address"], ["KOG",address.balance,checkSummed]);
            let tempSigObj = {address:checkSummed,signature,max:address.balance};
            signatures.push(tempSigObj);
            console.log("signed",checkSummed);

        }
        catch(e){
            console.log("error signing",address.address);

        }
    }
    return signatures;
}

// const finishSigningFinal = async () => {
//     const alreadyMade = JSON.parse(fs.readFileSync('./signatures/kobolds/og/koboldOgSigs.json', 'utf8'));
//     for(let i  =0; i<extraAddresses.length;++i) {
//         const address = extraAddresses[i].address;
//         const balance = extraAddresses[i].balance;
//         if(balance > 0){
//             const signature = await signIndividual(address);
//             const checkSummed = ethers.utils.getAddress(address);
//             if(signature !== null){ 
//                 let tempSigObj = {address:checkSummed,signature,max:MAX_MINTS_WL};
//                 alreadyMade.push(tempSigObj);
//             }
//         }


//     }


//if main run signbatch
if(require.main === module){
    signBatch(addresses);
}
