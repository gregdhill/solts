import ts from "typescript";
import { CreateParameter, Uint8ArrayType, DeclareConstant } from "./syntax";
import { Provider } from "./provider";
import { Function, Event } from 'solc';
import { OutputToType } from './solidity';

type FunctionOrEvent = Function | Event;

export const DecodeName = ts.createIdentifier('Decode');

function output(decodeFn: ts.CallExpression, abi: Function): ts.Block {
    const named = abi.outputs.filter(out => out.name !== "")
    if (abi.outputs.length !== 0 && abi.outputs.length === named.length) {
        const setter = ts.createVariableStatement([], ts.createVariableDeclarationList(
            [ts.createVariableDeclaration(ts.createArrayBindingPattern(abi.outputs.map(out => ts.createBindingElement(undefined, undefined, out.name))), undefined, decodeFn)], ts.NodeFlags.Const));
    
        return ts.createBlock([
            setter,
            ts.createReturn(ts.createObjectLiteral(abi.outputs.map(out => ts.createPropertyAssignment(out.name, ts.createIdentifier(out.name)))))
        ], true);
    } else {
        return ts.createBlock([
            ts.createReturn(abi.outputs.length > 0 ? decodeFn : undefined)
        ])
    }
}

function decoder(abi: Function, client: ts.Identifier, provider: Provider, data: ts.Identifier) {
    const types = ts.createArrayLiteral(abi.outputs.map(arg => ts.createLiteral(arg.type)));
    const decodeFn = provider.methods.decode.call(client, data, types);
    return decodeFn;
}

export const Decode = (abi: FunctionOrEvent[], provider: Provider) => {
    const client = ts.createIdentifier('client');
    const data = ts.createIdentifier('data');

    return DeclareConstant(DecodeName, 
        ts.createArrowFunction(undefined, [provider.getTypeArgumentDecl()], [
            CreateParameter(client, provider.getTypeNode()), CreateParameter(data, Uint8ArrayType)
        ], undefined, undefined, ts.createBlock([
            ts.createReturn(ts.createObjectLiteral(abi.filter(abi => abi.type === "function").map(abi => {
                    return ts.createPropertyAssignment(abi.name, ts.createArrowFunction(
                        undefined,
                        undefined,
                        [],
                        OutputToType(abi as Function),
                        undefined,
                        output(decoder(abi as Function, client, provider, data), abi as Function),
                    ))
                }, true),true)
            )
        ])), true);
}