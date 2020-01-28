import ts from "typescript";
import { Function, Event } from 'solc';
import { Provider, ErrParameter, EventParameter } from './provider';
import { 
    StringType, PromiseType, ReadableType,
    PrivateToken, ExportToken, BufferFrom, AccessThis, DeclareConstant, AsRefNode, Method,
    CreateParameter, CreateCall, CreateCallbackExpression, CreateCallbackDeclaration, CreateNewPromise, RejectOrResolve, Uint8ArrayType, PublicToken
} from './syntax';

import { Hash, NameFromABI, GetRealType, OutputToType } from './solidity';
import { EncodeName } from "./encoder";
import { DecodeName } from "./decoder";
import { CallName } from "./caller";

type FunctionOrEvent = Function | Event;

const exec = ts.createIdentifier("exec");
const data = ts.createIdentifier("data");
const client = ts.createIdentifier("client");
const address = ts.createIdentifier("address");

export const ContractName = ts.createIdentifier('Contract');

function SolidityFunction(abi: Function, provider: Provider) {
    const args = abi.inputs.map(arg => ts.createIdentifier(arg.name));
    const encode = DeclareConstant(data, 
        CreateCall(ts.createPropertyAccess(CreateCall(EncodeName, [AccessThis(client)]), abi.name), args));

    const call = ts.createCall(CallName, [
        ts.createTypeReferenceNode('Tx', undefined),
        OutputToType(abi),
    ], [
        AccessThis(client),
        AccessThis(address),
        data,
        ts.createArrowFunction(undefined, undefined, [
            CreateParameter(exec, Uint8ArrayType)
        ], undefined, undefined, ts.createBlock([
            ts.createReturn(
                CreateCall(
                    ts.createPropertyAccess(
                        CreateCall(
                            DecodeName, 
                            [AccessThis(client), exec]
                        ),
                        abi.name
                    ),
                    []
                ), 
            )
        ], true))
    ]);

    return new Method(abi.name)
        .parameters(abi.inputs.filter(arg => arg.name !== "")
            .map(arg => CreateParameter(arg.name, GetRealType(arg))))
        .declaration([
            encode,
            ts.createReturn(call)
        ], true);
}

function SolidityEvent(abi: Event, provider: Provider) {
    const callback = ts.createIdentifier("callback");
    return new Method(abi.name)
        .parameter(callback, CreateCallbackExpression([ErrParameter, EventParameter]))
        .returns(AsRefNode(ReadableType))
        .declaration([
            ts.createReturn(provider.methods.listen.call(
                AccessThis(client), 
                ts.createLiteral(Hash(NameFromABI(abi))),
                AccessThis(address),
                callback
            )),
        ]);
}

function createMethodFromABI(abi: FunctionOrEvent, provider: Provider) {
    if (abi.type === 'function') return SolidityFunction(abi, provider);
    else if (abi.type === 'event') return SolidityEvent(abi, provider);
}

export const Contract = (abi: FunctionOrEvent[], provider: Provider) => {
    return ts.createClassDeclaration(
        undefined,
        [ExportToken],
        ContractName,
        [provider.getTypeArgumentDecl()],
        undefined,
        [
            ts.createProperty(undefined, [PrivateToken], client, undefined, provider.getTypeNode(), undefined),
            ts.createProperty(undefined, [PublicToken], address, undefined, StringType, undefined),
            ts.createConstructor(
                undefined,
                undefined,
                [
                    CreateParameter(client, provider.getTypeNode()),
                    CreateParameter(address, StringType)
                ],
                ts.createBlock([
                    ts.createStatement(ts.createAssignment(AccessThis(client), client)),
                    ts.createStatement(ts.createAssignment(AccessThis(address), address))            
                ], true)
            ),
            ...abi.map(m => createMethodFromABI(m, provider))
        ],
    );
}


