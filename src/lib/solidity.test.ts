import assert from 'assert';
import { Hash, NameFromABI } from './solidity';
import { Function } from 'solc';

describe('abi helpers', function () {
  it('should compute a valid method id', async function () {
    assert.equal(Hash('baz(uint32,bool)').slice(0, 8), 'CDCD77C0');
  })

  it('should return the full function name with args', async function () {
    const abi: Function = { 
        type: 'function', 
        name: 'baz', 
        stateMutability: 'pure',
        inputs: [
            {
                name: '1',
                type: 'uint32',
            },
            {
                name: '2',
                type: 'bool',
            }
        ]
    };
    assert.equal(NameFromABI(abi), 'baz(uint32,bool)');
  })
})
