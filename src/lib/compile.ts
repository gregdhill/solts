import { InputDescription, OutputDescription } from 'solc';
export { InputDescription, OutputDescription };
import * as fs from 'fs';

function NewInputDescription(): InputDescription {
    return {
        language: 'Solidity',
        sources: {},
        settings: { outputSelection: {} }
    }
}

export const EncodeInput = (obj: InputDescription): string => JSON.stringify(obj);
export const DecodeOutput = (str: string): OutputDescription => JSON.parse(str);

export function InputDescriptionFromFiles(...names: string[]) {
    const desc = NewInputDescription();
    names.map(name => {
        desc.sources[name] = { content: fs.readFileSync(name).toString() };
        desc.settings.outputSelection[name] = {};
        desc.settings.outputSelection[name]['*'] = [ '*' ];
    });
    return desc;
}

export function ImportLocal(path: string) {
    return {
        contents: fs.readFileSync(path).toString()
    }
}

export function TokenizeLinks(links: Record<string, Record<string, any>>) {
    const libraries: Array<string> = [];
    for (const file in links) {
        for (const library in links[file]) {
            libraries.push(file + ':' + library)
        }
    }
    return libraries;    
}