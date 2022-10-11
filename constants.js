const path = require("path");
const ytDlpPath = () => {
  if (process.env.NODE_ENV === "production") {
    return path.join(process.env.BINARY_PATH, "yt-dlp.exe");
  } else {
    return path.join(__dirname, "./downloader/yt-dlp.exe");
  }
};

module.exports = {
  ytDlpPath,
};
