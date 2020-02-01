import ts from "typescript";
import { Function, Event } from 'solc';
import { Provider, ErrParameter, EventParameter } from './provider';
import { 
    StringType, PromiseType, ReadableType,
    PrivateToken, ExportToken, BufferFrom, AccessThis, DeclareConstant, AsRefNode, Method,
    CreateParameter, CreateCall, CreateCallbackExpression, CreateCallbackDeclaration, CreateNewPromise, RejectOrResolve, Uint8ArrayType, PublicToken
} from './syntax';

import { Hash, NameFromABI, GetRealType, OutputToType, FunctionOrEvent, ContractMethods, Signature, CollapseInputs, CombineTypes, ContractMethodsList } from './solidity';
import { EncodeName } from "./encoder";
import { DecodeName } from "./decoder";
import { CallName } from "./caller";

const exec = ts.createIdentifier("exec");
const data = ts.createIdentifier("data");
const client = ts.createIdentifier("client");
const address = ts.createIdentifier("address");

export const ContractName = ts.createIdentifier('Contract');

function SolidityFunction(name: string, signatures: Signature[], provider: Provider) {
    const args = Array.from(CollapseInputs(signatures).keys()).map(key => ts.createIdentifier(key));
    const encode = DeclareConstant(data, 
        CreateCall(ts.createPropertyAccess(CreateCall(EncodeName, [AccessThis(client)]), name), args));

    const call = ts.createCall(CallName, [
        ts.createTypeReferenceNode('Tx', undefined),
        OutputToType(signatures[0]),
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
                        name
                    ),
                    []
                ), 
            )
        ], true))
    ]);

    const params = Array.from(CollapseInputs(signatures), ([key, value]) => CreateParameter(key, CombineTypes(value)));
    return new Method(name)
        .parameters(params)
        .declaration([
            encode,
            ts.createReturn(call)
        ], true);
}

function SolidityEvent(name: string, provider: Provider) {
    const callback = ts.createIdentifier("callback");
    return new Method(name)
        .parameter(callback, CreateCallbackExpression([ErrParameter, EventParameter]))
        .returns(AsRefNode(ReadableType))
        .declaration([
            ts.createReturn(provider.methods.listen.call(
                AccessThis(client), 
                ts.createLiteral(name),
                AccessThis(address),
                callback
            )),
        ]);
}

function createMethodFromABI(name: string, type: 'function' | 'event', signatures: Signature[], provider: Provider) {
    if (type === 'function') return SolidityFunction(name, signatures, provider);
    else if (type === 'event') return SolidityEvent(name, provider);
}

export const Contract = (abi: ContractMethodsList, provider: Provider) => {

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
            ...abi.map(abi => createMethodFromABI(abi.name, abi.type, abi.signatures, provider)),
        ],
    );
}


