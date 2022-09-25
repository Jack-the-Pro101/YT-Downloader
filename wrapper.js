const { validateURL, getURLVideoID } = require("./utils");

const ffmpegStatic = require("ffmpeg-static");

const { spawn, spawnSync } = require("child_process");

const path = require("path");

const VideosCacheStore = require("./classes/VideosCacheStore");

const constants = require("./constants");

const interactSync = (url, args = []) => {
  return spawnSync("./downloader/yt-dlp.exe", [...args, url], {
    encoding: "utf8",
  });
};

const interact = (url, args = []) => {
  const child = spawn("./downloader/yt-dlp.exe", [
    ...args,
    "--output",
    path.join(process.cwd(), "/tmp/") + "%(title)s.%(ext)s",
    "--ffmpeg-location",
    ffmpegStatic,
    url,
  ]);
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  return child;
};

exports.getInfo = async (url) => {
  if (!validateURL(url)) return false;

  const videoId = getURLVideoID(url);

  const cache = VideosCacheStore.get(videoId);
  if (cache) return cache;

  const process = interactSync(url, ["--dump-json"]);

  const output = process.stdout;

  if (process.status === 0) {
    const data = JSON.parse(output);

    VideosCacheStore.add(videoId, data);

    return data;
  } else {
    console.error(process.error);
    return false;
  }
};

exports.download = async (url, info) => {
  if (!validateURL(url)) return false;

  const args = [];

  if (info.quality.custom) {
    switch (info.format) {
      case constants.FORMATS.AUDIO:
        if (info.postProcessing) {
          args.push("--format", info.quality.value.audio, "--extract-audio", "--audio-format", info.container);
        }
        break;
      case constants.FORMATS.VIDEO:
        if (info.postProcessing) {
          args.push("--format", info.quality.value.video, "--remux-video", info.container);
        }
        break;
      case constants.FORMATS.VIDEOAUDIO:
        if (info.postProcessing) {
          args.push("--format", `${info.quality.value.audio}+${info.quality.value.video}`, "--merge-output-format", info.container);
        }
        break;

      default:
        break;
    }
  } else {
    console.log(info);

    switch (info.format) {
      case constants.FORMATS.AUDIO:
        if (info.quality.value === constants.QUALITIES.HIGHEST) {
          if (info.postProcessing) {
            args.push("--format", "bestaudio", "--extract-audio", "--audio-format", info.container);
          } else {
            args.push("--format", "bestaudio");
          }
        } else {
          if (info.postProcessing) {
            args.push("--format", "worstaudio", "--audio-format", info.container);
          } else {
            args.push("--format", "worstaudio");
          }
        }

        break;
      case constants.FORMATS.VIDEO:
        if (info.quality.value === constants.QUALITIES.HIGHEST) {
          if (info.postProcessing) {
            args.push("--format", "bestvideo", "--remux-video", info.container);
          } else {
            args.push("--format", "bestvideo");
          }
        } else {
          if (info.postProcessing) {
            args.push("--format", "worstaudio", "--remux-video", info.container);
          } else {
            args.push("--format", "worstaudio");
          }
        }

        break;
      case constants.FORMATS.VIDEOAUDIO:
        if (info.quality.value === constants.QUALITIES.HIGHEST) {
          if (info.postProcessing) {
            args.push("--format", "bestvideo+bestaudio", "--merge-output-format", info.container);
          } else {
            args.push("--format", "bestvideo+bestaudio");
          }
        } else {
          if (info.postProcessing) {
            args.push("--format", "worstvideo+worstaudio", "--merge-output-format", info.container);
          } else {
            args.push("--format", "worstvideo+worstaudio");
          }
        }

        break;

      default:
        break;
    }
  }

  const process = interact(url, args);
  process.stdout.on("data", (data) => {
    console.log(data.toString());
  });
  process.stderr.on("data", (data) => {
    console.log(data.toString());
  });
};
