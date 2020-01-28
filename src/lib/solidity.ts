import ts from "typescript";
import { Keccak } from 'sha3';
import { Function, FunctionInput, FunctionOutput, Event, EventInput } from 'solc';
import { StringType, NumberType, BooleanType, TupleType, BufferType, VoidType, AsRefNode, AsArray } from './syntax';

type FunctionIO = FunctionInput & FunctionOutput;

export function Hash(str: string) {
    const hash = (new Keccak(256)).update(str);
    return hash.digest('hex').toUpperCase();
}

export function NameFromABI(abi: Function | Event): string {
    if (abi.name.indexOf('(') !== -1) return abi.name;
    const typeName = (abi.inputs as (EventInput | FunctionIO)[]).map(i => i.type).join();
    return abi.name + '(' + typeName + ')';
}

export function GetRealType(obj: FunctionIO): ts.TypeNode {
    const type = obj.type;
    if (/int/i.test(type)) return NumberType;
    else if (/bool/i.test(type)) return BooleanType;
    else if (/bytes/i.test(type)) return AsRefNode(BufferType);
    else if (/\[\]/i.test(type)) return AsArray(StringType);

    else if (/tuple/i.test(type)) return TupleType(obj.components.map(comp => GetRealType(comp)));
    else return StringType; // address, bytes
}

export function OutputToType(abi: Function) {
    if (abi.outputs.length === 0) return VoidType;

    const named = abi.outputs.filter(out => out.name !== "")
    if (abi.outputs.length === named.length)
        return ts.createTypeLiteralNode(abi.outputs.map(out => ts.createPropertySignature(
                undefined, 
                out.name, 
                undefined, 
                GetRealType(out), 
                undefined)))
    else return ts.createTupleTypeNode(abi.outputs.map(out => GetRealType(out)));
}