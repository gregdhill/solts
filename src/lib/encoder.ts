import ts from "typescript";
import { CreateParameter, DeclareConstant } from "./syntax";
import { Provider } from "./provider";
import { Function, Event } from 'solc';
import { Hash, NameFromABI, GetRealType } from './solidity';

type FunctionOrEvent = Function | Event;

export const EncodeName = ts.createIdentifier('Encode');

function encoder(abi: Function, client: ts.Identifier, provider: Provider) {
    const fn = Hash(NameFromABI(abi)).slice(0, 8);
    const inputs = ts.createArrayLiteral(abi.inputs.map(arg => ts.createLiteral(arg.type)));
    const args = abi.inputs.map(arg => ts.createIdentifier(arg.name));
    const encodeFn = provider.methods.encode.call(client, ts.createLiteral(fn), inputs, ...args);
    return encodeFn;
}

export const Encode = (abi: FunctionOrEvent[], provider: Provider) => {
    const client = ts.createIdentifier('client');
    return DeclareConstant(EncodeName, 
        ts.createArrowFunction(undefined, [provider.getTypeArgumentDecl()], [CreateParameter(client, provider.getTypeNode())], undefined, undefined, ts.createBlock([
            ts.createReturn(ts.createObjectLiteral(abi.filter(abi => abi.type === "function").map(abi => {
                    return ts.createPropertyAssignment(abi.name, ts.createArrowFunction(
                        undefined,
                        undefined,
                        abi.inputs.filter(arg => arg.name !== "").map(arg => CreateParameter(arg.name, GetRealType(arg))),
                        undefined,
                        undefined,
                        ts.createBlock([ts.createReturn(encoder(abi as Function, client, provider))], false),
                    ))
                }, true),true)
            )
        ])), true);
}