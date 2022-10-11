const express = require("express");
const router = express.Router();

const path = require("path");

const constants = require("../public/shared/shared");

router.get("/", (req, res) => res.render(path.join(__dirname, "..", "views/index"), constants));

module.exports = router;
