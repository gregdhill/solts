import assert from 'assert';
import ts from "typescript";
import { createParameter, createCallbackExpression } from './syntax';

function print(node: ts.Node) {
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    return printer.printNode(ts.EmitHint.Unspecified, node, undefined)
}

describe('syntax helpers', function () {
  it('should create callback expression', async function () {
    const ErrAndResult = [
        createParameter(ts.createIdentifier("err"), undefined), 
        createParameter(ts.createIdentifier("result"), undefined)
    ];
    assert.equal(print(createCallbackExpression(ErrAndResult)), '(err, result) => void');
  })
})
