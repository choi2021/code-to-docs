#!/usr/bin/env node

import * as figlet from "figlet";
import {Command} from "commander";
import {main} from "./index";

const program = new Command();

console.log(figlet.textSync("Code To DOCS"));

program
    .version('0.0.1')
    .action(()=>{
        const projectPath = process.argv[2];
        const markdownOutputPath = process.argv[3] || 'analysisResults.md';

        console.log(`projectPath: ${projectPath}`);
        main(projectPath,markdownOutputPath);
        console.log(`변환을 완료했습니다. ${markdownOutputPath} 파일을 확인해주세요.`);
    });

program.parse(process.argv);
