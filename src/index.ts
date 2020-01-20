#!/usr/bin/env node

import program from 'commander';
import * as solc from 'solc';
import fs from 'fs';
import { Contract, Provider, Print } from './generate';
import { ImportReadable } from './syntax';

function compileSolidity(source: string, name: string) {
    const compiled: solc.OutputDescription = JSON.parse(solc.compile(source));
    if (compiled.errors) throw new Error(compiled.errors.map(err => err.formattedMessage).toString());
    return compiled.contracts[name];
}

function toInputDescription(name: string, source: string) {
    let desc: solc.InputDescription = { language: 'Solidity', sources: {} };
    desc.sources[name] = { content: source };
    desc.settings = { outputSelection: { '*': { '*': ['*'] }}};
    return JSON.stringify(desc);
}

program
    .command('generate <source> [destination]')
    .action(function (src, dst) {
        const source = fs.readFileSync(src, 'utf8');
        const input = toInputDescription(src, source);
        const compiled = compileSolidity(input, src);

        const provider = new Provider();

        const target = [Print(ImportReadable())];
        target.push(Print(provider.createInterface()));

        for (let k in compiled) {
            const contract = compiled[k];
            const generated = new Contract(k, contract.abi, contract.evm.bytecode.object, provider);
            target.push(Print(generated.createClass()));
        }

        dst ? fs.writeFileSync(dst, target.join('\n')) : console.log(target.join('\n'));
        process.exit(0);
    });

program.parse(process.argv);
process.exit(1);



  