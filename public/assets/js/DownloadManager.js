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
      this.infoDebounce(this.state, validateURL(this.state.url) ? 250 : 0);
    });

    window.ws.addEventListener("message", (e) => {
      const data = JSON.parse(e.data);

      switch (data.type) {
        case "begin": {
          this.createOrUpdateDownloadsListItem(data.id, "begin", data);

          break;
        }
        case "progress": {
          this.createOrUpdateDownloadsListItem(data.progress.id, "progress", data);

          break;
        }
        case "beginPost": {
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
    const { downloadBtn } = this.elements;

    if (isCustomQuality() && !this.state.data) {
      downloadBtn.disabled = true;
    } else {
      downloadBtn.disabled = false;
    }
  }

  infoDebounce(state, debounceTime = 250) {
    if (state.infoDebounce) {
      clearTimeout(state.infoDebounce);
      state.infoDebounce = null;
    }
    state.infoDebounce = setTimeout(async () => {
      if (!validateURL(state.url)) {
        this.state.data = null;
      } else {
        this.state.data = await this.getInfo(state.url, true);
      }
      this.render();
    }, debounceTime);
  }

  async getInfo(url, populate) {
    const request = await fetch("api/info?url=" + url);
    if (!request.ok) return false;

    try {
      return await request.json();
    } catch {
      return false;
    }
  }

  createOrUpdateDownloadsListItem(downloadId, state, data) {
    const { downloadsTemplate, downloadsList, downloadsItems } = this.elements;

    const downloadItem = this.downloadsMap[downloadId] == null ? downloadsTemplate.content.cloneNode(true) : this.downloadsMap[downloadId];

    switch (state) {
      case "init":
        const { abortController } = data;

        downloadItem.querySelector(".downloads__name").innerText = "Preparing download...";
        downloadItem.querySelector(".downloads__item").dataset.id = downloadId;
        downloadItem.querySelector("[data-del]").addEventListener("click", () => {
          this.createOrUpdateDownloadsListItem(downloadId, "delete");
        });

        downloadItem.querySelector("[data-cancel]").addEventListener("click", () => {
          abortController.abort();

          URL.revokeObjectURL(downloadItem.querySelector("[data-dl]").href);
          this.createOrUpdateDownloadsListItem(downloadId, "cancel");
        });

        downloadsList.children.length > 0 ? downloadsList.insertBefore(downloadItem, downloadsList.children[0]) : downloadsList.appendChild(downloadItem);

        for (let i = 0; i < downloadsItems.length; i++) {
          const item = downloadsItems[i];
          if (item.dataset.id === downloadId) {
            this.downloadsMap[downloadId] = item;
            break;
          }
        }
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

        delete this.downloadsMap[downloadId];

        break;
      case "cancel":
        downloadItem.classList.add("failed");
        downloadItem.classList.remove("downloading");
        downloadItem.querySelector(".downloads__progress-text").innerText = "CANCELLED";

        setTimeout(() => {
          this.createOrUpdateDownloadsListItem(downloadId, "delete");
        }, 5000);
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

    if (downloadsItems.length === 0) {
      downloadsList.classList.add("empty");
    } else {
      downloadsList.classList.remove("empty");
    }
  }

  async download() {
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
    });

    if (!download.ok) {
      this.createOrUpdateDownloadsListItem(downloadId, "fail");

      return;
    }

    const blob = await download.blob();
    const downloadURL = URL.createObjectURL(blob);

    this.createOrUpdateDownloadsListItem(download.headers.get("Id"), "finish", { filename: download.headers.get("Filename"), downloadURL });
  }
}
