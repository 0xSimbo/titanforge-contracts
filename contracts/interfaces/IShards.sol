//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface iShards {
    function mint(
        address account,
        uint256 id,
        uint256 amount
    ) external;

    function burnShard(
        address from,
        uint256 shardId,
        uint256 amount
    ) external;
}
