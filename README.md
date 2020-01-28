# Solidity to Typescript

![](https://github.com/gregdhill/ts-sol/workflows/test/badge.svg)

Generate class definitions from a Solidity contract:

```shell
solc sol/Storage.sol --combined-json abi,bin | ts-sol -
```