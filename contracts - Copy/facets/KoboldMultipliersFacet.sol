// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.17;

import "@solidstate/contracts/access/ownable/Ownable.sol";
import "../libraries/LibKoboldMultipliers.sol";
import {KoboldStakingMultiplier}  from "../interfaces/IKoboldMultiplier.sol";
import "../libraries/AppStorage.sol";
contract KoboldMultipliersFacet is Ownable {
    


    function setMultiplier(KoboldStakingMultiplier memory koboldStakingMultiplier) external onlyOwner  {
        LibKoboldMultipliers.setMultiplier(koboldStakingMultiplier);

    }

    //Returns a KoboldStakingMultiplier
    function getKoboldMultiplier(uint koboldMultiplierId) external view returns(KoboldStakingMultiplier memory) {
        KoboldStakingMultiplier memory multiplier = LibKoboldMultipliers.getKoboldMultiplier(koboldMultiplierId);
        if(bytes(multiplier.name).length == 0 ) revert ("Inexistent Multiplier");
       return LibKoboldMultipliers.getKoboldMultiplier(koboldMultiplierId);
    }
    //User Can Purchase Kobold Multiplier Using Ingot Token
    function purchaseKoboldMultiplier(uint koboldMultiplierId,uint quantity) external {
        address ingotAddress = AppStorage.getIngotTokenAddress();
        KoboldStakingMultiplier memory multiplier = LibKoboldMultipliers.getKoboldMultiplier(koboldMultiplierId);
        IERC20Like(ingotAddress).transferFrom(msg.sender,address(this),multiplier.price);
        LibKoboldMultipliers.purchaseMultiplier(msg.sender,koboldMultiplierId,quantity);
    }
    //We Get User Balance
    function getUserBalance(address user, uint koboldMultiplerId) external view returns(uint) {
        return LibKoboldMultipliers.getUserBalance(user,koboldMultiplerId);
    }

    //Approve And Unapprove Multiplier Spenders... This Will Be Reserved For The Staking Contracts To Use
    function approveSpender(address spender) external onlyOwner {
        LibKoboldMultipliers.approveSpender(spender);
    }
    function unapproveSpender(address spender) external onlyOwner {
        LibKoboldMultipliers.unapproveSpender(spender);
    }


 
}

interface IERC20Like {
    function transferFrom(address from, address to,uint amount) external;
}