const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

const { validateURL, getWsClient } = require("../utils");
const { download } = require("../wrapper");

const { validate: validateUUID } = require("uuid");

router.get("/", (req, res) => {
  if (!fs.existsSync(path.join(process.cwd(), "./tmp"))) fs.mkdirSync(path.join(process.cwd(), "./tmp"));

  const url = req.query.url;
  const info = JSON.parse(req.query.info);
  const downloadId = req.query.id;

  if (url == null || !validateURL(url)) return res.sendStatus(400);

  const downloader = download(url, info, downloadId);

  if (!validateUUID(downloadId)) return res.sendStatus(400);

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
    if (client == null) return;

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
    if (client == null) return;

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

  downloader.on("error", (id) => {
    res.status(500).send(id);
  });

  downloader.once("finish", (dest, id) => {
    res.header("Filename", dest);
    res.header("Id", id);

    const absPath = path.join(process.cwd(), "./tmp");

    res.sendFile(dest, { root: absPath }, (err) => {
      if (err) {
        console.error(err);
      } else {
        if (process.env.NODE_ENV === "production") {
          fs.unlinkSync(path.join(absPath, dest));
        }
      }
    });
  });
});

module.exports = router;
