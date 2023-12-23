import { Project, Node } from 'ts-morph';
import fs from 'fs';
import path from 'path';

interface MethodCriteria {
    methodName: string;
    paramProperties?: string[];
}

interface SearchCriteria {
    name: string;
    properties?: string[];
    methods?: MethodCriteria[];
}

interface LogEntry {
    title: string;
    severity: string;
    domain: string;
}

const logEntryMap = new Map<string, LogEntry>();

const result: Record<string, number> = {};
function readJSONFile(filePath: string): SearchCriteria[] {
    const jsonData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(jsonData).searchCriteria;
}

function analyzeProject(projectPath: string, criteria: SearchCriteria[]) {
    const project = new Project({
        tsConfigFilePath: path.join(projectPath, 'tsconfig.json'),
    });

    criteria.forEach((criterion) => {
        const hasProperties = criterion.properties && criterion.properties.length > 0;
        const hasMethods = criterion.methods && criterion.methods.length > 0;

        project.getSourceFiles().forEach((sourceFile) => {
            sourceFile.forEachDescendant((node) => {
                // Check for object name usage
                if (!hasProperties && !hasMethods && Node.isIdentifier(node) && node.getText() === criterion.name) {
                    return;
                }

                // // Check for properties usage
                // if (
                //     hasProperties &&
                //     Node.isPropertyAccessExpression(node) &&
                //     node.getExpression().getText() === criterion.name
                // ) {
                //     const propertyName = node.getName();
                //     if (criterion.properties?.includes(propertyName)) {
                //         result[propertyName] = (result[propertyName] || 0) + 1;
                //     }
                // }

                // Check for methods and paramProperties usage
                if (hasMethods && Node.isCallExpression(node)) {
                    const callExpressionText = node.getExpression().getText();
                    if (callExpressionText.startsWith(criterion.name + '.')) {
                        const methodName = callExpressionText.split('.')[1];
                        const targetMethod = criterion.methods?.find((m) => m.methodName === methodName);
                        const targetMethodParams = targetMethod?.paramProperties ?? [];

                        if (targetMethodParams.length === 0) {
                            // If method has parameters, record the method name
                            result[methodName] = (result[methodName] || 0) + 1;
                        } else {
                            const args = node.getArguments();
                            const logEntry: LogEntry = {
                                title: 'MapToError',
                                severity: methodName,
                                domain: '',
                            };
                            args.forEach((arg) => {
                                if (Node.isObjectLiteralExpression(arg)) {
                                    arg.forEachChild((node) => {
                                        const chlid = node.getText();
                                        const errorRegex = /new Error\('([^']*)'\)/;
                                        const errorRegexMatches = chlid.match(errorRegex);

                                        const tagRex = /tag: ErrorTag\.([^,]*)/;
                                        const tagRegexMatches = chlid.match(tagRex);

                                        if (errorRegexMatches) {
                                            logEntry.title = errorRegexMatches[1];
                                        }
                                        if (tagRegexMatches) {
                                            logEntry.domain = tagRegexMatches[1];
                                        }
                                    });
                                }
                            });

                            const key = `${logEntry.title}-${logEntry.severity}-${logEntry.domain}`;
                            logEntryMap.set(key, logEntry);
                        }
                    }
                }
            });
        });
    });
}

function generateMarkdownTable(entries: typeof logEntryMap): string {
    let markdownTable = `| Title | Severity | Domain |\n`;
    markdownTable += `|-------|----------|--------|\n`;

    entries.forEach((entry) => {
        markdownTable += `| ${entry.title} | ${entry.severity} | ${entry.domain} |\n`;
    });

    return markdownTable;
}

function index(jsonFilePath: string, projectPath: string) {
    const searchCriteria = readJSONFile(jsonFilePath);
    analyzeProject(projectPath, searchCriteria);
    const markdownTable = generateMarkdownTable(logEntryMap);
    console.log(markdownTable);
}

const filePath = process.argv[2];
const projectPath = process.argv[3];

// Usage
// Replace 'path_to_your_json_file.json' and 'path_to_your_project' with your actual file paths
index(filePath, projectPath);
