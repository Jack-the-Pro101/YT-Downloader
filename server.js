if (process.env.NODE_ENV !== "production") require("dotenv").config();

const express = require("express");
const ejs = require("ejs");
const open = require("open");
const cookieParser = require("cookie-parser");
const { v4: uuid } = require("uuid");

const chalk = require("chalk");

const fs = require("fs");
const path = require("path");

const { spawn } = require("child_process");

(async function () {
  console.time("Start");

  // const test = spawn(path.join(__dirname, "/node_modules/ffmpeg-static/ffmpeg.exe"), ["-version"]);
  // test.stdout.on("data", (data) => console.log(data.toString("utf8")));

  console.log(chalk.green("\nStarting YouTube downloader..."));
  console.log(chalk.green("Starting webpage UI..."));

  const app = express();

  app.use(express.static(path.join(__dirname, "./public")));

  const expressWs = require("express-ws")(app);
  global.websocket = expressWs;
  expressWs.getWss().on("error", (err) => {
    console.error(err);
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.set("view engine", "ejs");
  app.use(cookieParser());

  app.use((req, res, next) => {
    if (req.url.length !== 1 || req.url !== "/") return next();
    if (req.cookies["YTDL_CLIENT_ID"] == null) {
      res.cookie("YTDL_CLIENT_ID", uuid(), { path: "/" });
    }
    res.cookie("YTDL_SESSION_ID", uuid(), { path: "/" });
    next();
  });

  const routesPath = "/routes/";
  const directoryPath = path.join(__dirname, routesPath);

  const preconfiguredRoutes = {
    index: "/",
  };

  const routerFiles = fs.readdirSync(directoryPath);

  routerFiles.forEach(async function (file) {
    const fileBase = path.basename(file, path.extname(file));
    const routerPath = path.join(__dirname, routesPath + fileBase + path.extname(file));
    const router = require(routerPath);

    if (preconfiguredRoutes[fileBase] != null) {
      app.use(preconfiguredRoutes[fileBase], router);
    } else {
      app.use("/" + fileBase, router);
    }
  });

  // Handled by wrapper

  // if (process.env.DEV !== "true") {
  //   console.log(chalk.green("Checking for downloader updates..."));
  //   const updater = spawn("./downloader/yt-dlp.exe", ["-U"]);

  //   await new Promise((resolve, reject) => {
  //     updater.stdout.on("data", (data) => {
  //       const text = data.toString("utf-8");

  //       if (text.includes("is up to date")) {
  //         console.log(text);
  //         return resolve();
  //       } else if (text.includes("Updating")) {
  //         console.log(text);
  //         return resolve();
  //       }

  //       setTimeout(() => {
  //         reject();
  //       }, 20000);
  //     });
  //   });
  // } else {
  //   console.log(chalk.green("Development environment enabled, skipping version check for start up time..."));
  // }

  try {
    app.listen(710, () => {
      console.log(chalk.greenBright("Server online"));
      console.timeEnd("Start");

      if (!process.env.DEV) {
        console.log("Launching client...");
        open("http://localhost:710");
      }
    });

    return;
  } catch (err) {}
  const server = app.listen(0, () => {
    console.log(chalk.greenBright("Server online"));
    console.timeEnd("Start");

    if (!process.env.DEV) {
      console.log("Launching client...");
      open("http://localhost:" + server.address().port);
    }
  });
})();
