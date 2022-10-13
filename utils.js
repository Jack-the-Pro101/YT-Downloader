exports.getWsClient = (id) => {
  return Array.from(websocket.getWss().clients).find((socket) => {
    return socket.id === id;
  });
};

const ffmpegStatic = require("ffmpeg-static");

const ffmpegPath = process.env.NODE_ENV === "production" ? process.env.BINARY_PATH : ffmpegStatic;

exports.ffmpegPath = ffmpegPath;
