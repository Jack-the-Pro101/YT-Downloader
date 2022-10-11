const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

const { getWsClient } = require("../utils");
const { validateURL } = require("../public/shared/shared");
const { download } = require("../wrapper");

const { validate: validateUUID } = require("uuid");

router.get("/", (req, res) => {
  if (!fs.existsSync(path.join(process.cwd(), "./tmp"))) fs.mkdirSync(path.join(process.cwd(), "./tmp"));

  const url = req.query.url;
  const info = JSON.parse(req.query.info);
  const downloadId = req.query.id;

  if (url == null || !validateURL(url)) return res.sendStatus(400);
  if (!validateUUID(downloadId)) return res.sendStatus(400);

  const downloader = download(url, info, downloadId);
  let done = false;

  res.once("close", () => {
    if (!done) {
      const killed = downloader.cancel();
      console.log(killed);
    }
  });

  const client = getWsClient(req.cookies["YTDL_CLIENT_ID"]);

  downloader.emitter.once("begin", ({ id, title }) => {
    if (client == null) return;

    client.send(
      JSON.stringify({
        type: "begin",
        id,
        title,
      })
    );
  });

  downloader.emitter.on("downloaded", ({ id, status }) => {
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

  downloader.emitter.once("post", (id) => {
    if (client == null) return;

    client.send(
      JSON.stringify({
        type: "beginPost",
        id,
      })
    );
  });

  downloader.emitter.on("progress", (progress) => {
    if (client == null) return;

    client.send(
      JSON.stringify({
        type: "progress",
        progress,
      })
    );
  });

  downloader.emitter.on("error", (id) => {
    res.status(500).send(id);
  });

  downloader.emitter.once("finish", (dest, id) => {
    done = true;

    res.header("Filename", dest);
    res.header("Id", id);

    const absPath = path.join(process.cwd(), "./tmp");

    if (res.closed) return;

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
