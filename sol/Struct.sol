pragma solidity >=0.0.0;
pragma experimental ABIEncoderV2;

contract Struct {
    struct Data {
        uint value;
        address addr;
    }
    Data public data;

    constructor() public {
        data.addr = msg.sender;
        data.value = 0;
    }

    function set(Data memory sent) public {
        data.addr = sent.addr;
        data.value = sent.value;
    }
}