// SPDX-License-Identifier: MIT


pragma solidity ^0.8.17;

contract HealthBoosterTester {
    event KoboldHealthBoosterUsed(uint indexed koboldTokenId,uint indexed healthToGive,uint indexed quantityUsed);

    function emitFunction() external {

        emit KoboldHealthBoosterUsed(10,5,3);
    }

    function emitSpecificFunction(uint koboldTokenId,uint healthToGive,uint quantityToUse) external {
        emit KoboldHealthBoosterUsed(koboldTokenId,healthToGive,quantityToUse);
    }
    
    function loopedEvent(uint[] memory koboldTokenId,uint[] memory healthToGive,uint[] memory quantityToUse) external {
        for(uint i; i<koboldTokenId.length;++i){
            emit KoboldHealthBoosterUsed(koboldTokenId[i],healthToGive[i],quantityToUse[i]);
        }
    }

}