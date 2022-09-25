import {ethers} from 'ethers';

const errorAbi = [
"function SoldOut()",
"function SaleNotStarted()",
"function MintingTooMany()",
"function NotWhitelisted()",
"function Underpriced()",
"function MintedOut()",
"function MaxMints()",
"function ArraysDontMatch()",
"function ZeroContract()",
"function NotAuthorized()",
"function NotLastContractStakedOn()",
"function NotApprovedStakingContract()",
"function NotApproved()",
"function TokenWasNotStaking()",
"function TokenAlreadyStaking()",
]

const errorAbi2 = [
    "function SoldOut()",
    "function SaleNotStarted()",
    "function MintingTooMany()",
    "function NotWhitelisted()",
    "function Underpriced()",
    "function MintedOut()",
    "function MaxMints()",
    "function ArraysDontMatch()",
    "function ZeroContract()",
    "function NotAuthorized()",
    "function NotLastContractStakedOn()",
    "function NotApprovedStakingContract()",
    "function NotApproved()",
    "function TokenWasNotStaking()",
    "function TokenAlreadyStaking()",
    ]
    

const errorInterface = new ethers.utils.Interface(errorAbi);
const errorCodes = errorAbi.map((error) => {
    return errorInterface.getSighash(error.split('(')[0].split('function ')[1]);
})


const errorCodesAndReason = {

    '0x52df9fe5':"Sold Out", '0x2d0a346e':"Sale Hasn't Started Yetd",
    '0x7c5369f6':"Minting Too Many", '0x584a7938':"Not Whitelisted",
    '0xd0afc534':"Transaction Underpriced", '0x846fb9e2':"Minted Out This Wave",
    '0xc3b708de':"Minting Too Many", '0xe6bbb3c1':"Arrays Not Of Same Length",
    '0x8b8fe7f0':"Zero Contract Cannot Call", '0xea8e4eb5':"Not Authorized Caller",
    '0x48f020a3':"Not Last Contract Staked On", '0xcd4e143b':"Not Approved Staking Contract",
    '0xc19f17a9':"Caller Not Approved", '0xfc03ac87':"Token Was Not Staking",
    '0x75cb18f4':"Token Already Staking",
}

