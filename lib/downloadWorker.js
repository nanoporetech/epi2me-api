/**
 *
 * @param options
 * @returns {downloadWorker}
 */

var sqs, s3, options;

function downloadWorker(config) {

    /**
     * Constructor for Metrichor API downloadWorker
     * config: {
     *  message:      JSON message to be parsed
     *  options: ...
     *  s3,
     *  sqs
     * }
     */
    this.created = Date.now();
    if (!config.options.file) {
        throw new Error("invalid options. file is required");
    }

    return this;
}

downloadWorker.prototype = {
    start: function () {
        return new Promise(function (resolve, reject) {

        });
    },
    processMessage: function (message) {

    },
    deleteMessage: function () {

    },
    initiateDownloadStream: function () {

    }
};

module.exports = downloadWorker;