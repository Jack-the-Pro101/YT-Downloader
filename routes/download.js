const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

const { validateURL } = require("../utils");
const { download } = require("../wrapper");

router.get("/", (req, res) => {
  if (!fs.existsSync(path.join(process.cwd(), "./tmp")))
    fs.mkdirSync(path.join(process.cwd(), "./tmp"));

  const url = req.query.url;
  const info = JSON.parse(req.query.info);

  if (url == null || !validateURL(url)) return res.sendStatus(400);

  const downloader = download(url, info);

  downloader.on("progress", (progress) => {});

  downloader.once("finish", (dest) => {
    res.header("Filename", dest);
    res.sendFile(path.join(process.cwd(), "./tmp", dest));
  });
});

module.exports = router;
