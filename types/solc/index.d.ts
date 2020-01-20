declare module 'solc' {
    export type ABIFunction = {
        type: ABIType
        name: string,
        inputs: Array<ABIFunctionIO>,
        outputs?: Array<ABIFunctionIO>,
        stateMutability: ABIMutability,
        payable: false,
        constant: boolean,
    }

    export type ABIEvent = {
        type: 'event'
        name: string,
        inputs: Array<ABIEventInput>,
        anonymous: boolean,
    }
    
    export enum ABIType {
        function = "function",
        constructor = "constructor",
        fallback = "fallback",
    }
    
    export enum ABIMutability {
        pure = "pure",
        view = "view",
        nonpayable = "nonpayable",
        payable = "payable",
    }
    
    export type ABIFunctionIO = {
        name: string
        type: string
        components?: ABIFunctionIO[]
        internalType?: string
    };

    export type ABIEventInput = ABIFunctionIO & {indexed?: boolean};

    type Bytecode = {
        linkReferences: any
        object: string
        opcodes: string
        sourceMap: string
    }
    
    type Contract = {
        assembly: any
        evm: {
            bytecode: Bytecode
        }
        functionHashes: any
        gasEstimates: any
        abi: ABIFunction[]
        opcodes: string
        runtimeBytecode: string
        srcmap: string
        srcmapRuntime: string
    }
    
    type Source = {
        AST: any
    }

    interface SourceMap {
        [key: string]: Source;
    }

    export type InputDescription = {
        language: string
        sources?: Record<string, { content: string }>
        settings?: {
            outputSelection: Record<string, Record<string, Array<string>>>
        }
    }
    
    export type OutputDescription = {
        contracts: Record<string, Record<string, Contract>>
        errors: Array<string>
        sourceList: Array<string>
        sources: SourceMap
    }

    export function compile(input: string): string;
}