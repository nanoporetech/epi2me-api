// babel index-src.js -o index.js
export const version = require("./package.json").version;

export default (typeof window !== 'undefined' && window.EPI2ME)
    ? require("./dist/rest.web").default
    : require("./dist/epi2me").default;
