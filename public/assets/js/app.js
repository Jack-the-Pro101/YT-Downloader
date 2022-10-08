"use strict";

const form = document.querySelector(".downloader__form");

const url = document.querySelector("#url");
const downloadBtn = document.querySelector(".url__download-btn");

const formatVideoRadio = document.querySelector("#video");
const formatVideoAudioRadio = document.querySelector("#videoaudio");
const formatAudioRadio = document.querySelector("#audio");

const qualityLowRadio = document.querySelector("#lowest");
const qualityHighRadio = document.querySelector("#highest");

const postprocessingCheckbox = document.querySelector("#postprocessing");

const customVideoSelect = document.querySelector("#customvideo");
const customAudioSelect = document.querySelector("#customaudio");
const customVideoViewSrcBtn = document.querySelector(".customvideo-btn");
const customAudioViewSrcBtn = document.querySelector(".customaudio-btn");

const customQualityCheckbox = document.querySelector("#custom");

const containerSelect = document.querySelector("#container");

const advancedOptionsFieldset = document.querySelector(".downloader__fieldset.advanced");
const advancedOptionsTrimStart = document.querySelector("#trim1");
const advancedOptionsTrimEnd = document.querySelector("#trim2");

const downloadsList = document.querySelector(".downloads__list");
const downloadsCollapseBtn = document.querySelector(".downloads__header");
const downloads = document.querySelector(".downloads");

const downloadsItems = document.getElementsByClassName("downloads__item");

const downloadsTemplate = document.querySelector("#downloads-item-template");

const state = { url: "", data: null, debounce: null };
const downloadsMap = {};

function activateDebounce() {
  if (state.debounce) {
    clearTimeout(state.debounce);
    state.debounce = null;
  }

  state.debounce = setTimeout(async () => {
    state.url = url.value;
    state.data = null;

    const data = await getInfo(state.url);
    state.data = data;
    !state.data ? (downloadBtn.innerText = "Get Info") : (downloadBtn.innerText = "Download");
    populateDownloaderData(data);
  }, 500);
}

url.addEventListener("input", () => {
  if (url.value !== state.url) {
    state.url = url.value;
    state.data = null;
    downloadBtn.innerText = customQualityCheckbox.checked ? "Get Info" : "Download";
    populateDownloaderData(state.data);
    activateDebounce();
  }
});

function handleFormatChange(e) {
  containerSelect.innerHTML = "";

  if (e.target.id === "video" || e.target.id === "videoaudio") {
    for (let i = 0; i < VIDEO_CONTAINERS.length; i++) {
      const container = VIDEO_CONTAINERS[i];

      const elem = document.createElement("option");
      elem.value = container;
      elem.classList.add("container__option");
      elem.innerText = container;

      containerSelect.appendChild(elem);
    }
  } else if (e.target.id === "audio") {
    for (let i = 0; i < AUDIO_CONTAINERS.length; i++) {
      const container = AUDIO_CONTAINERS[i];

      const elem = document.createElement("option");
      elem.value = container;
      elem.classList.add("container__option");
      elem.innerText = container;

      containerSelect.appendChild(elem);
    }
  }
}

formatVideoRadio.addEventListener("input", handleFormatChange);
formatAudioRadio.addEventListener("input", handleFormatChange);
formatVideoAudioRadio.addEventListener("input", handleFormatChange);

const qualityOptions = document.querySelector(".quality");
const customQualityOptions = document.querySelector(".custom-quality");

customQualityCheckbox.addEventListener("input", () => {
  if (customQualityCheckbox.checked) {
    qualityOptions.classList.add("disabled");
    customQualityOptions.classList.remove("disabled");
    customQualityOptions.disabled = false;
    qualityLowRadio.disabled = true;
    qualityHighRadio.disabled = true;

    state.data == null ? (downloadBtn.innerText = "Get Info") : (downloadBtn.innerText = "Download");
  } else {
    qualityOptions.classList.remove("disabled");
    customQualityOptions.classList.add("disabled");
    customQualityOptions.disabled = true;
    qualityLowRadio.disabled = false;
    qualityHighRadio.disabled = false;

    downloadBtn.innerText = "Download";
  }
});

async function getInfo(url) {
  const request = await fetch("api/info?url=" + url);
  if (!request.ok) return false;

  try {
    return await request.json();
  } catch {
    return false;
  }
}

function formatRoundMb(bytes) {
  return Math.round(((Number.EPSILON + bytes) / 1000000) * 100) / 100;
}

function formatRoundKb(bytes) {
  return Math.round(((Number.EPSILON + bytes) / 1000) * 100) / 100;
}

function populateDownloaderData(data) {
  customVideoSelect.innerHTML = "";
  customAudioSelect.innerHTML = "";
  advancedOptionsTrimEnd.value = "0";

  if (!data) return;

  advancedOptionsTrimEnd.value = data.duration;

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

customVideoViewSrcBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (customVideoSelect.selectedIndex === -1) return;

  const url = customVideoSelect.options[customVideoSelect.selectedIndex].dataset.source;
  if (url) window.open(url, "_blank");
});
customAudioViewSrcBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (customAudioSelect.selectedIndex === -1) return;

  const url = customAudioSelect.options[customAudioSelect.selectedIndex].dataset.source;
  if (url) window.open(url, "_blank");
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!window.ws.alive) return alert("Websocket is disconnected...\nAttempting reconnect, please wait.");

  const customQuality = customQualityCheckbox.checked ? true : false;

  if (customQuality && !state.data) {
    const data = await getInfo(state.url);

    if (!data) return;

    state.data = data;
    downloadBtn.innerText = "Download";

    populateDownloaderData(data);

    return;
  }

  const format = formatAudioRadio.checked
    ? FORMATS.AUDIO
    : false || formatVideoRadio.checked
    ? FORMATS.VIDEO
    : false || formatVideoAudioRadio.checked
    ? FORMATS.VIDEOAUDIO
    : false;

  function calculateCustomQuality() {
    return {
      video: customVideoSelect.value || false,
      audio: customAudioSelect.value || false,
    };
  }

  const quality = {
    custom: customQuality,
    value: customQuality
      ? calculateCustomQuality()
      : qualityHighRadio.checked
      ? QUALITIES.HIGHEST
      : false || qualityLowRadio.checked
      ? QUALITIES.LOWEST
      : false,
  };

  const container = containerSelect.value;

  const payload = {
    format,
    quality,
    postProcessing: postprocessingCheckbox.checked,
    container,
  };

  const downloadId = uuidv4();

  const urlParams = new URLSearchParams();
  urlParams.append("url", state.url);
  urlParams.append("info", JSON.stringify(payload));
  urlParams.append("id", downloadId);

  state.url = "";
  state.data = null;
  url.value = state.url;

  const downloadItem = downloadsTemplate.content.cloneNode(true);
  downloadItem.querySelector(".downloads__name").innerText = "Preparing download...";
  downloadItem.querySelector(".downloads__item").dataset.id = downloadId;

  downloadItem.querySelector("[data-del]").addEventListener("click", () => {
    const item = downloadsMap[downloadId];
    URL.revokeObjectURL(item.querySelector("[data-dl]").href);
    item.remove();
    delete downloadsMap[downloadId];

    if (downloadsItems.length === 0) downloadsList.classList.add("empty");
  });

  const abortController = new AbortController();

  downloadItem.querySelector("[data-cancel]").addEventListener("click", () => {
    abortController.abort();

    const item = downloadsMap[downloadId];

    item.classList.add("failed");
    item.classList.remove("downloading");
    item.querySelector(".downloads__progress-text").innerText = "CANCELLED";

    setTimeout(() => {
      item.remove();
      delete downloadsMap[downloadId];
    }, 2000);
  });

  downloadsList.children.length > 0 ? downloadsList.insertBefore(downloadItem, downloadsList.children[0]) : downloadsList.appendChild(downloadItem);

  downloadsList.classList.remove("empty");

  for (let i = 0; i < downloadsItems.length; i++) {
    const item = downloadsItems[i];
    if (item.dataset.id === downloadId) {
      downloadsMap[downloadId] = item;
      break;
    }
  }

  const download = await fetch("download?" + urlParams.toString(), {
    method: "GET",
    signal: abortController.signal,
  });

  if (!download.ok) {
    const item = downloadsMap[downloadId];

    item.querySelector(".downloads__progress-text").innerText = "FAILED";
    item.classList.add("failed");
    item.classList.remove("downloading");

    delete downloadsMap[downloadId];

    return;
  }

  const blob = await download.blob();

  const downloadURL = URL.createObjectURL(blob);

  const item = downloadsMap[download.headers.get("Id")];

  const a = item.querySelector("[data-dl]");

  a.href = downloadURL;
  a.download = download.headers.get("Filename") || "Download";
  a.click();

  item.classList.remove("downloading");
});

postprocessingCheckbox.addEventListener("input", (e) =>
  e.target.checked ? (advancedOptionsFieldset.disabled = false) : (advancedOptionsFieldset.disabled = true)
);

downloadsCollapseBtn.addEventListener("click", () => {
  downloads.classList.toggle("collapsed");
});

window.ws.addEventListener("message", (e) => {
  const data = JSON.parse(e.data);

  switch (data.type) {
    case "begin": {
      const item = downloadsMap[data.id];

      item.querySelector(".downloads__name").innerText = data.title;
      item.querySelector(".downloads__name").title = data.title;

      break;
    }
    case "progress": {
      const item = downloadsMap[data.progress.id];

      item.querySelector(".downloads__progress-bar").style = `--percent: ${data.progress.percent}`;
      item.querySelector(".downloads__progress-text").innerText = data.progress.percent;

      break;
    }
    case "beginPost": {
      const item = downloadsMap[data.id];

      item.querySelector(".downloads__progress-text").innerText = "Processing...";

      break;
    }
  }
});
