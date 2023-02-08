#! /usr/bin/env node

const { program } = require("commander");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs-extra");
const figlet = require("figlet");
const create = require("./src/create");
const checkUpdate = require("./src/checkUpdate");
const install = require("./src/install");
const shelljs = require("shelljs");
const inquirer = require("inquirer");
const ora = require("ora");
const semver = require("semver");
const spawn = require("cross-spawn");

const pkgVersion = require("./package.json").version;

program.version(pkgVersion, "-v, --version");

program
    .command("init <project-name>")
    .description("create a new project name is <project-name>")
    .option("-f, --force", "overwrite target directory if it exists")
    .action(async (projectName, options) => {
        const cwd = process.cwd();
        // 拼接到目标文件夹
        const targetDirectory = path.join(cwd, projectName);
        // 如果目标文件夹已存在
        if (fs.existsSync(targetDirectory)) {
            if (!options.force) {
                console.error(chalk.red(`Project already exist! Please change your project name or use ${chalk.greenBright(`fumi create ${projectName} -f`)} to create`));
                return;
            }
            const { isOverWrite } = await inquirer.prompt([
                {
                    name: "isOverWrite",
                    type: "confirm",
                    message: "Target directory already exists, Would you like to overwrite it?",
                    choices: [
                        { name: "Yes", value: true },
                        { name: "No", value: false },
                    ],
                },
            ]);
            if (isOverWrite) {
                const spinner = ora(chalk.blackBright("The project is Deleting, wait a moment..."));
                spinner.start();
                await fs.removeSync(targetDirectory);
                spinner.succeed();
                console.info(chalk.green("✨ Deleted Successfully, start init project..."));
                console.log();
                await create(projectName);
                return;
            }
            console.error(chalk.green("You cancel to create project"));
            return;
        }
        await create(projectName);
    });

program
    .command("update")
    .description("update the cli to latest version")
    .action(async () => {
        await checkUpdate();
    });

program.command("install").action(async () => {
    const { installTool } = await inquirer.prompt([
        {
            name: "installTool",
            type: "list",
            default: "npm",
            message: "Which package manager you want to use for the project?",
            choices: ["npm", "cnpm", "yarn"],
        },
    ]);
    try {
        await install({ installTool });
    } catch (e) {
        console.log(chalk.red(e));
    }
});

// 检查umi版本是否为4.x
const checkUmiVersionIs4 = () => {
    const umiVersionStr = shelljs
        .exec(`umi -v`, {
            silent: true,
        })
        .stdout
    console.log(umiVersionStr)
    if (umiVersionStr) {
        return semver.satisfies(umiVersionStr.match(/umi@(\S*)/)[1], "^4")
    } else {
        return false
    }
};

program
    .command("dev")
    .description("umi dev")
    .action(async () => {
        // if (!checkUmiVersionIs4()) {
        //     console.log(chalk.red("your umi is not 4, or you have not installed umi globally."));
        //     process.exit(1);
        // } else {
        //     shelljs.exec("npm run dev", { cwd: process.cwd() });
        // }

        await new Promise((resolve, reject) => {
            const command = 'npm';
            const args = ["run", 'dev'];
            const child = spawn(command, args, {cwd: process.cwd(), stdio: ["pipe", process.stdout, process.stderr]});
    
            child.once("close", code => {
                if (code !== 0) {
                    reject({
                        command: `${command} ${args.join(" ")}`
                    });
                    return;
                }
                resolve();
            });
            child.once("error", reject);
        })
    });

program
    .command("build")
    .description("umi build")
    .action(async () => {
        await new Promise((resolve, reject) => {
            const command = 'npm';
            const args = ["run", 'build'];
            const child = spawn(command, args, {cwd: process.cwd(), stdio: ["pipe", process.stdout, process.stderr]});
    
            child.once("close", code => {
                if (code !== 0) {
                    reject({
                        command: `${command} ${args.join(" ")}`
                    });
                    return;
                }
                resolve();
            });
            child.once("error", reject);
        })
    });

program.on("--help", () => {
    console.log(
        figlet.textSync("mune-akira", {
            font: "Standard",
            horizontalLayout: "full",
            verticalLayout: "fitted",
            width: 120,
            whitespaceBreak: true,
        })
    );
});

program.parse(process.argv);
