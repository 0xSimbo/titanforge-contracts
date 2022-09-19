// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IShards.sol";

error InvalidSigner();
error SignerNotInit();
error MustMintAtLeastOne();
error NotOwner();
/// @title Shard Controller
/// @author 0xSimon_
/// @notice Contract responsible for dispatching blank shards
contract ShardController is Ownable {

    uint256 constant private BLANK_SHARD_ID = 0;
    using ECDSA for bytes32;

    address private signer = 0x6884efd53b2650679996D3Ea206D116356dA08a9;
    iShards private shards;
    IERC721Like private kobolds;
    mapping(uint => uint) public numShardsKoboldRedeemed;


    constructor(){

    }

    function setSigner(address _signer) external onlyOwner {
        signer = _signer;
    }
    function setShards(address _shards) external onlyOwner {
        shards = iShards(_shards);
    }
    function setKobolds(address _kobolds) external onlyOwner {
        kobolds = IERC721Like(_kobolds);
    }

    function mintBlankShard(uint koboldId,uint maxShards,bytes memory signature) external {
        bytes32 hash = keccak256(abi.encodePacked(koboldId,"MBS",maxShards));
        if(hash.toEthSignedMessageHash().recover(signature) != signer) revert InvalidSigner();
        if(signer == address(0)) revert SignerNotInit();
        uint shardsToMint = numShardsKoboldRedeemed[koboldId] - maxShards;
        if(shardsToMint == 0 ) revert MustMintAtLeastOne();
        if(msg.sender != kobolds.ownerOf(koboldId)) revert NotOwner();
        numShardsKoboldRedeemed[koboldId] += shardsToMint;
        shards.mint(msg.sender,BLANK_SHARD_ID,shardsToMint);
    }

    
}

interface IERC721Like {
    function ownerOf(uint tokenId) external view returns(address);
}
