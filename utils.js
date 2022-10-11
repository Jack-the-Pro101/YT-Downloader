exports.getWsClient = (id) => {
  return Array.from(websocket.getWss().clients).find((socket) => {
    return socket.id === id;
  });
};

const ffmpegStatic = require("ffmpeg-static");

exports.getFfmpegPath = () => {
  if (process.env.NODE_ENV === "production") {
    return process.env.BINARY_PATH;
  } else {
    return ffmpegStatic;
  }
};
