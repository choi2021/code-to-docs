import { Project } from 'ts-morph';
import fs from 'fs';
import path from 'path';
import { rules } from './rules';

interface LogEntry {
    title: string;
    severity: string;
    domain: string;
    reason: string;
}

export interface LogEntryMap extends Map<string, LogEntry[]> {}

function analyzeProject(projectPath: string) {
    const logEntryMap = new Map<string, LogEntry[]>();

    const project = new Project({
        tsConfigFilePath: path.join(projectPath, 'tsconfig.json'),
    });

    project.getSourceFiles().forEach((sourceFile) => {
        sourceFile.forEachDescendant((node) => {
            // Rule
            rules.findCrashAnalyticService.create(node, logEntryMap);
        });
    });
    return logEntryMap;
}

function generateMarkdownTable(entryMap: LogEntryMap): string {
    let markdownTable = ``;

    entryMap.forEach((entries, key) => {
        markdownTable += `## ${key}\n`;
        markdownTable += `| 에러 메시지 | 분류 | 분류 이유 | \n`;
        markdownTable += `|-------|----------|----------|\n`;

        entries.forEach((entry) => {
            markdownTable += `| \`${entry.title}\` | ${entry.severity} | ${entry.reason} |\n`;
        });
    });

    return markdownTable;
}

function saveMarkdownToFile(markdownContent: string, filePath: string) {
    fs.writeFileSync(filePath, markdownContent);
}

export function main(projectPath: string, markdownOutputPath: string) {
    const logEntryMap = analyzeProject(projectPath);
    const markdownTable = generateMarkdownTable(logEntryMap);
    saveMarkdownToFile(markdownTable, markdownOutputPath);
}
