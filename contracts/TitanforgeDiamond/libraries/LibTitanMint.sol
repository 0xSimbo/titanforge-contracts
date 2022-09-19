// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.17;
import "./LibAppStorage.sol";
import "../interfaces/IAppStorage.sol";
import "../../interfaces/IKobolds.sol";
import "../../interfaces/IIngotToken.sol";
import "./LibKoboldMultipliers.sol";
import "../interfaces/IKoboldMultiplier.sol";
import "../interfaces/Class.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
library LibTitanMint {
    using ECDSA for bytes32;
    //Storage
    bytes32 internal constant NAMESPACE = keccak256("titanforge.titan.mint");
    uint256 internal constant MAX_SUPPLY = 8888;

    struct Storage{
        uint256 acceptableTimelag;
        uint256 shardsRequiredToMintOne;
        uint256  ingotRequiredToMintOne;
        uint256 numKoboldsRequiredToMintOne;
        address signer;
        bool revealed;
        string baseURI;
        string uriSuffix;
        string notRevealedUri;
        mapping(uint256=>Class) titanToClass;
        mapping(uint256 => Class) class;

        
    }
    
    function getStorage() internal pure returns(Storage storage s)  {
        bytes32 position = NAMESPACE;
        assembly{
            s.slot := position
        }
    }
   


    
    
    
}



