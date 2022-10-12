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

const DOWNLOAD_STATUSES = {
  PREPARING: 0,
  DOWNLOADING: 1,
  PROCESSING: 2,
  DONE: 3,
};

/**
 * Get video ID.
 *
 * There are a few type of video URL formats.
 *  - https://www.youtube.com/watch?v=VIDEO_ID
 *  - https://m.youtube.com/watch?v=VIDEO_ID
 *  - https://youtu.be/VIDEO_ID
 *  - https://www.youtube.com/v/VIDEO_ID
 *  - https://www.youtube.com/embed/VIDEO_ID
 *  - https://music.youtube.com/watch?v=VIDEO_ID
 *  - https://gaming.youtube.com/watch?v=VIDEO_ID
 *
 * @param {string} link
 * @return {string}
 * @throws {Error} If unable to find a id
 * @throws {TypeError} If videoid doesn't match specs
 */
const validQueryDomains = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "gaming.youtube.com"]);
const validPathDomains = /^https?:\/\/(youtu\.be\/|(www\.)?youtube\.com\/(embed|v|shorts)\/)/;
const getURLVideoID = (link) => {
  const parsed = new URL(link.trim());
  let id = parsed.searchParams.get("v");
  if (validPathDomains.test(link.trim()) && !id) {
    const paths = parsed.pathname.split("/");
    id = parsed.host === "youtu.be" ? paths[1] : paths[2];
  } else if (parsed.hostname && !validQueryDomains.has(parsed.hostname)) {
    throw Error("Not a YouTube domain");
  }
  if (!id) {
    throw Error(`No video id found: "${link}"`);
  }
  id = id.substring(0, 11);
  if (!validateID(id)) {
    throw TypeError(`Video id (${id}) does not match expected ` + `format (${idRegex.toString()})`);
  }
  return id;
};

/**
 * Gets video ID either from a url or by checking if the given string
 * matches the video ID format.
 *
 * @param {string} str
 * @returns {string}
 * @throws {Error} If unable to find a id
 * @throws {TypeError} If videoid doesn't match specs
 */
const urlRegex = /^https?:\/\//;
const getVideoID = (str) => {
  if (validateID(str)) {
    return str;
  } else if (urlRegex.test(str.trim())) {
    return getURLVideoID(str);
  } else {
    throw Error(`No video id found: ${str}`);
  }
};

/**
 * Returns true if given id satifies YouTube's id format.
 *
 * @param {string} id
 * @return {boolean}
 */
const idRegex = /^[a-zA-Z0-9-_]{11}$/;
const validateID = (id) => idRegex.test(id.trim());

/**
 * Checks wether the input string includes a valid id.
 *
 * @param {string} string
 * @returns {boolean}
 */
const validateURL = (string) => {
  try {
    getURLVideoID(string);
    return true;
  } catch (e) {
    return false;
  }
};

if (typeof window === "undefined") {
  module.exports = {
    FORMATS,
    QUALITIES,
    AUDIO_CONTAINERS,
    VIDEO_CONTAINERS,
    DOWNLOAD_STATUSES,
    validateID,
    validateURL,
    getVideoID,
    getURLVideoID,
  };
}
