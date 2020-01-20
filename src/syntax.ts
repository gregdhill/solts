import ts from "typescript";

export const Uint8ArrayType = ts.createTypeReferenceNode("Uint8Array", undefined);
export const VoidType = ts.createTypeReferenceNode("void", undefined);
export const StringType = ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
export const NumberType = ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
export const BooleanType = ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
export const AnyType = ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
export const ErrorType = ts.createTypeReferenceNode("Error", undefined);
export const PromiseType = ts.createIdentifier("Promise");
export const TupleType = (elements: ts.TypeNode[]) => ts.createTupleTypeNode(elements);

export const PrivateToken = ts.createToken(ts.SyntaxKind.PrivateKeyword);
export const ExportToken = ts.createToken(ts.SyntaxKind.ExportKeyword);
export const EllipsisToken = ts.createToken(ts.SyntaxKind.DotDotDotToken);
export const QuestionToken = ts.createToken(ts.SyntaxKind.QuestionToken);

export const createCall = (fn: ts.Expression, args: ts.Expression[]) => ts.createCall(fn, undefined, args);
export const accessThis = (name: ts.Identifier) => ts.createPropertyAccess(ts.createThis(), name);
export const accessThisProperty = (prop: ts.Identifier, fn: ts.Identifier) => ts.createPropertyAccess(accessThis(prop), fn);
export const bufferFrom = (...args: ts.Expression[]) => createCall(ts.createPropertyAccess(ts.createIdentifier("Buffer"), ts.createIdentifier("from")), args);
export const asArray = (type: ts.TypeNode) => ts.createArrayTypeNode(type);

export function createParameter(
    name: string | ts.Identifier,
    typeNode: ts.TypeNode | undefined,
    initializer?: ts.Expression,
    isOptional?: boolean,
    isVariadic?: boolean,
): ts.ParameterDeclaration {
    return ts.createParameter(
        undefined,
        undefined,
        isVariadic ? EllipsisToken : undefined,
        typeof name === 'string' ? ts.createIdentifier(name) : name,
        isOptional ? QuestionToken : undefined,
        typeNode,
        initializer,
    )
}

export function declareConstant(name: ts.Identifier, initializer?: ts.Expression) {
    return ts.createVariableStatement([], ts.createVariableDeclarationList(
            [ts.createVariableDeclaration(name, undefined, initializer)], ts.NodeFlags.Const));
}

const resolveFn = ts.createIdentifier("resolve");
const rejectFn = ts.createIdentifier("reject");

export function createPromiseBody(error: ts.Identifier, statement: ts.Expression) {
    return ts.createExpressionStatement(
        ts.createConditional(
            error, 
            createCall(rejectFn, [error]), 
            createCall(resolveFn, statement ? [statement] : undefined)));
}

export function createNewPromise(body: ts.Statement[], returnType?: ts.TypeNode): ts.NewExpression {
    return ts.createNew(
        PromiseType, undefined,
        [createCallbackDeclaration(resolveFn, rejectFn, body, returnType, true)],
    )
}

export function createCallbackDeclaration(first: ts.Identifier, second: ts.Identifier, body: ts.Statement[], returnType?: ts.TypeNode, multiLine?: boolean) {
    return ts.createArrowFunction(
        undefined,
        undefined,
        [
            createParameter(first, undefined),
            createParameter(second, undefined),
        ],
        returnType,
        undefined,
        ts.createBlock(body, multiLine),
    )
}

export function createCallbackExpression(error: ts.Identifier, success: ts.Identifier) {
    return ts.createFunctionTypeNode(undefined, [createParameter(error, ErrorType), createParameter(success, Uint8ArrayType)], VoidType)
}

