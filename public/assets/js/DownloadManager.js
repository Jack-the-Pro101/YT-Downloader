const texts = {};

class DownloadManager {
  constructor(form, elements = {}, functions = {}) {
    this.elements = elements;
    this.functions = functions;

    const { url } = elements;

    this.state = {
      url: "",
      previousUrl: "",
      ready: false,
      data: null,
      infoDebounce: null,
    };
    this.downloadsMap = {};

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      this.download();
    });

    url.addEventListener("input", () => {
      this.updateState("url", url.value, null, (state) => (state.previousUrl = state.url));
      const validURL = validateURL(this.state.url);
      this.infoDebounce(this.state, validURL ? 0 : 200, { validURL });
    });

    window.ws.addEventListener("message", (e) => {
      const data = JSON.parse(e.data);

      switch (data.type) {
        case "begin": {
          if (this.downloadsMap[data.id].cancelled) return;
          this.createOrUpdateDownloadsListItem(data.id, "begin", data);

          break;
        }
        case "progress": {
          if (this.downloadsMap[data.id].cancelled) return;
          this.createOrUpdateDownloadsListItem(data.id, "progress", data);

          break;
        }
        case "beginPost": {
          if (this.downloadsMap[data.id].cancelled) return;
          this.createOrUpdateDownloadsListItem(data.id, "beginPost");
          break;
        }
      }
    });
  }

  updateState(name, value, callbackAfter, callbackBefore) {
    if (callbackBefore) callbackBefore(this.state);

    this.state[name] = value;

    if (callbackAfter) callbackAfter(this.state);
  }

  render() {
    const { isCustomQuality } = this.functions;
    const { downloadBtn, customVideoSelect, customAudioSelect, advancedVideoReencode, advancedAudioReencode } = this.elements;

    if (isCustomQuality() && !this.state.data) {
      downloadBtn.disabled = true;
    } else {
      downloadBtn.disabled = false;
    }

    const format = this.functions.getDownloadInfo().format;
    if (format === FORMATS.AUDIO) {
      customVideoSelect.disabled = true;
      advancedVideoReencode.disabled = true;
      customAudioSelect.disabled = false;
      advancedAudioReencode.disabled = false;
    } else if (format === FORMATS.VIDEO) {
      customVideoSelect.disabled = false;
      advancedVideoReencode.disabled = false;
      customAudioSelect.disabled = true;
      advancedAudioReencode.disabled = true;
    } else {
      customVideoSelect.disabled = false;
      advancedVideoReencode.disabled = false;
      customAudioSelect.disabled = false;
      advancedAudioReencode.disabled = false;
    }
  }

  infoDebounce(state, debounceTime = 250, data) {
    if (state.infoDebounce) {
      clearTimeout(state.infoDebounce);
      state.infoDebounce = null;
    }
    if (this.state.data != null) this.populateDownloadInfo(); // Primer;
    state.infoDebounce = setTimeout(async () => {
      this.state.data = null;

      if (data.validURL) this.state.data = await this.getInfo(state.url, true);

      this.render();
    }, debounceTime);
  }

  populateDownloadInfo(data) {
    const { customVideoSelect, customAudioSelect, advancedOptionsTrimStart, advancedOptionsTrimEnd } = this.elements;

    customVideoSelect.innerHTML = "";
    customAudioSelect.innerHTML = "";
    advancedOptionsTrimStart.max = "0";
    advancedOptionsTrimEnd.value = "0";

    if (!data) return;

    advancedOptionsTrimEnd.value = data.duration;
    advancedOptionsTrimEnd.max = data.duration;
    advancedOptionsTrimStart.max = data.duration;

    data.formats.reverse();

    if (postprocessingCheckbox.checked) {
      data.formats.forEach((format) => {
        if (format.vcodec === "none") return;
        const option = document.createElement("option");

        option.value = format.format_id;
        option.innerText = `${format.resolution}p ${format.video_ext} ${format.vcodec} @ ${format.fps}fps | ${formatRoundMb(
          format.filesize || format.filesize_approx
        )}MB | ${formatRoundKb(format.vbr)}kbps bitrate`;

        option.dataset.source = format.url;

        customVideoSelect.appendChild(option);
      });

      data.formats.forEach((format) => {
        if (format.acodec === "none") return;
        const option = document.createElement("option");

        option.value = format.format_id;
        option.innerText = `${format.asr}hz ${format.audio_ext} ${format.acodec} | ${formatRoundMb(
          format.filesize || format.filesize_approx
        )}MB | ${formatRoundKb(format.abr)}kbps bitrate`;

        option.dataset.source = format.url;

        customAudioSelect.appendChild(option);
      });
    } else {
    }
  }

  async getInfo(url, populate) {
    const { downloadBtn } = this.elements;

    const timeoutAddLoading = setTimeout(() => {
      downloadBtn.classList.add("loading");
    }, 100);

    const request = await fetch("api/info?url=" + url);

    clearTimeout(timeoutAddLoading);
    downloadBtn.classList.remove("loading");

    if (!request.ok) return false;

    try {
      const data = await request.json();
      if (populate) this.populateDownloadInfo(data);
      return data;
    } catch {
      return false;
    }
  }

  createOrUpdateDownloadsListItem(downloadId, state, data) {
    const { downloadsTemplate, downloadsList, downloadsItems } = this.elements;

    const downloadItemExists = this.downloadsMap[downloadId] == null;
    const downloadItem = downloadItemExists ? downloadsTemplate.content.cloneNode(true) : this.downloadsMap[downloadId].element;

    switch (state) {
      case "init":
        const { abortController } = data;

        downloadItem.querySelector(".downloads__name").innerText = !this.state.data ? "Preparing download..." : this.state.data.title;
        downloadItem.querySelector(".downloads__name").title = !this.state.data ? "..." : this.state.data.title;

        downloadItem.querySelector(".downloads__item").dataset.id = downloadId;
        downloadItem.querySelector("[data-del]").addEventListener("click", () => {
          URL.revokeObjectURL(this.downloadsMap[downloadId].element.href);
          this.createOrUpdateDownloadsListItem(downloadId, "delete");
        });

        downloadItem.querySelector("[data-cancel]").addEventListener("click", () => {
          abortController.abort();

          this.createOrUpdateDownloadsListItem(downloadId, "cancel");
        });
        break;
      case "begin":
        downloadItem.querySelector(".downloads__name").innerText = data.title;
        downloadItem.querySelector(".downloads__name").title = data.title;
        break;
      case "progress":
        downloadItem.querySelector(".downloads__progress-bar").style = `--percent: ${data.progress.percent}`;
        downloadItem.querySelector(".downloads__progress-text").innerText = data.progress.percent;

        break;

      case "beginPost":
        downloadItem.querySelector(".downloads__progress-text").innerText = "Processing...";

        break;
      case "fail":
        downloadItem.querySelector(".downloads__progress-text").innerText = "FAILED";
        downloadItem.classList.add("failed");
        downloadItem.classList.remove("downloading");

        setTimeout(() => {
          this.createOrUpdateDownloadsListItem(downloadId, "delete");
        }, 12000);
        break;
      case "cancel":
        this.downloadsMap[downloadId].cancelled = true;

        downloadItem.classList.add("failed");
        downloadItem.classList.remove("downloading");
        downloadItem.querySelector(".downloads__progress-text").innerText = "CANCELLED";

        setTimeout(() => {
          this.createOrUpdateDownloadsListItem(downloadId, "delete");
        }, 7500);
        break;

      case "finish":
        const { filename, downloadURL } = data;

        const a = downloadItem.querySelector("[data-dl]");
        a.href = downloadURL;
        a.download = filename || "Download";
        a.click();

        downloadItem.classList.remove("downloading");

        break;

      case "delete":
        delete this.downloadsMap[downloadId];
        downloadItem.remove();
        break;

      default:
        break;
    }

    if (downloadItemExists) {
      downloadsList.children.length > 0 ? downloadsList.insertBefore(downloadItem, downloadsList.children[0]) : downloadsList.appendChild(downloadItem);

      for (let i = 0; i < downloadsItems.length; i++) {
        const item = downloadsItems[i];
        if (item.dataset.id === downloadId) {
          this.downloadsMap[downloadId] = {
            cancelled: false,
            element: item,
          };

          break;
        }
      }
    }

    if (downloadsItems.length === 0) {
      downloadsList.classList.add("empty");
    } else {
      downloadsList.classList.remove("empty");
    }
  }

  async download() {
    if (!window.ws.alive) {
      return alert("Websocket not connected!\nPlease wait a few seconds for reconnection before downloading...");
    }

    const { getDownloadInfo } = this.functions;

    const payload = getDownloadInfo();
    const downloadId = uuidv4();

    const urlParams = new URLSearchParams();
    urlParams.append("url", this.state.url);
    urlParams.append("info", JSON.stringify(payload));
    urlParams.append("id", downloadId);

    const abortController = new AbortController();

    this.createOrUpdateDownloadsListItem(downloadId, "init", { abortController });

    const download = await fetch("download?" + urlParams.toString(), {
      method: "GET",
      signal: abortController.signal,
    }).catch((rej) => {}); // Aborted, expected behaviour

    if ((!this.downloadsMap[downloadId].cancelled && download == null) || (download != null && !download.ok)) {
      this.createOrUpdateDownloadsListItem(downloadId, "fail");
    }
    if (download == null || !download.ok) return;

    const blob = await download.blob();
    const downloadURL = URL.createObjectURL(blob);

    this.createOrUpdateDownloadsListItem(download.headers.get("Id"), "finish", { filename: download.headers.get("Filename"), downloadURL });
  }
}
