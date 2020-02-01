import ts from "typescript";
import { ImportReadable } from './lib/syntax';
import { Provider } from './lib/provider';
import { Caller } from './lib/caller';
import { Encode } from './lib/encoder';
import { Decode } from './lib/decoder';
import { Contract } from './lib/contract';
import { Function } from 'solc';
import { ExportToken } from "./lib/syntax";
import { Deploy } from "./lib/deployer";
import { GetContractMethods, FunctionOrEvent } from "./lib/solidity";
import { Replacer } from "./lib/replacer";

export * from 'solc';
export { 
    InputDescriptionFromFiles,
    ImportLocal,
    EncodeInput, 
    DecodeOutput,
    TokenizeLinks,
} from './lib/compile';

export type Compiled = {
    name: string
    abi: FunctionOrEvent[]
    bin: string
    links: Array<string>
}

export function NewFile(contracts: Compiled[]): ts.Node[] {
    const provider = new Provider();

    return [
        ImportReadable(),
        provider.createInterface(),
        Caller(provider),
        Replacer(),
        ...contracts.map(contract => {
            const methods = GetContractMethods(contract.abi);

            let deploy: Function;
            contract.abi.map(abi => { if (abi.type == 'constructor') deploy = abi });
        
            return ts.createModuleDeclaration(
                undefined, 
                [ExportToken],
                ts.createIdentifier(contract.name),
                ts.createModuleBlock([
                    Deploy(deploy, contract.bin, contract.links, provider),
                    Contract(methods, provider),
                    Encode(methods, provider),
                    Decode(methods, provider),
                ])
            )
        })
    ]
}

export function Print(...nodes: ts.Node[]) {
    const target = ts.createSourceFile("", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    return nodes.map(node => printer.printNode(ts.EmitHint.Unspecified, node, target)).join('\n');
}