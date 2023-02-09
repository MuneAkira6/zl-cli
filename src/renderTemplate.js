const MetalSmith = require("metalsmith"); // 遍历文件夹 找需不需要渲染
const { render } = require("consolidate").ejs; // 统一所有的模板引擎
const { promisify } = require("util");
const path = require("path");
const inquirer = require("inquirer");
const renderForPromise = promisify(render);
const fs = require("fs-extra");

module.exports = async function renderTemplate(sourceTemplatePath, projectName) {
    if (!sourceTemplatePath) {
        return Promise.reject(new Error(`无效的source：${sourceTemplatePath}`));
    }

    await new Promise((resolve, reject) => {
        MetalSmith(__dirname)
            .clean(false)
            .source(sourceTemplatePath)
            .destination(path.resolve(projectName))
            .use(async (files, metal, done) => {
                // 1. 动态注入文件
                let customPrompt = [
                    {
                        name: "pkg",
                        message: "选择package.json。将使用动态生成的方式",
                        type: "list",
                        default: "type1",
                        choices: ["type1", "type2"],
                    },
                ];

                let answers = await inquirer.prompt(customPrompt);
                Object.keys(answers).forEach((key) => {
                    // 将输入内容前后空格清除
                    answers[key] = answers[key]?.trim() || "";
                });
                // 读取package.json，修改以后写回去
                const packageJson = JSON.parse(files["package.json"].contents.toString());
                packageJson.customProperty = answers.pkg;
                files["package.json"].contents = Buffer.from(JSON.stringify(packageJson, null, 2) + "\n");

                done();
            })
            .use(async (files, metal, done) => {
                // 2-1. 获取要替换的模板变量
                let customPrompt = [
                    {
                        name: "registry",
                        message: "选择registry，将通过ejs注入.npmrc文件",
                        type: "list",
                        default: "registry1",
                        choices: ["registry1", "registry2"],
                    },
                ];

                // 将自定义的答案合并入metadata。metadata是一个全局变量。
                let answers = await inquirer.prompt(customPrompt);
                Object.keys(answers).forEach((key) => {
                    // 将输入内容前后空格清除
                    answers[key] = answers[key]?.trim() || "";
                });
                const meta = metal.metadata();
                const tmp = {
                    ...answers,
                };
                Object.assign(meta, tmp);

                done();
            })
            .use((files, metal, done) => {
                // 2-2. 使用模板的方式注入文件
                const meta = metal.metadata();

                // ejs变量示例
                Object.assign(meta, { user: { name: "name" } });

                const fileTypeList = [".ts", ".js", ".json", ".html", ".npmrc"]; // 选择要替换的后缀名文件
                Object.keys(files).forEach(async (fileName) => {
                    let fileContent = files[fileName].contents.toString();
                    for (const type of fileTypeList) {
                        // 只有包含'<%'的才会被过滤
                        if (fileName.includes(type) && fileContent.includes("<%")) {
                            fileContent = await renderForPromise(fileContent, meta);
                            files[fileName].contents = Buffer.from(fileContent);
                        }
                    }
                });

                done();
            })
            .build((err) => {
                err ? reject(err) : resolve({ resolve, projectName });
            });
    });
};
