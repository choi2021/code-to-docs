import { findCrashAnalyticService } from './findCrashAnalyticService';
import { Node } from 'ts-morph';

export interface Meta {
    headers: string[];
    key: string;
    resultPath: string;
    headersKey: string[];
}

export interface Rule<T> {
    meta: Meta;
    execute(node: Node): RuleResult<T>;
}

export interface RuleResult<T> extends Map<string, T> {}

export const rules = [findCrashAnalyticService];
