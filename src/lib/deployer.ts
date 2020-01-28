import ts from "typescript";
import { CreateParameter, Uint8ArrayType, DeclareConstant, CreateNewPromise, PromiseType, AccessThis, CreateCallbackDeclaration, RejectOrResolve, CreateCall, BufferFrom, ExportToken, StringType } from "./syntax";
import { Provider } from "./provider";
import { Function, Event } from 'solc';
import { GetRealType } from './solidity';
import { ContractName } from "./contract";

const data = ts.createIdentifier("data");
const payload = ts.createIdentifier("payload");
const bytecode = ts.createIdentifier("bytecode");

const err = ts.createIdentifier("err");
const addr = ts.createIdentifier("addr");

const client = ts.createIdentifier("client");
const address = ts.createIdentifier("address");
const callback = ts.createIdentifier('linker');

export const DeployName = ts.createIdentifier('Deploy');

export const Deploy = (abi: Function, bin: string, provider: Provider) => {
    const parameters = (abi) ? abi.inputs.map(input => CreateParameter(input.name, GetRealType(input))) : [];
    const output = ts.createExpressionWithTypeArguments([ts.createTypeReferenceNode(ContractName, [ts.createTypeReferenceNode('Tx', undefined)])], PromiseType);

    let statements: ts.Statement[] = [];
    statements.push(DeclareConstant(bytecode, CreateCall(callback, [ts.createLiteral(bin)])));

    if (abi) {
        const inputs = ts.createArrayLiteral(abi.inputs.map(arg => ts.createLiteral(arg.type)));
        const args = abi.inputs.map(arg => ts.createIdentifier(arg.name));
        statements.push(DeclareConstant(data, ts.createBinary(bytecode, ts.SyntaxKind.PlusToken, 
            provider.methods.encode.call(client, ts.createLiteral(""), inputs, ...args)
        )));            
    } else statements.push(DeclareConstant(data, bytecode));

    statements.push(DeclareConstant(payload, provider.methods.payload.call(client, data, undefined)));

    const deployFn = provider.methods.deploy.call(
        client,
        payload, 
        CreateCallbackDeclaration(err, addr, [
            RejectOrResolve(err, [
                DeclareConstant(address, CreateCall(ts.createPropertyAccess(
                        CreateCall(ts.createPropertyAccess(
                            BufferFrom(addr), ts.createIdentifier("toString")), [ts.createLiteral("hex")]), ts.createIdentifier("toUpperCase")), undefined))
            ], [ts.createNew(ContractName, [], [client, address])])
        ], undefined, true)
    );
    
    statements.push(ts.createReturn(CreateNewPromise([ts.createStatement(deployFn)])));

    const type = 'Tx';
    return ts.createFunctionDeclaration(
        undefined, 
        [ExportToken], 
        undefined, 
        DeployName, 
        [ts.createTypeParameterDeclaration(type)], 
        [
            CreateParameter(client, ts.createTypeReferenceNode('Provider', [ts.createTypeReferenceNode(type, [])])),
            CreateParameter(callback, ts.createFunctionTypeNode(undefined, [CreateParameter('bytecode', StringType)], StringType)),
            ...parameters
        ], 
        output, 
        ts.createBlock(statements, true));
}