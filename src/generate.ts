import ts from "typescript";
import { Keccak } from 'sha3';
import { ABIFunction, ABIFunctionIO } from 'solc';

import { 
    StringType, VoidType, Uint8ArrayType, AnyType, NumberType, BooleanType, PromiseType, TupleType,
    PrivateToken, ExportToken,
    bufferFrom, asArray, accessThis, accessThisProperty, declareConstant,
    createParameter, createCall, createCallbackExpression, createCallbackDeclaration, createNewPromise, createPromiseBody, 
} from './syntax';

function hash(str: string) {
    const hash = (new Keccak(256)).update(str);
    return hash.digest('hex').toUpperCase();
}

function getRealType(obj: ABIFunctionIO): ts.TypeNode {
    const type = obj.type;
    if (/int/i.test(type)) return NumberType;
    else if (/bool/i.test(type)) return BooleanType;
    else if (/tuple/i.test(type)) return TupleType(obj.components.map(comp => getRealType(comp)));
    else return StringType; // address, bytes
}

function toFullName(abi: ABIFunction): string {
    if (abi.name.indexOf('(') !== -1) return abi.name;
    const typeName = (abi.inputs).map(i => i.type).join();
    return abi.name + '(' + typeName + ')';
}

export function Print(node: ts.Node) {
    const target = ts.createSourceFile("", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    return printer.printNode(ts.EmitHint.Unspecified, node, target)
}

export class Provider {
    private name = ts.createIdentifier("Provider");
    private type = ts.createIdentifier("Tx");

    methods = {
        deploy: ts.createIdentifier("deploy"),
        call: ts.createIdentifier("call"),
        payload: ts.createIdentifier("payload"),
        encode: ts.createIdentifier("encode"),
        decode: ts.createIdentifier("decode"),
    }

    createInterface() {
        return ts.createInterfaceDeclaration(undefined, undefined, this.name, [this.getTypeArgumentDecl()], undefined, [
            ts.createMethodSignature(undefined, [createParameter("msg", this.getTypeArgument()), createParameter("callback", createCallbackExpression(ts.createIdentifier("err"), ts.createIdentifier("addr")))], VoidType, this.methods.deploy, undefined),
            ts.createMethodSignature(undefined, [createParameter("msg", this.getTypeArgument()), createParameter("callback", createCallbackExpression(ts.createIdentifier("err"), ts.createIdentifier("exec")))], VoidType, this.methods.call, undefined),
            ts.createMethodSignature(undefined, [createParameter("data", StringType), createParameter("address", StringType, undefined, true)], this.getTypeArgument(), this.methods.payload, undefined),
            ts.createMethodSignature(undefined, [createParameter("name", StringType), createParameter("inputs", asArray(StringType)), createParameter("args", asArray(AnyType), undefined, false, true)], StringType, this.methods.encode, undefined),
            ts.createMethodSignature(undefined, [createParameter("data", Uint8ArrayType), createParameter("outputs", asArray(StringType))], AnyType, this.methods.decode, undefined)
        ]);
    }

    getTypeNode(): ts.TypeNode {
        return ts.createTypeReferenceNode(this.name, [this.getTypeArgument()]);
    }

    getTypeArgument(): ts.TypeNode {
        return ts.createTypeReferenceNode(this.type, undefined);
    }

    getTypeArgumentDecl(): ts.TypeParameterDeclaration {
        return ts.createTypeParameterDeclaration(this.type);
    }
}

export class Contract {
    provider: Provider;

    name: string;
    abi: ABIFunction[];
    bytecode: string;

    type: ts.TypeReferenceNode;

    client = ts.createIdentifier("client");
    address = ts.createIdentifier("address");

    methods = {
        deploy: ts.createIdentifier("deploy"),
        withAddress: ts.createIdentifier("withAddress"),
    }

    constructor(name: string, abi: ABIFunction[], bytecode: string, provider: Provider) {
        this.provider = provider;
        this.name = name;
        this.abi = abi;
        this.bytecode = bytecode;
        this.type = ts.createTypeReferenceNode(name, [this.provider.getTypeArgument()]);
    }

    createConstructor() {
        const provider = this.provider.getTypeNode();

        const parameters = [
            createParameter(this.client, provider),
            createParameter(this.address, StringType, null, true)
        ];
    
        let statements = [
            ts.createStatement(ts.createAssignment(accessThis(this.client), this.client)),
            ts.createStatement(ts.createAssignment(accessThis(this.address), this.address))
        ];
    
        return [
            ts.createProperty(undefined, [PrivateToken], this.client, undefined, provider, undefined),
            ts.createProperty(undefined, [PrivateToken], this.address, undefined, StringType, undefined),
            ts.createConstructor(
                undefined,
                undefined,
                parameters,
                ts.createBlock(statements, true)
            )
        ];
    }

    createDeploy(abi?: ABIFunction) {
        const name = this.methods.deploy;
        const parameters = (abi) ? abi.inputs.map(input => createParameter(input.name, getRealType(input))) : [];
        const output = ts.createExpressionWithTypeArguments([this.type], PromiseType);

        const encodeFn = accessThisProperty(this.client, this.provider.methods.encode);
        const payloadFn = accessThisProperty(this.client, this.provider.methods.payload);
        const bytecode = ts.createIdentifier("bytecode");
        const data = ts.createIdentifier("data");
        const payload = ts.createIdentifier("payload");

        let statements: ts.Statement[] = [];
        statements.push(declareConstant(bytecode, ts.createLiteral(this.bytecode)));
        if (abi) {
            const inputs = ts.createArrayLiteral(abi.inputs.map(arg => ts.createLiteral(arg.type)));
            const args = abi.inputs.map(arg => ts.createIdentifier(arg.name));
            statements.push(declareConstant(data, ts.createBinary(bytecode, ts.SyntaxKind.PlusToken, createCall(encodeFn, [ts.createLiteral(""), inputs, ...args]))));            
        } else statements.push(declareConstant(data, bytecode));
        statements.push(declareConstant(payload, createCall(payloadFn, [data])));

        const err = ts.createIdentifier("err");
        const addr = ts.createIdentifier("addr");
    
        const deployFn = accessThisProperty(this.client, this.provider.methods.deploy);
        const deployFnCall = createCall(deployFn, [
            payload, createCallbackDeclaration(err, addr, [createPromiseBody(err, createCall(accessThis(this.methods.withAddress), [addr]))])
        ]);
        
        statements.push(ts.createReturn(createNewPromise([ts.createStatement(deployFnCall)])));
        return ts.createMethod(
            undefined,
            [],
            undefined,
            name,
            undefined,
            undefined,
            parameters,
            output,
            ts.createBlock(statements, true)
        );
    }

    createWithAddress() {
        const name = this.methods.withAddress;
        const addr = ts.createIdentifier("addr");
        const parameters = [createParameter(addr, Uint8ArrayType)];
        const output = this.type;
    
        const toString = createCall(ts.createPropertyAccess(bufferFrom(addr), ts.createIdentifier("toString")), [ts.createLiteral("hex")]);
        const toUpperCase = createCall(ts.createPropertyAccess(toString, ts.createIdentifier("toUpperCase")), undefined);
        const setAddress = ts.createAssignment(accessThis(this.address), toUpperCase);
        const statements = [ts.createStatement(setAddress), ts.createReturn(ts.createThis())];
    
        return ts.createMethod(
            undefined,
            [PrivateToken],
            undefined,
            name,
            undefined,
            undefined,
            parameters,
            output,
            ts.createBlock(statements, true)
        );
    }

    createMethodFromABI(abi: ABIFunction) {
        const name = ts.createIdentifier(abi.name);    
        const parameters = abi.inputs.map(arg => createParameter(arg.name, getRealType(arg)));
    
        let output: ts.TypeNode;
        if (abi.outputs.length > 0) output = ts.createExpressionWithTypeArguments([ts.createTupleTypeNode(abi.outputs.map(out => getRealType(out)))], PromiseType);
        else output = ts.createExpressionWithTypeArguments([VoidType], PromiseType);
    
        const data = ts.createIdentifier("data");
        const payload = ts.createIdentifier("payload");
    
        const fn = hash(toFullName(abi)).slice(0, 8);
        const inputs = ts.createArrayLiteral(abi.inputs.map(arg => ts.createLiteral(arg.type)));
        const args = abi.inputs.map(arg => ts.createIdentifier(arg.name));
    
        const encodeFn = createCall(accessThisProperty(this.client, this.provider.methods.encode), [ts.createLiteral(fn), inputs, ...args]);
        const payloadFn = createCall(accessThisProperty(this.client, this.provider.methods.payload), [
            data, ts.createPropertyAccess(ts.createThis(), this.address)
        ]);

        const err = ts.createIdentifier("err");
        const exec = ts.createIdentifier("exec");

        const encodeData = declareConstant(data, encodeFn);
        const encodePayload = declareConstant(payload, payloadFn);
        const types = ts.createArrayLiteral(abi.outputs.map(arg => ts.createLiteral(arg.type)));
        const decodeFn = createCall(accessThisProperty(this.client, this.provider.methods.decode), [exec, types]);
        const result = createPromiseBody(err, abi.outputs.length > 0 ? decodeFn : undefined);
        
        const callFn = createCall(accessThisProperty(this.client, this.provider.methods.call), [payload, createCallbackDeclaration(err, exec, [result])])
    
        const statements = [
            encodeData, encodePayload,
            ts.createReturn(createNewPromise([ts.createStatement(callFn)]))
        ];
    
        return ts.createMethod(
            undefined,
            [],
            undefined,
            name,
            undefined,
            undefined,
            parameters,
            output,
            ts.createBlock(statements, true)
        );
    }
    
    createClass() {
        let deploy: ABIFunction;
        let methods: ABIFunction[] = [];
        this.abi.map(abi =>
            (abi.type == 'constructor') ? deploy = abi : methods.push(abi));

        return ts.createClassDeclaration(
            undefined,
            [ExportToken],
            ts.createIdentifier(this.name),
            [this.provider.getTypeArgumentDecl()],
            undefined,
            [
                ...this.createConstructor(),
                this.createWithAddress(),
                this.createDeploy(deploy),
                ...methods.map(m => this.createMethodFromABI(m))
            ],
        );
    }
}