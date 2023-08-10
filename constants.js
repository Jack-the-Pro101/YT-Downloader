const path = require("path");
const ytDlpPath = process.env.NODE_ENV === "production" ? path.join(process.env.BINARY_PATH, "yt-dlp.exe") : path.join(__dirname, "./downloader/yt-dlp.exe");

const ffmpegStatic = require("ffmpeg-static");

const ffmpegPath = process.env.NODE_ENV === "production" ? process.env.BINARY_PATH : ffmpegStatic;

module.exports = {
  ytDlpPath,
  ffmpegPath,
};
