// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {iIngotToken} from "./interfaces/IIngotToken.sol";
import "./interfaces/IShards.sol";
error UnauthorizedMinter();
error UnauthorizedBurner();
error RedundantBurn();
error InexistentElement();
error QueryForInexistentToken();
error UpgradesNotOpen();

/// @title SHARDS
/// @author 0xSimon_
/// @notice Shards are used in the Titanforge ecosystem to mint titants. Shards Can be upgraded using Ingot Token.

contract Shards is ERC1155, Ownable,iShards {
    mapping(uint256 => Shard) private shard;
    mapping(address => bool) private approvedMinter;
    mapping(address => bool) private approvedBurner;


    iIngotToken private ingot;
    uint256 public ingotRequiredToUpgrade = 300 ether;

    enum ShardUpgradeStatus {
        INACTIVE,
        OPEN
    }
    ShardUpgradeStatus public shardUpgradeStatus = ShardUpgradeStatus.INACTIVE;

    struct Shard {
        string uri;
        string classname;
        uint supplyMinted;
        uint maxSupply;
    }


    constructor() ERC1155("Shards") {
        setShard(0, "ipfs://cid/blankShard", "Blank Shard", 0,8888, false);
        setShard(1, "ipfs://cid/warriorShard", "Warrior", 0,2222, false);
        setShard(2, "ipfs://cid/guardianShard", "Guardian", 0,2222, false);
        setShard(3, "ipfs://cid/rogueShard", "Rogue", 0,2222, false);
        setShard(4, "ipfs://cid/wizardShard", "Wizard", 0,2222, false);


    }

    /*
    <<<<<<<<<<
    Setters
    <<<<<<<<<<
     */
    function setUri(uint256 tokenId, string memory newuri) public onlyOwner {
        if (shard[tokenId].maxSupply == 0) revert QueryForInexistentToken();
        shard[tokenId].uri = newuri;
    }
    function setShard(uint shardId, string memory _uri,string memory _classname, uint _supplyMinted, uint _maxSupply,bool overrideOldShard) public onlyOwner{
        if(!overrideOldShard) {
            Shard memory shardAtIndex = shard[shardId];
            if(shardAtIndex.maxSupply >0) revert ("Shard Already Initialized");
        }
        Shard memory newShard =  Shard({
            uri:_uri,
            classname: _classname,
            supplyMinted:_supplyMinted,
            maxSupply: _maxSupply
        });
        shard[shardId] = newShard;

    }

    function uri(uint256 tokenId)
        public
        view
        override(ERC1155)
        returns (string memory)
    {
        if (shard[tokenId].maxSupply == 0) revert QueryForInexistentToken();
        return shard[tokenId].uri;
    }

    function approveMinter(address minter) public onlyOwner {
        approvedMinter[minter] = true;
    }

    // unappoveMinter
    function unapproveMinter(address minter) public onlyOwner {
        delete approvedMinter[minter];
    }

    function setIngotToken(address _address) external onlyOwner {
        ingot = iIngotToken(_address);
    }

    function approveBurner(address burner) public onlyOwner {
        approvedBurner[burner] = true;
    }

    function unapproveBurner(address burner) public onlyOwner {
        delete approvedBurner[burner];
    }

    function setIngotRequiredToUpgrade(uint256 _amount) external onlyOwner {
        ingotRequiredToUpgrade = _amount;
    }

    function setShardUpgradeStatus(ShardUpgradeStatus _status)
        external
        onlyOwner
    {
        shardUpgradeStatus = _status;
    }

    /*
    >>>>>>>>>>>>>
    END SETTERS
    >>>>>>>>>>>>>
     */

    /// @notice Allows users to upgrade their blank shard to an elemental shard by burning Ingot Token and the old shard
    /// @dev Will automatically revert if user balance not great enough
    /// @param desiredElement refers to the index in the ShardElement enum
    /// @param amountToBurn refers to the amount of blank shards the user decides to burn
    function upgradeShard(uint256 desiredElement, uint256 amountToBurn)
        external
    {
        Shard memory currentShard = shard[desiredElement];
        if (shardUpgradeStatus == ShardUpgradeStatus.INACTIVE)
            revert UpgradesNotOpen();
        if (desiredElement == 0) revert RedundantBurn();
        if (currentShard.supplyMinted + amountToBurn > currentShard.maxSupply) revert InexistentElement();
        shard[desiredElement].supplyMinted = currentShard.supplyMinted + amountToBurn;
        ingot.burn(_msgSender(), amountToBurn * ingotRequiredToUpgrade);
        _burn(_msgSender(), 0, amountToBurn);
        _mint(_msgSender(), desiredElement, amountToBurn, "");
    }

    /// @notice This function burns shards. It can only be called from the titans contract and is used in the titan mint process.
    /// @dev Explain to a developer any extra details
    /// @param from represent whos shard we will burn
    /// @param tokenId refers to the tokenId (element) is to be burned
    /// @param amount represents the amount of that tokenId to be burned
    function burnShard(
        address from,
        uint256 tokenId,
        uint256 amount
    ) external {
        if (!approvedBurner[from]) revert UnauthorizedBurner();
        _burn(from, tokenId, amount);
    }

    /// @notice This function is used to mint shardsd
    /// @dev This function can only be called by an approveMinter. In our case, the Kobald Staking contract.
    /// @param account is who to mint to
    /// @param id refers to the tokenId in reference to the ShardProperties enum.abi
    /// @param amount refers to the amount we wish to mint.
    function mint(
        address account,
        uint256 id,
        uint256 amount
    ) public {

        if (!approvedMinter[_msgSender()]) revert UnauthorizedMinter();
        Shard memory currentShard = shard[id];
        if(currentShard.supplyMinted + amount > currentShard.maxSupply) revert InexistentElement();
        shard[id].supplyMinted = currentShard.supplyMinted + amount;
        _mint(account, id, amount, "");
    }
}
