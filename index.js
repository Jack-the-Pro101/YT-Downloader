const { exec } = require("child_process");
const chalk = require("chalk");

const path = require("path");

function start() {
  const worker = exec(`"${path.join(process.cwd(), "server.js")}"`);

  worker.stdout.setEncoding("utf8");
  worker.stderr.setEncoding("utf8");

  worker.stdout.on("data", (data) => {
    console.log(data.toString());
  });

  worker.stderr.on("data", (data) => {
    console.log(data.toString());
  });

  worker.on("close", (code) => {
    if (code !== 0) {
      console.log(chalk.red("FATAL ERROR: Application has crashed. Restart requred. Error log is above."));
    }
  });
}

start();
