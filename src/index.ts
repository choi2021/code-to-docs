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
        project.getSourceFiles().forEach((sourceFile) => {
            sourceFile.forEachDescendant((node) => {
                const isTargetNode = Node.isIdentifier(node) && node.getText() === criterion.name;
                if (!isTargetNode) return;

                // Check for object name usage
                if (Node.isIdentifier(node) && node.getText() === criterion.name) {
                    console.log(`Usage of ${criterion.name} found in file: ${sourceFile.getFilePath()}`);
                    console.log(node.getText());
                    result[criterion.name] = result[criterion.name] ? result[criterion.name] + 1 : 1;
                }

                // Check for properties usage
                if (Node.isPropertyAccessExpression(node) && node.getExpression().getText() === criterion.name) {
                    const propertyName = node.getName();
                    if (!criterion.properties || criterion.properties.includes(propertyName)) {
                        console.log(`Property ${propertyName} found in file: ${sourceFile.getFilePath()}`);
                        console.log(node.getText());
                    }
                    result[propertyName] = result[propertyName] ? result[propertyName] + 1 : 1;
                }

                // Check for methods and paramProperties usage
                if (
                    Node.isCallExpression(node) &&
                    node
                        .getExpression()
                        .getText()
                        .startsWith(criterion.name + '.')
                ) {
                    const methodName = node.getExpression().getText().split('.')[1];
                    const method = criterion.methods?.find((m) => m.methodName === methodName);
                    if (method) {
                        console.log(`Method ${methodName} found in file: ${sourceFile.getFilePath()}`);
                        console.log(node.getText());
                        const args = node.getArguments();
                        args.forEach((arg, index) => {
                            if (method.paramProperties && method.paramProperties[index]) {
                                console.log(`Parameter ${method.paramProperties[index]}: ${arg.getText()}`);
                                result[methodName] = result[methodName] ? result[methodName] + 1 : 1;
                            }
                        });
                    }
                }
            });
        });
    });
}

function index(jsonFilePath: string, projectPath: string) {
    const searchCriteria = readJSONFile(jsonFilePath);
    analyzeProject(projectPath, searchCriteria);
    console.log('%c---------------------------', 'color:red');
    console.log('result', result);
    console.log('%c---------------------------', 'color:red');
}

const filePath = process.argv[2];
const projectPath = process.argv[3];

// Usage
// Replace 'path_to_your_json_file.json' and 'path_to_your_project' with your actual file paths
index(filePath, projectPath);
