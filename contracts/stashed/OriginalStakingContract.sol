// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

error NoRewardToWithdraw();
error ZeroAddress();
error NotAuthorizedToWithdraw();
error NotOwner();
error NotApprovedSigner();
error ArraysDontMatch();
error InsufficientMultiplierBalance();
import "hardhat/console.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {iIngotToken} from "../interfaces/IIngotToken.sol";
import {iKobolds} from "../interfaces/IKobolds.sol";
import {iShards} from "../interfaces/IShards.sol";

/// @title Kobalds Staking Contract
/// @author 0xSimon_
/// @notice This contract allows kobalds Holders to stake for $RIG. Rewards are earned on a per-round basis and users must register for the newest round.
/// @dev to do: Explain to a developer any extra details

/// @notice , technically numAxes and numKobolds can overflow and ruin the bitmap, but
/// the probability is basically 0. To Buy 1 Axe Requires 1 Day Of Staking
/// Meaning If Somebody Owned All 8888 Pieces of the collection,
/// They Would Need To Stake for  2^64 / 8888  = 2,070,000,000,000,000 Days ... Aka More than 5 Billion Years

contract KobaldsStakeUpgrade is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using Strings for uint256;

    uint256 private constant axeMultiplier = 5; //5%
    uint256 private constant candleMultiplier = 5; //5%
    uint256 public rewardPerSecond = 100 ether / uint256(1 days);

    address private signer;
    address private rewardAggregator;
    address public kobalds;

    iIngotToken private rigToken;
    iShards private shards;

    /*
    [0...63] numAxes Used On Token
    [64..127] numCandles Used On Token
    [128..191] Number of Shards Redeemed
    [192..256] lastUpdateTimestamp
    */
    mapping(uint256 => uint256) private _packedTokenData;

    /*
    --:packedInfo Breakdown:--
    [0...63] numAxes
    [64...127] numCandles
    [128...191] numNfts
    [192...255] lastUpdateTimestamp
    */
    mapping(address => GeneralStakerInfo) public generalStakerInfo;
    struct GeneralStakerInfo {
        uint256 _packedInfo;
        uint256 accumulatedRewards;
    }

    //~~~~BITMAP INFO~~~~
    uint256 private constant blankShardId = 0;
    uint256 private constant _BITMASK_DATA_ENTRY = (1 << 64) - 1;

    //Packed Address Data Bit Vars
    uint256 private constant BITPOS_NUM_AXES = 0;
    uint256 private constant BITPOS_NUM_CANDLES = 64;
    uint256 private constant BITPOS_NUM_NFTS_STAKED = 128;
    uint256 private constant BITPOS_NUM_SHARDS_REDEEMED = 128;
    uint256 private constant BITPOS_LAST_TIMESTAMP = 192;
    uint256 private constant _BITMASK_LAST_TIMESTAMP = (1 << 192) - 1;

    // uint256 private constant _BITMASM_LAST_TIMESTAMP_COMPLEMENT = ~_BITMASK_LAST_TIMESTAMP;

    constructor() {
        //.....
    }

    /*
          ...............~~~~~~~~~~~~~~~...............
                            Staking
          ...............~~~~~~~~~~~~~~~...............
    */
    function batchStake(uint256[] calldata tokenIds)
        external
        updateReward(_msgSender())
    {
        iKobolds(kobalds).batchStake(tokenIds);
        //Only 8888 NFTS Total So No Chance Of Overflow

        generalStakerInfo[_msgSender()]._packedInfo +=
            tokenIds.length *
            (1 << BITPOS_NUM_NFTS_STAKED);
    }

    //TODO: Finish Implementing Signatures
    function batchUnstake(
        uint256[] calldata tokenIds,
        bytes[] calldata signatures,
        uint256[] calldata maxes
    ) external updateReward(_msgSender()) nonReentrant {
        //Two Ifs Save Gas Rather Than Condensing with && operator
        if (tokenIds.length != maxes.length) revert ArraysDontMatch();
        if (maxes.length != signatures.length) revert ArraysDontMatch();
        uint256 NUM_SHARDS_TO_CLAIM;

        //Verifies Signatures To Check If Kobald Is Eligible For A Shard
        for (uint256 i = 0; i < signatures.length; ++i) {
            if (maxes[i] == 0) continue;
            uint256 numShardsAlreadyClaimed = getNumberOfShardsRedeemed(
                tokenIds[i]
            );
            uint256 _numShardsToClaim = maxes[i] - numShardsAlreadyClaimed;
            if (_numShardsToClaim == 0) continue;
            if (_numShardsToClaim > 0) NUM_SHARDS_TO_CLAIM += _numShardsToClaim;
            bytes32 hash = keccak256(
                abi.encodePacked(maxes[i].toString(), tokenIds[i])
            );
            if (hash.toEthSignedMessageHash().recover(signatures[i]) != signer)
                revert NotApprovedSigner();

                //TODO: Decide If We Put This On Bottom
            //Will Never Affect Top Bits As Shard Value Will Be < 56
            _packedTokenData[tokenIds[i]] += (_numShardsToClaim *
                (1 << BITPOS_NUM_SHARDS_REDEEMED));
        }
        if (NUM_SHARDS_TO_CLAIM > 0) {
            shards.mint(_msgSender(), blankShardId, NUM_SHARDS_TO_CLAIM);
        }
        iKobolds(kobalds).batchUnstake(tokenIds);
        generalStakerInfo[_msgSender()]._packedInfo -=
            tokenIds.length *
            (1 << BITPOS_NUM_NFTS_STAKED);
    }

    /*
        ...............~~~~~~~~~~~~~~~...............
*                      Staking Utilities
        ...............~~~~~~~~~~~~~~~...............
*/

    function calculateMulitplierRewardToAdd(uint256[] calldata tokenIds)
        public
        view
        returns (uint256)
    {
        // TODO: Consult On Team On This. Will add a lot of gas for no reason
        uint256 extraRewards;
        uint256 _candleMultiplier = candleMultiplier;
        uint256 _axeMultiplier = axeMultiplier;
        uint256 _rewardPerSecond = rewardPerSecond;

        for (uint256 i; i < tokenIds.length; ++i) {
            (
                uint256 lastUpdateTimestamp,
                ,
                uint256 appliedAxes,
                uint256 appliedCandles
            ) = unpackTokenData(tokenIds[i]);
            if (lastUpdateTimestamp == 0) continue;

            uint256 tokensAccumulatedFromCurrentTarget;
            assembly {
                // TODO: Check Math Here (Write Tests)... But First Consult With Team Before Doing Extra Work...
                //  tokensAccumulatedFromCurrentTarget = rewardPerSecond * (block.timestamp - lastUpdateTimestamp)
                let timeDelta := sub(timestamp(), lastUpdateTimestamp)
                tokensAccumulatedFromCurrentTarget := mul(
                    _rewardPerSecond,
                    timeDelta
                )
                // extraRewards += axeMultiplier * appliedAxes * tokensAccumulatedFromCurrentTarget / 100

                extraRewards := add(
                    extraRewards,
                    mul(
                        mul(_axeMultiplier, appliedAxes),
                        div(tokensAccumulatedFromCurrentTarget, 100)
                    )
                )
                // extraRewards += candleMultiplier * appliedCandles * tokensAccumulatedFromCurrentTarget / 100
                extraRewards := add(
                    extraRewards,
                    mul(
                        mul(_candleMultiplier, appliedCandles),
                        div(tokensAccumulatedFromCurrentTarget, 100)
                    )
                )
            }
        }
        return extraRewards;
    }

    function purchaseAxeAndCandle(uint256 numAxes, uint256 numCandles)
        external
    {
        /*
         [0...63] numAxes
         [64...127] numCandles
         Condensed Into One Call
        */
        //TODO: Check If We Want To Include Multipliers If We Do, Add Purchase Logic With Our ERC20 -- Rig Token
        //Currently Only Used For Testing
        uint128 packedPurchase = uint128(
            (numCandles * (1 << BITPOS_NUM_CANDLES)) + numAxes
        );
        generalStakerInfo[_msgSender()]._packedInfo += packedPurchase;
    }

    //TODO: Decide With Team If We Want Multipliers Implemented
    function applyMultipliersOnTarget(
        uint256 numAxesToUse,
        uint256 numCandlesToUse,
        uint256 targetTokenId
    ) external updateReward(msg.sender) {
        /*
         [0...63] numAxes
         [64...127] numCandles
         Condensed Into One Call
        */
        (uint256 numAxes, uint256 numCandles) = getNumMultipliers(_msgSender());
        if (numAxesToUse > numAxes) revert InsufficientMultiplierBalance();
        if (numCandlesToUse > numCandles)
            revert InsufficientMultiplierBalance();
        /*
       Unchecked Saves 5000 Gas. 
       Overflow Not Possible Since We Check Balance
       */
        //TODO: decide if we want unchecked or not
        /*
            Axes Stored On Lower Bits [0...63]
            Candles Stored On [64...127]
            Fix In Lower 128 Bits
        */

        uint256 packedTokenInfo = _packedTokenData[targetTokenId];
        assembly {
            //Clean The Top 64 Bits Since lastTimestamp BITPOS starts at 192
            packedTokenInfo := and(packedTokenInfo, _BITMASK_LAST_TIMESTAMP)
            //Update The Timestamp
            packedTokenInfo := add(
                packedTokenInfo,
                shl(BITPOS_LAST_TIMESTAMP, timestamp())
            )
        }
        _packedTokenData[targetTokenId] = packedTokenInfo;

        // // for(uint i; i< tokenIds.length;++i){
        // //     uint packedTokenInfo = _packedTokenData[tokenIds[i]];
        // //     assembly{
        // //         //Clean The Top 64 Bits Since lastTimestamp BITPOS starts at 192
        // //         packedTokenInfo := and(packedTokenInfo, _BITMASK_LAST_TIMESTAMP)
        // //         //Update The Timestamp
        // //         packedTokenInfo:= add(packedTokenInfo,shl(BITPOS_LAST_TIMESTAMP,timestamp()))

        // //     }
        // //     _packedTokenData[tokenIds[i]] = packedTokenInfo;

        // // }
        generalStakerInfo[_msgSender()]._packedInfo -= uint128(
            numAxesToUse + (numCandlesToUse * (1 << BITPOS_NUM_CANDLES))
        );
        /* 
        TODO: decide if we want unchecked or not
        Users Will Realistically Never Be Able To Make These Values Overflow As Mentioned At Top Of Contract. 
        */
        /*
            Axes Stored On Lower Bits [0...63]
            Candles Stored On [64...127]
        */
        _packedTokenData[targetTokenId] += uint128(
            (numAxesToUse + (numCandlesToUse * (1 << BITPOS_NUM_CANDLES)))
        );
        //    }
    }

    /*
        ...............~~~~~~~~~~~~~~~...............
*                      Update Rewards
        ...............~~~~~~~~~~~~~~~...............
*/
    modifier updateReward(address account) {
        uint256 reward = nextReward(account);
        unchecked {
            uint256 packedInfo = generalStakerInfo[account]._packedInfo;
            assembly {
                //Clean The Top 64 Bits Since lastTimestamp BITPOS starts at 192
                packedInfo := and(packedInfo, _BITMASK_LAST_TIMESTAMP)
                //Update The Timestamp
                packedInfo := add(
                    packedInfo,
                    shl(BITPOS_LAST_TIMESTAMP, timestamp())
                )
            }
            //Reward Can Never Underflow / Probability of Overflow is EXTREMELY Unlikely
            generalStakerInfo[account].accumulatedRewards += reward;
            generalStakerInfo[account]._packedInfo = packedInfo;
        }
        _;
    }

    /*
        ...............~~~~~~~~~~~~~~~...............
*                      Unpack User Data
        ...............~~~~~~~~~~~~~~~...............
*/
    function unpackUserData(address account)
        public
        view
        returns (
            uint256 numAxes,
            uint256 numCandles,
            uint256 numNfts,
            uint256 lastUpdateTimestamp
        )
    {
        uint256 packedInfo = generalStakerInfo[account]._packedInfo;
        assembly {
            //No Need To SHR Since Bitpos = 0
            numAxes := and(packedInfo, _BITMASK_DATA_ENTRY)
            numCandles := and(
                shr(BITPOS_NUM_CANDLES, packedInfo),
                _BITMASK_DATA_ENTRY
            )
            numNfts := and(
                shr(BITPOS_NUM_NFTS_STAKED, packedInfo),
                _BITMASK_DATA_ENTRY
            )
            lastUpdateTimestamp := and(
                shr(BITPOS_LAST_TIMESTAMP, packedInfo),
                _BITMASK_DATA_ENTRY
            )
        }
    }

    /*
        ...............~~~~~~~~~~~~~~~...............
*                      Unpack Token Data
        ...............~~~~~~~~~~~~~~~...............
*/
    function unpackTokenData(uint256 tokenId)
        public
        view
        returns (
            uint256 lastUpdateTimestamp,
            uint256 numShardsClaimed,
            uint256 numAxes,
            uint256 numCandles
        )
    {
        uint256 packedData = _packedTokenData[tokenId];
        assembly {
            //No Need To SHR on axes since BITPOS = 0
            numAxes := and(packedData, _BITMASK_DATA_ENTRY)
            numCandles := and(
                shr(BITPOS_NUM_CANDLES, packedData),
                _BITMASK_DATA_ENTRY
            )
            numShardsClaimed := and(
                shr(BITPOS_NUM_SHARDS_REDEEMED, packedData),
                _BITMASK_DATA_ENTRY
            )
            lastUpdateTimestamp := and(
                shr(BITPOS_LAST_TIMESTAMP, packedData),
                _BITMASK_DATA_ENTRY
            )
        }
    }

    /*
        ...............~~~~~~~~~~~~~~~...............
*                         Getters
        ...............~~~~~~~~~~~~~~~...............
*/
    function getNumMultipliers(address account)
        public
        view
        returns (uint256 numAxes, uint256 numCandles)
    {
        uint256 packedInfo = generalStakerInfo[account]._packedInfo;
        assembly {
            numAxes := and(
                shr(BITPOS_NUM_AXES, packedInfo),
                _BITMASK_DATA_ENTRY
            )
            numCandles := and(
                shr(BITPOS_NUM_CANDLES, packedInfo),
                _BITMASK_DATA_ENTRY
            )
        }
    }

    function getNumberOfShardsRedeemed(uint256 tokenId)
        public
        view
        returns (uint256 numShards)
    {
        uint256 packedData = _packedTokenData[tokenId];
        assembly {
            numShards := and(
                shr(BITPOS_NUM_SHARDS_REDEEMED, packedData),
                _BITMASK_DATA_ENTRY
            )
        }
    }

    function nextReward(address account) public view returns (uint256 reward) {
        unchecked {
            //Can never be greater than the end timestamp. That logic is handled in the updateReward modifier.
            (, , uint256 numNftsStaked, uint256 userTimestamp) = unpackUserData(
                account
            );
            if (userTimestamp == 0) return 0;
            assembly {
                //Time Delta = Current Timestamp - User Last Update Timestamp
                let timeDelta := sub(timestamp(), userTimestamp)
                // Reward = (rewardsPerSecond *  timeDelta * numNftsStaked)
                reward := mul(
                    sload(rewardPerSecond.slot),
                    mul(timeDelta, numNftsStaked)
                )
            }
        }
    }

    function viewReward() public view returns (uint256) {
        return
            generalStakerInfo[_msgSender()].accumulatedRewards +
            nextReward(_msgSender());
    }

    function viewWalletReward(address account) public view returns (uint256) {
        return
            generalStakerInfo[_msgSender()].accumulatedRewards +
            nextReward(account);
    }

    /*
          ...............~~~~~~~~~~~~~~~...............
                            Setters
          ...............~~~~~~~~~~~~~~~...............
    */
    function setKobalds(address _address) external onlyOwner {
        kobalds = _address;
    }

    function setShards(address _address) external onlyOwner {
        shards = iShards(_address);
    }

    function setRewardAggregator(address _address) external onlyOwner {
        rewardAggregator = _address;
    }

    function setRewardPerSecond(uint256 newRewardPerSecond) external onlyOwner {
        rewardPerSecond = newRewardPerSecond;
    }

    function setRigToken(address _rig) external onlyOwner {
        rigToken = iIngotToken(_rig);
    }

    function setSigner(address _address) external onlyOwner {
        signer = _address;
    }

    /*
          ...............~~~~~~~~~~~~~~~...............
                           Withdrawals
          ...............~~~~~~~~~~~~~~~...............
    */

    function withdrawReward() external updateReward(_msgSender()) {
        //We Can Read Accumulated Rewards Directly Since modifier will update state
        uint256 reward = generalStakerInfo[_msgSender()].accumulatedRewards;
        if (reward == 0) revert NoRewardToWithdraw();
        delete generalStakerInfo[_msgSender()].accumulatedRewards;
        //New Timestamp Already Updates in the modifier so we don't have to worry
        rigToken.mint(_msgSender(), reward);
    }

    function withdrawRewardAggregator(address account)
        external
        updateReward(account)
    {
        require(_msgSender() == rewardAggregator, "Unauthorized");
        if (_msgSender() == address(0)) revert("Invalid Address");
        //We Can Read Accumulated Rewards Directly Since modifier will update state
        uint256 reward = generalStakerInfo[account].accumulatedRewards;
        if (reward == 0) revert NoRewardToWithdraw();
        delete generalStakerInfo[account].accumulatedRewards;
        rigToken.mint(account, reward);
    }
}

interface IMultiplierMaster {
    function getMultiplierFromTokenId(uint256 tokenId)
        external
        view
        returns (uint256);

    function getMultiplierFromAddress(address holder)
        external
        view
        returns (uint256);
}
