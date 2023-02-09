const MetalSmith = require("metalsmith"); // 遍历文件夹 找需不需要渲染
const { render } = require("consolidate").ejs; // 统一所有的模板引擎
const { promisify } = require("util");
const path = require("path");
const inquirer = require("inquirer");
const renderForPromise = promisify(render);
const fs = require("fs-extra");

module.exports = async function renderTemplate(sourceTemplatePath, projectName, { pkg = "" }) {
    if (!sourceTemplatePath) {
        return Promise.reject(new Error(`无效的source：${sourceTemplatePath}`));
    }

    await new Promise((resolve, reject) => {
        MetalSmith(__dirname)
            .clean(false)
            .source(sourceTemplatePath)
            .destination(path.resolve(projectName))
            // .use(async (files, metal, done) => {
            //     let customPrompt = null;
            //     // 判断是否存在ask.js文件，是就引入customPrompt
            //     if (fs.existsSync(path.join(sourceTemplatePath, "ask.js"))) {
            //         customPrompt = require(path.join(sourceTemplatePath, "ask.js")); // 读入模板内提供的prompt选项
            //     }

            //     if (customPrompt) {
            //         // 将自定义的答案合并入metadata。metadata是一个全局变量。
            //         let answers = await inquirer.prompt(customPrompt);
            //         Object.keys(answers).forEach((key) => {
            //             // 将输入内容前后空格清除，不然安装依赖会报错
            //             answers[key] = answers[key]?.trim() || "";
            //         });
            //         const meta = metal.metadata();
            //         const tmp = {
            //             ...answers,
            //             name: projectName.trim().toLocaleLowerCase(),
            //         };
            //         Object.assign(meta, tmp);
            //         // if (files["ask.js"]) {
            //         //     delete files["ask.js"];
            //         //     await fs.removeSync(sourceTemplatePath);
            //         // }
            //     }

            //     done();
            // })
            .use((files, metal, done) => {
                // 动态注入文件
                // 读取package.json，修改以后写回去
                const packageJson = JSON.parse(files['package.json'].contents.toString());
                packageJson.customProperty = pkg
                files["package.json"].contents = Buffer.from(JSON.stringify(packageJson, null, 2) + '\n');

                done()
            })
            .use((files, metal, done) => {
                // 使用模板的方式注入文件
                const meta = metal.metadata();

                // ejs变量示例
                Object.assign(meta, { user: { name: "name" } });

                const fileTypeList = [".ts", ".js", ".json", ".html"]; // 选择要替换的后缀名文件
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
