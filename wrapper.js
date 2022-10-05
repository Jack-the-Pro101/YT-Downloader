const { validateURL, getURLVideoID } = require("./utils");

const ffmpegStatic = require("ffmpeg-static");

const { spawn, spawnSync } = require("child_process");

const { v4: uuid } = require("uuid");

const path = require("path");
const events = require("events");

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
    "--restrict-filenames",
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

exports.download = (url, info) => {
  if (!validateURL(url)) return false;

  // ctx_id: "None";
  // downloaded_bytes: 3064351;
  // elapsed: 0.5761923789978027;
  // eta: 0;
  // filename: "H:\\Programming Projects\\Programming\\Other\\YT Downloader\\tmp\\TheFatRat - Time Lapse.webm";
  // speed: 8420293.143194817;
  // status: "downloading";
  // tmpfilename: "H:\\Programming Projects\\Programming\\Other\\YT Downloader\\tmp\\TheFatRat - Time Lapse.webm.part";
  // total_bytes: 3064351;
  // _default_template: "100.0% of 2.92MiB at    8.03MiB/s ETA 00:00";
  // _downloaded_bytes_str: "2.92MiB";
  // _elapsed_str: "00:00";
  // _eta_str: "00:00";
  // _percent_str: "100.0%";
  // _speed_str: "   8.03MiB/s";
  // _total_bytes_estimate_str: "N/A";
  // _total_bytes_str: "2.92MiB";

  const downloadId = uuid();

  const args = [
    "--exec",
    "echo =%(filepath)s",
    "--print",
    "before_dl:<%(title)s",
    "--progress-template",
    "-%(progress.status)s,%(progress._total_bytes_str)s,%(progress._percent_str)s,%(progress._speed_str)s,%(progress._eta_str)s",
  ];
  const emitter = new events.EventEmitter();

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

  const downloadStatus = {
    video: false,
    audio: false,
  };

  process.stdout.on("data", (data) => {
    const text = data.toString().trim();

    console.log(text);

    if (text.startsWith("-")) {
      const info = text.slice(1).split(/\,/g);

      const status = info[0];
      const totalSize = info[1];
      const percent = info[2];
      const speed = info[3];
      const eta = info[4];

      if (status === "downloading") {
        emitter.emit("progress", {
          id: downloadId,
          status,
          totalSize,
          percent,
          speed,
          eta,
        });
      } else {
        switch (info.format) {
          case constants.FORMATS.AUDIO:
            downloadStatus.audio = true;
            break;
          case constants.FORMATS.VIDEO:
            downloadStatus.video = true;
            break;
          case constants.FORMATS.VIDEOAUDIO:
            downloadStatus.video = true;

            if (downloadStatus.video) {
              downloadStatus.audio = true;
            }
            break;
        }

        emitter.emit("downloaded", {
          id: downloadId,
          status: downloadStatus,
        });
      }
    } else if (text.startsWith("=")) {
      emitter.emit("finish", path.basename(text.slice(1)).trim(), downloadId);
    } else if (text.startsWith("<")) {
      emitter.emit("begin", { id: downloadId, title: text.slice(1) });
    }
  });
  process.stderr.on("data", (data) => {
    console.log(data.toString());
  });

  return emitter;
};
