import * as data from "./completion.json";

export interface CompletionSchema {
    libName: string
    prefix: string
    functions: {
        functionName: string
        document?: string
        definitionStr: string
    }[]
}

export interface CompletionTotal {
    libNames: string[]
    libCompletions: CompletionSchema[]
}

export const getCompletions = () => {
    return data as CompletionTotal;
}