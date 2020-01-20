pragma solidity >=0.0.0;

contract Storage {
  int data;

  constructor() public {
    data = 0;
  }

  function set(int x) public {
    data = x;
  }

  function get() public view returns (int ret) {
    return data;
  }
}

