const { validateURL, getVideoID } = require("./public/shared/shared");

const { spawn, spawnSync } = require("child_process");

const { ytDlpPath, ffmpegPath } = require("./constants");

const path = require("path");
const fs = require("fs");
const events = require("events");

const serialKiller = require("tree-kill");

const VideosCacheStore = require("./classes/VideosCacheStore");

const sharedConstants = require("./public/shared/shared");

const interactSync = (url, args = []) => {
  return spawnSync(ytDlpPath, [...args, url], {
    encoding: "utf8",
  });
};

const interact = (url, downloadId, args = []) => {
  const child = spawn(ytDlpPath, [
    ...args,
    "--output",
    path.join(process.cwd(), "/tmp/") + "%(title)s" + `-${downloadId}` + ".%(ext)s",
    "--ffmpeg-location",
    ffmpegPath,
    "--restrict-filenames",
    url,
  ]);
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  return child;
};

exports.getInfo = async (urlOrId) => {
  if (!validateURL(urlOrId)) return false;

  const videoId = getVideoID(urlOrId);

  const cache = VideosCacheStore.get(videoId);
  if (cache) return cache;

  const process = interactSync(urlOrId, ["--dump-json"]);

  const output = process.stdout;

  if (process.status === 0) {
    const data = JSON.parse(output);

    VideosCacheStore.add(videoId, data);

    return data;
  } else {
    console.log(process.stderr);
    return false;
  }
};

exports.download = (url, info, downloadId) => {
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

  const args = [
    "--exec",
    "echo =%(filepath)s",
    "--progress",
    "--print",
    "before_dl:<%(title)s",
    "--print",
    "post_process:>+",
    "--progress-template",
    "-%(progress.status)s,%(progress._total_bytes_str)s,%(progress._percent_str)s,%(progress._speed_str)s,%(progress._eta_str)s,%(progress.tmpfilename)s,%(progress.filename)s",
  ];
  const emitter = new events.EventEmitter();

  const reEncode = Object.keys(info.advancedOptions.encoding).length > 0;
  if (info.quality.custom) {
    switch (info.format) {
      case sharedConstants.FORMATS.AUDIO:
        if (info.postProcessing) {
          args.push("--format", info.quality.value.audio, "--extract-audio");
          if (!reEncode) args.push("--audio-format", info.container);
        } else {
          args.push("--format", `${info.quality.value.audio}`);
        }
        break;
      case sharedConstants.FORMATS.VIDEO:
        if (info.postProcessing) {
          args.push("--format", info.quality.value.video);
          if (!reEncode) args.push("--remux-video", info.container);
        } else {
          args.push("--format", info.quality.value.video);
        }
        break;
      case sharedConstants.FORMATS.VIDEOAUDIO:
        if (info.postProcessing) {
          args.push("--format", `${info.quality.value.video}+${info.quality.value.audio}`);
          if (!reEncode) args.push("--merge-output-format", info.container);
        } else {
          args.push("--format", `${info.quality.value.video}+${info.quality.value.audio}`);
        }
        break;

      default:
        break;
    }
  } else {
    switch (info.format) {
      case sharedConstants.FORMATS.AUDIO:
        if (info.quality.value === sharedConstants.QUALITIES.HIGHEST) {
          if (info.postProcessing) {
            args.push("--format", "bestaudio", "--extract-audio");
            if (!reEncode) args.push("--audio-format", info.container);
          } else {
            args.push("--format", "bestaudio");
          }
        } else {
          if (info.postProcessing) {
            args.push("--format", "worstaudio");
            if (!reEncode) args.push("--audio-format", info.container);
          } else {
            args.push("--format", "worstaudio");
          }
        }

        break;
      case sharedConstants.FORMATS.VIDEO:
        if (info.quality.value === sharedConstants.QUALITIES.HIGHEST) {
          if (info.postProcessing) {
            args.push("--format", "bestvideo", "--remux-video", info.container);
            if (!reEncode) args.push("--remux-video", info.container);
          } else {
            args.push("--format", "bestvideo");
          }
        } else {
          if (info.postProcessing) {
            args.push("--format", "worstaudio");
            if (!reEncode) args.push("--remux-video", info.container);
          } else {
            args.push("--format", "worstaudio");
          }
        }

        break;
      case sharedConstants.FORMATS.VIDEOAUDIO:
        if (info.quality.value === sharedConstants.QUALITIES.HIGHEST) {
          if (info.postProcessing) {
            args.push("--format", "bestvideo+bestaudio");
            if (!reEncode) args.push("--merge-output-format", info.container);
          } else {
            args.push("--format", "bestvideo+bestaudio");
          }
        } else {
          if (info.postProcessing) {
            args.push("--format", "worstvideo+worstaudio");
            if (!reEncode) args.push("--merge-output-format", info.container);
          } else {
            args.push("--format", "worstvideo+worstaudio");
          }
        }

        break;

      default:
        break;
    }
  }

  console.log("Recieved download request...");
  const worker = interact(url, downloadId, args);

  const partialData = {
    status: sharedConstants.DOWNLOAD_STATUSES.PREPARING,
    tempFiles: [],
    rawFiles: [],
  };

  const cancel = (status) => {
    serialKiller(worker.pid, (err) => {
      switch (status) {
        case sharedConstants.DOWNLOAD_STATUSES.DOWNLOADING:
          partialData.tempFiles.forEach((file) => {
            if (!fs.existsSync(file)) return;
            fs.unlinkSync(file);
          });

          break;
        case sharedConstants.DOWNLOAD_STATUSES.PROCESSING:
          partialData.rawFiles.forEach((file) => {
            if (!fs.existsSync(file)) return;
            fs.unlinkSync(file);
          });
          break;

        default:
          break;
      }

      emitter.removeAllListeners();
      return err;
    });
  };

  worker.stdout.on("data", (data) => {
    const text = data.toString().trim();

    if (process.env.NODE_ENV !== "production") {
      console.log(text);
    }

    if (text.startsWith("-")) {
      const data = text.slice(1).split(/\,/g);

      const status = data[0];
      const totalSize = data[1];
      const percent = data[2];
      const speed = data[3];
      const eta = data[4];
      const tmpFilename = data[5];

      partialData.tempFiles.push(tmpFilename);

      if (status === "downloading") {
        emitter.emit("progress", downloadId, {
          status,
          totalSize,
          percent,
          speed,
          eta,
        });
      }
    } else if (text.startsWith(">+")) {
      partialData.status = sharedConstants.DOWNLOAD_STATUSES.PROCESSING;
      emitter.emit("post", downloadId);
    } else if (text.startsWith("=")) {
      partialData.status = sharedConstants.DOWNLOAD_STATUSES.DONE;
      emitter.emit("finish", path.basename(text.slice(1)).trim(), downloadId);
    } else if (text.startsWith("<")) {
      partialData.status = sharedConstants.DOWNLOAD_STATUSES.DOWNLOADING;
      emitter.emit("begin", { id: downloadId, title: text.slice(1) });
    }
  });
  worker.stderr.on("data", (data) => {
    console.log(data.toString());
  });
  worker.stderr.once("data", () => {
    emitter.emit("error", downloadId);
  });

  return {
    emitter,
    cancel: () => cancel(partialData.status),
  };
};
