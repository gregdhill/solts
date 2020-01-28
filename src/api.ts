import ts from "typescript";
import { ImportReadable } from './lib/syntax';
import { Provider } from './lib/provider';
import { Caller } from './lib/caller';
import { Encode } from './lib/encoder';
import { Decode } from './lib/decoder';
import { Contract } from './lib/contract';
import { Function, Event, FunctionInput, FunctionOutput } from 'solc';
import { ExportToken } from "./lib/syntax";
import { Deploy } from "./lib/deployer";

export * from 'solc';
export { 
    InputDescriptionFromFiles,
    ImportLocal,
    EncodeInput, 
    DecodeOutput
} from './lib/compile';
export type FunctionOrEvent = Function | Event;
type FunctionIO = FunctionInput & FunctionOutput;
export type Compiled = {
    name: string
    abi: FunctionOrEvent[]
    bin: string
}

export function NewFile(contracts: Compiled[]): ts.Node[] {
    const provider = new Provider();

    return [
        ImportReadable(),
        provider.createInterface(),
        Caller(provider),
        ...contracts.map(contract => {
            const abi = clean(contract.abi);

            let deploy: Function;
            let methods: FunctionOrEvent[] = [];
            abi.map(abi => (abi.type == 'constructor') ? deploy = abi : methods.push(abi));
        

            return ts.createModuleDeclaration(
                undefined, 
                [ExportToken],
                ts.createIdentifier(contract.name),
                ts.createModuleBlock([
                    Deploy(deploy, contract.bin, provider),
                    Contract(methods, provider),
                    Encode(abi, provider),
                    Decode(abi, provider),
                ])
            )
        })
    ]
}

function clean(abi: FunctionOrEvent[]) {
    // solidity allows duplicate function names
    // so we need to iterate the abi and append args
    let names = abi.map(item => item.name)
    names = names.filter(item => names.indexOf(item) !== names.lastIndexOf(item));
    abi.filter(abi => abi.type === 'function')
        .map(item => {
            if (item.name === "") return;
            if (names.includes(item.name)) {
                item.name += (item.inputs as FunctionIO[]).map(item => item.name).join('');
            }
        });
    return abi;
}

export function Print(...nodes: ts.Node[]) {
    const target = ts.createSourceFile("", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    return nodes.map(node => printer.printNode(ts.EmitHint.Unspecified, node, target)).join('\n');
}