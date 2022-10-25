const express = require("express");

const router = express.Router();

const { getInfo } = require("../wrapper");
const { getWsClients, getWsClient } = require("../utils");

router.get("/info", async (req, res) => {
  const url = req.query.url;

  const data = await getInfo(url);
  if (!data) return res.sendStatus(400);

  res.json(data);
});

router.delete("/server", (req, res) => {
  // TODO: Refactor downloader code into class to allow for download cancelling

  res.sendStatus(202);
  process.exit(0); // Adios amigos
});

router.ws("/ws", async (ws, req) => {
  const socketId = req.cookies["YTDL_SESSION_ID"];

  getWsClients().forEach((client) => {
    if (client.id === socketId) client.terminate();
  });

  ws.id = socketId;

  setInterval(() => {
    ws.timeout = setTimeout(() => {
      ws.alive = false;
      ws.terminate();
    }, 4500);
    ws.send(JSON.stringify({ type: "ping" }));
  }, 5000);

  ws.on("message", (data) => {
    try {
      const json = JSON.parse(data);

      switch (json.type) {
        case "ping": {
          ws.alive = true;
          ws.send(
            JSON.stringify({
              type: "pong",
              ping: Date.now() - json.start,
            })
          );
          break;
        }
        case "pong":
          clearTimeout(ws.timeout);
          ws.alive = true;
          break;
        default:
      }
    } catch (err) {
      console.error(err);
      ws.terminate();
    }
  });
});

module.exports = router;
