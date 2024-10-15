import { findCrashAnalyticService } from './findCrashAnalyticService';
import { Node } from 'ts-morph';

export interface Meta {
    headers: string[];
    key: string;
    resultPath: string;
    headersKey: string[];
}

export interface Rule {
    meta: Meta;
    execute(node: Node): RuleResult;
}

export type RuleResult = Map<Meta['key'], { meta: Meta; result: Map<string, unknown[]> }>;

export const rules = [findCrashAnalyticService];
