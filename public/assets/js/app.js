"use strict";

const form = document.querySelector(".downloader__form");

const controlPanel = document.querySelector(".control-panel");
const controlPanelToggleBtn = document.querySelector(".control-panel__toggle");

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

const advancedEnabler = document.querySelector("#advanced-enable");
const advancedOptionsFieldset = document.querySelector(".downloader__fieldset.advanced");
const advancedOptionsTrimStart = document.querySelector("#trim1");
const advancedOptionsTrimEnd = document.querySelector("#trim2");
const advancedVideoReencode = document.querySelector("#video-reencode");
const advancedAudioReencode = document.querySelector("#audio-reencode");

const downloadsList = document.querySelector(".downloads__list");
const downloadsCollapseBtn = document.querySelector(".downloads__header");
const downloads = document.querySelector(".downloads");

const downloadsItems = document.getElementsByClassName("downloads__item");

const downloadsTemplate = document.querySelector("#downloads-item-template");

const downloadManager = new DownloadManager(
  form,
  {
    url,
    downloadBtn,
    downloadsTemplate,
    downloadsList,
    downloadsItems,
    customVideoSelect,
    customAudioSelect,
    advancedOptionsTrimStart,
    advancedOptionsTrimEnd,
  },
  {
    isCustomQuality: () => customQualityCheckbox.checked,
    getDownloadInfo: () => {
      const customQuality = customQualityCheckbox.checked ? true : false;

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

      const advancedOptionsEnabled = advancedEnabler.checked && postprocessingCheckbox.checked;

      const advancedOptions = {
        trim: {},
        encoding: {},
      };

      if (advancedOptionsEnabled) {
        if (downloadManager.state.data.duration !== advancedOptionsTrimEnd.valueAsNumber || advancedOptionsTrimStart.valueAsNumber !== 0) {
          advancedOptions.trim.start = advancedOptionsTrimStart.valueAsNumber;
          advancedOptions.trim.end = advancedOptionsTrimEnd.valueAsNumber;
        }
        if (advancedVideoReencode.value !== "copy") {
          advancedOptions.encoding.video = advancedVideoReencode.value;
        }
        if (advancedAudioReencode.value !== "copy") {
          advancedOptions.encoding.audio = advancedAudioReencode.value;
        }
      }

      return {
        format,
        quality,
        postProcessing: postprocessingCheckbox.checked,
        container,
        advancedOptionsEnabled,
        advancedOptions,
      };
    },
  }
);

function formatRoundMb(bytes) {
  return Math.round(((Number.EPSILON + bytes) / 1000000) * 100) / 100;
}

function formatRoundKb(bytes) {
  return Math.round(((Number.EPSILON + bytes) / 1000) * 100) / 100;
}

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

controlPanelToggleBtn.addEventListener("click", () => {
  controlPanel.classList.toggle("active");
});

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

    downloadManager.render();
  } else {
    qualityOptions.classList.remove("disabled");
    customQualityOptions.classList.add("disabled");
    customQualityOptions.disabled = true;
    qualityLowRadio.disabled = false;
    qualityHighRadio.disabled = false;

    downloadManager.render();
  }
});

function inputSelectAllText(e) {
  e.target.select();
}

function toggleSection(e, targetSection, customCheck) {
  if (customCheck != null && !customCheck()) return;
  e.target.checked ? (targetSection.disabled = false) : (targetSection.disabled = true);
}

url.addEventListener("focus", inputSelectAllText);
advancedOptionsTrimStart.addEventListener("focus", inputSelectAllText);
advancedOptionsTrimEnd.addEventListener("focus", inputSelectAllText);

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

advancedOptionsTrimStart.addEventListener("input", () => {
  if (!advancedOptionsTrimStart.value) {
    advancedOptionsTrimStart.value = 0;
  }
  const time = advancedOptionsTrimStart.valueAsNumber;

  if (time === 0) {
    advancedOptionsTrimStart.min = 0;
    advancedOptionsTrimEnd.max = downloadManager.state.data ? downloadManager.state.data.duration : 0;
  } else {
    advancedOptionsTrimEnd.min = time;
  }
});

advancedOptionsTrimEnd.addEventListener("input", () => {
  if (!advancedOptionsTrimEnd.value) {
    advancedOptionsTrimEnd.value = advancedOptionsTrimEnd.max;
  }
  const time = advancedOptionsTrimEnd.valueAsNumber;

  advancedOptionsTrimStart.max = time;
});

postprocessingCheckbox.addEventListener("input", (e) => toggleSection(e, advancedOptionsFieldset, () => advancedEnabler.checked));

advancedEnabler.addEventListener("input", (e) => toggleSection(e, advancedOptionsFieldset, () => postprocessingCheckbox.checked));

downloadsCollapseBtn.addEventListener("click", () => {
  downloads.classList.toggle("collapsed");
});
