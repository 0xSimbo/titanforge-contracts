//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "erc721a/contracts/extensions/ERC721AQueryable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {iKobolds} from "./interfaces/IKobolds.sol";
import {iShards} from "./interfaces/IShards.sol";
import {iIngotToken} from "./interfaces/IIngotToken.sol";
error SoldOut();
error SaleNotStarted();
error MintingTooMany();
error NotWhitelisted();
error Underpriced();
error MintedOut();
error MaxMints();
error ArraysDontMatch();
error NotOwner();
error NotEnoughKoboldsSent();

/// @title Titans
/// @author 0xSimon_
/// @notice Explain to an end user what this does
/// @dev Explain to a developer any extra details
contract Titans is ERC721AQueryable, Ownable {
    using ECDSA for bytes32;
    iShards private shards;
    iKobolds private kobolds;
    iIngotToken private ingotToken;

    uint256 public constant MAX_SUPPLY = 6555;
    uint256 public shardsRequiredToMintOne = 3;
    uint256 public ingotRequiredToMintOne = 200 ether;
    uint256 public numKoboldsRequiredToMintOne = 1;

    string private baseURI;
    string private uriSuffix = ".json";
    string public notRevealedUri;

    mapping(uint256 => Class) private titanToClass;
    mapping(uint256 => Class) public class;

    address private signer;
    bool private revealed;

    struct Class {
        string classname;
    }

    enum MintStatus {
        INACTIVE,
        OPEN
    }
    MintStatus public mintStatus = MintStatus.INACTIVE;
    //Caught On Backend
    event ElementalMint(
        address indexed from,
        uint256 indexed startTokenId,
        uint256 shardId,
        uint256 amount
    );

    constructor() ERC721A("Titans", "TITANS") {
        setNotRevealedURI("ipfs://cid/hidden.json");
        setClass(0,"None",false);
        setClass(1,"Warrior",false);
        setClass(2,"Guardian",false);
        setClass(3,"Rogue",false);
        setClass(4,"Wizard",false);

    }

    /*///////////////////////////////////////////////////////////////
                          MINT FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function devMint(
        address to,
        uint256 amount,
        uint256 shardId
    ) external onlyOwner {
        uint256 supply = totalSupply();
        //~~ No Need For Next Token ID internal call since Titans will not burn ~~

        //Event Caught on Backend -- Will emit tokenId to start from and to end from.
        emit ElementalMint(_msgSender(), (supply), shardId, amount);
        titanToClass[supply] = class[shardId];
        _mint(to, amount);
    }
    function setClass(uint classId, string memory _className, bool overrideClass) public onlyOwner{
        if(!overrideClass) {
            Class memory currentClass = class[classId];
            if(bytes(currentClass.classname).length > 0 ){
                revert ("Class Already Initialized");
            }
        }   
        class[classId] = Class({
            classname:_className
        });

    }

    function mint(
        uint256 amount,
        uint256[] calldata koboldIds,
        uint256 shardId
    ) external {
        //Make Sure Sale Is Active
        if (mintStatus == MintStatus.INACTIVE) revert SaleNotStarted();
        //Find Current Supply
        uint256 supply = totalSupply();
        //Make Sure Supply Stays In Bounds
        if (supply + amount > MAX_SUPPLY) revert SoldOut();
        //Make sure enuogh kobolds are sent
        if (koboldIds.length != amount * numKoboldsRequiredToMintOne)
            revert NotEnoughKoboldsSent();
        //Make sure sender of tx is owner of all koboldIds
        for (uint256 i; i < koboldIds.length; ++i) {
            if (_msgSender() != kobolds.ownerOf(koboldIds[i]))
                revert NotOwner();
            kobolds.burn(koboldIds[i]);
        }
        //Burn Correct Number Of Shards... Will revert if user doesen't have sufficient balance
        shards.burnShard(
            _msgSender(),
            shardId,
            amount * shardsRequiredToMintOne
        );
        //Burn ingotToken. Will revert if user doesen't have sufficient balance
        ingotToken.burn(_msgSender(), amount * ingotRequiredToMintOne);

        //Event Caught on Backend -- Will emit tokenId from start + amount minted.
        emit ElementalMint(_msgSender(), (supply), shardId, amount);
        _mint(_msgSender(), amount);
        //Cast ShardID To Group To Avoid Redundancy... Cleanup in getShardIdFromToken function
        titanToClass[supply] =  class[shardId];
    }

    /*
     * Getters
     */


     //TODO: Maybe Use setExtraDataAt
    /// @dev function that keeps looking backwards until it finds its shardID
    function getShardIdFromToken(uint256 tokenId)
        public
        view
        returns (string memory)
    {
        //Check If tokeId exists
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();
        //While shardId has not been init at the token, keep looking backwards
        while (bytes(titanToClass[tokenId].classname).length == 0) {
            --tokenId;
        }
        return titanToClass[tokenId].classname;
    }

    /* 
        <<<<<<<<<<<<<<<<
    *        Setters 
        >>>>>>>>>>>>>>>>
    */
    function setNotRevealedURI(string memory _notRevealedURI) public onlyOwner {
        notRevealedUri = _notRevealedURI;
    }

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    function setNumKoboldsRequiredToMintOne(
        uint256 _numKoboldsRequiredToMintOne
    ) public onlyOwner {
        numKoboldsRequiredToMintOne = _numKoboldsRequiredToMintOne;
    }

    function setingotRequiredToMintOne(uint256 _ingotRequiredToMintOne)
        public
        onlyOwner
    {
        ingotRequiredToMintOne = _ingotRequiredToMintOne;
    }

    function setShardsRequiredToMintOne(uint256 _shardsRequiredToMintOne)
        public
        onlyOwner
    {
        shardsRequiredToMintOne = _shardsRequiredToMintOne;
    }

    function setingotToken(address _address) external onlyOwner {
        ingotToken = iIngotToken(_address);
    }

    function setShards(address _address) external onlyOwner {
        shards = iShards(_address);
    }

    function setKobolds(address _address) external onlyOwner {
        kobolds = iKobolds(_address);
    }

    function setMintOn() external onlyOwner {
        mintStatus = MintStatus.OPEN;
    }

    function setMintOff() external onlyOwner {
        mintStatus = MintStatus.INACTIVE;
    }

    function switchReveal() public onlyOwner {
        revealed = !revealed;
    }

    function setUriSuffix(string memory _uriSuffix) public onlyOwner {
        uriSuffix = _uriSuffix;
    }

    function setSigner(address _signer) external onlyOwner {
        signer = _signer;
    }

    /*
     *   Metadata
     */

    // function tokenURI(uint256 tokenId)
    //     public
    //     view
        
    //     override(ERC721A)
    //     returns (string memory)
    // {
    //     if (revealed == false) {
    //         return notRevealedUri;
    //     }

    //     string memory currentBaseURI = baseURI;
    //     return
    //         bytes(currentBaseURI).length > 0
    //             ? string(
    //                 abi.encodePacked(
    //                     currentBaseURI,
    //                     _toString(tokenId),
    //                     uriSuffix
    //                 )
    //             )
    //             : "";
    // }

    function withdraw() public onlyOwner {
        (bool os, ) = payable(owner()).call{value: address(this).balance}("");
        require(os);
    }
}
