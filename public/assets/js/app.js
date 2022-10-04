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

const state = { url: "", data: null };

url.addEventListener("input", () => {
  if (url.value !== state.url) {
    state.url = url.value;
    state.data = null;
    downloadBtn.innerText = customQualityCheckbox.checked ? "Get Info" : "Download";
    populateCustomQualities(state.data);
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

    if (state.data == null) {
      downloadBtn.innerText = "Get Info";
    } else {
      downloadBtn.innerText = "Download";
    }
  } else {
    qualityOptions.classList.remove("disabled");
    customQualityOptions.classList.add("disabled");
    customQualityOptions.disabled = true;
    qualityLowRadio.disabled = false;
    qualityHighRadio.disabled = false;

    downloadBtn.innerText = "Download";
  }
});

function populateCustomQualities(data) {
  customVideoSelect.innerHTML = "";
  customAudioSelect.innerHTML = "";
  if (data == null) return;
  if (postprocessingCheckbox.checked) {
    data.formats.forEach((format) => {
      if (format.vcodec === "none") return;
      const option = document.createElement("option");

      option.value = format.format_id;
      option.innerText = `${format.resolution}p ${format.video_ext} ${format.vcodec} @ ${format.fps}fps | ${
        Math.round(((Number.EPSILON + format.filesize || format.filesize_approx) / 1000000) * 100) / 100
      }MB | ${Math.round(((Number.EPSILON + format.vbr) / 1000) * 100) / 100}kbps bitrate`;

      option.dataset.source = format.url;

      customVideoSelect.appendChild(option);
    });

    data.formats.forEach((format) => {
      if (format.acodec === "none") return;
      const option = document.createElement("option");

      option.value = format.format_id;
      option.innerText = `${format.asr}hz ${format.audio_ext} ${format.acodec} | ${
        Math.round(((Number.EPSILON + format.filesize || format.filesize_approx) / 1000000) * 100) / 100
      }MB | ${Math.round(((Number.EPSILON + format.abr) / 1000) * 100) / 100}kbps bitrate`;

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

  const customQuality = customQualityCheckbox.checked ? true : false;

  if (customQuality && !state.data) {
    const data = await (await fetch("api/info?url=" + state.url)).json();

    if (!data) return;

    state.data = data;
    downloadBtn.innerText = "Download";

    populateCustomQualities(data);

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

  const urlParams = new URLSearchParams();
  urlParams.append("url", state.url);
  urlParams.append("info", JSON.stringify(payload));

  const download = await fetch("download?" + urlParams.toString(), {
    method: "GET",
  });

  const blob = await download.blob();

  const downloadURL = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadURL;
  a.download = download.headers.get("Filename") || "Download";
  document.body.appendChild(a);
  a.click();
  a.remove();
});

const downloadsCollapseBtn = document.querySelector(".downloads__header");
const downloads = document.querySelector(".downloads");

downloadsCollapseBtn.addEventListener("click", () => {
  downloads.classList.toggle("collapsed");
});
