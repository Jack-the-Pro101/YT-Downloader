const express = require("express");

const router = express.Router();

const { getInfo } = require("../wrapper");
const { getWsClients } = require("../utils");

router.get("/info", async (req, res) => {
  const url = req.query.url;

  const data = await getInfo(url);
  if (!data) return res.sendStatus(400);

  res.json(data);
});

router.ws("/ws", async (ws, req) => {
  const socketId = req.cookies["YTDL_SESSION_ID"];

  if (getWsClients().some((value) => value.id === socketId)) return ws.terminate();

  ws.id = socketId;

  ws.on("message", (data) => {
    try {
      const json = JSON.parse(data);

      switch (json.type) {
        case "ping": {
          ws.send(
            JSON.stringify({
              type: "ping",
              ping: Date.now() - json.start,
            })
          );
        }
        default:
      }
    } catch (err) {
      console.error(err);
      ws.terminate();
    }
  });
});

module.exports = router;
