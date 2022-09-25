const FORMATS = {
  AUDIO: 0,
  VIDEO: 1,
  VIDEOAUDIO: 2,
};

const QUALITIES = {
  LOWEST: 0,
  HIGHEST: 1,
};

const AUDIO_CONTAINERS = ["mp3", "m4a", "wav", "ogg", "opus", "aac", "alac", "flac"];

const VIDEO_CONTAINERS = ["mp4", "webm", "avi", "mov", "mkv", "flv"];

module.exports = {
  FORMATS,
  QUALITIES,
  AUDIO_CONTAINERS,
  VIDEO_CONTAINERS,
};
