// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.17;   

import "@solidstate/contracts/access/ownable/Ownable.sol";
import "../libraries/LibAppStorage.sol";
import {AppStorage} from "../interfaces/IAppStorage.sol";
contract AppStorageFacet is Ownable {

    function initializeStorage(address ingotTokenAddress,address koboldAddress,address titanAddress) external onlyOwner{
        AppStorage storage ds = LibAppStorage.appStorage();
        ds.ingotTokenAddress = ingotTokenAddress;
        ds.koboldAddress = koboldAddress;
        ds.titanAddress = titanAddress;
    }
    function setIngotTokenAddress(address ingotTokenAddress) external onlyOwner{
        LibAppStorage.setIngotTokenAddress(ingotTokenAddress);
    }
      function setKoboldAddress(address koboldAddress) external onlyOwner{
        LibAppStorage.setKoboldAddress(koboldAddress);
    }
      function setTitanAddress(address titanAddress) external onlyOwner{
        LibAppStorage.setTitanAddress(titanAddress);
    }
}