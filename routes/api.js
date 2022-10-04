const express = require("express");

const router = express.Router();

const { getInfo } = require("../wrapper");

router.get("/info", async (req, res) => {
  const url = req.query.url;

  res.json(await getInfo(url));
});

router.ws("/ws", async (ws, req) => {});

module.exports = router;
