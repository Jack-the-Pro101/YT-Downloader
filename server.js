if (process.env.NODE_ENV !== "production") require("dotenv").config();

const express = require("express");
const open = require("open");
const cookieParser = require("cookie-parser");
const { v4: uuid } = require("uuid");

const chalk = require("chalk");

const fs = require("fs");
const path = require("path");

(async function () {
  console.time("Start");

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

  if (process.env.NODE_ENV === "production" && fs.existsSync(path.join(process.cwd(), "./tmp"))) {
    fs.rmdirSync(path.join(process.cwd(), "./tmp"));
  }

  function serverStarted(url) {
    console.log(chalk.greenBright("Server online at " + url));

    if (!process.env.DEV) {
      console.log(`Launching client...`);
      console.log(chalk.redBright("\nTHIS WINDOW RUNS THE DOWNLOADER! MAKE SURE TO NOT CLOSE IT!"));

      open(url);
    }
  }

  let server = app.listen(710);

  server.once("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(chalk.yellowBright("Port 710 in use! Assigning random port..."));
      server = app.listen(0);
    } else {
      console.error(err);
      process.exit(1);
    }
  });

  server.once("listening", () => {
    serverStarted("http://localhost:" + server.address().port);
  });

  console.timeEnd("Start");
})();
