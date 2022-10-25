const express = require("express");
const router = express.Router();

const path = require("path");
const os = require("os");

const shared = require("../public/shared/shared");

const sysInfo = {
  cpu: os.cpus()[0].model,
  totalMem: Math.round(((Number.EPSILON + os.totalmem() / 1.074) / 1000000000) * 10) / 10,
  os: os.type(),
};

const { execSync } = require("child_process");

let getGpuCmd = "";
switch (os.platform()) {
  case "linux":
    getGpuCmd = "sudo lshw -C display";
    break;
  case "win32":
    getGpuCmd = "wmic path win32_VideoController get name";
    break;
  case "darwin":
    getGpuCmd = "system_profiler | grep GeForce";
    break;
  default:
    getGpuCmd = false;
    sysInfo.gpus = "Unknown";
}

if (getGpuCmd) sysInfo.gpus = execSync(getGpuCmd, { encoding: "utf8" }).replace(/Name/g, "").trim();

router.get("/", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.render(path.join(__dirname, "..", "views/index"), { shared, sysInfo });
});

module.exports = router;
