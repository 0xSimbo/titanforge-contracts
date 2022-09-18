import {ethers} from 'ethers';
import * as dotenv from 'dotenv';
import { Kobolds__factory } from '../typechain-types';
dotenv.config()

const{PRIVATE_KEY,RINKEBY_URL} = process.env;
if(!PRIVATE_KEY) throw new Error('Private key is required');
if(!RINKEBY_URL) throw new Error('Rinkeby url is required');

const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(RINKEBY_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const kobolds = await Kobolds__factory.connect('0x80A6cE2Fa8872cbE8049eAA29e06d4B3b6540846', signer);

    const tx = await kobolds.setWhitelistOn();
    await tx.wait();
    console.log('Transaction successful');
}
main();