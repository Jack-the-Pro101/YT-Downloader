const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

const { validateURL, getWsClient } = require("../utils");
const { download } = require("../wrapper");

router.get("/", (req, res) => {
  if (!fs.existsSync(path.join(process.cwd(), "./tmp")))
    fs.mkdirSync(path.join(process.cwd(), "./tmp"));

  const url = req.query.url;
  const info = JSON.parse(req.query.info);

  if (url == null || !validateURL(url)) return res.sendStatus(400);

  const downloader = download(url, info);

  const client = getWsClient(req.cookies["YTDL_CLIENT_ID"]);

  downloader.once("begin", ({ id, title }) => {
    if (client == null) return;

    client.send(
      JSON.stringify({
        type: "begin",
        id,
        title,
      })
    );
  });

  downloader.on("downloaded", ({ id, status }) => {
    if (status.video) {
      client.send(
        JSON.stringify({
          type: "downloaded",
          id,
          format: "video",
        })
      );
    } else if (status.audio) {
      client.send(
        JSON.stringify({
          type: "downloaded",
          id,
          format: "audio",
        })
      );
    }
  });

  downloader.once("post", (id) => {
    client.send(
      JSON.stringify({
        type: "beginPost",
        id,
      })
    );
  });

  downloader.on("progress", (progress) => {
    if (client == null) return;

    client.send(
      JSON.stringify({
        type: "progress",
        progress,
      })
    );
  });

  downloader.once("finish", (dest, id) => {
    res.header("Filename", dest);
    res.header("Id", id);
    res.sendFile(path.join(process.cwd(), "./tmp", dest));
  });
});

module.exports = router;
