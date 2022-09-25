const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

const { validateURL } = require("../utils");
const { download } = require("../wrapper");

router.post("/", (req, res) => {
  if (!fs.existsSync(path.join(process.cwd(), "../tmp"))) fs.mkdirSync(path.join(process.cwd(), "../tmp"));

  const url = req.query.url;
  const info = req.body;

  if (!validateURL(url)) return res.sendStatus(400);

  download(url, info);

  res.sendStatus(200);
});

module.exports = router;
