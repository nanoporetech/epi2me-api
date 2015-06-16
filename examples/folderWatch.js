var Metrichor = require("../lib/metrichor");
var m = new Metrichor({
    watchFolder:          "/Users/rmp/whats-in-my-pot",
    id_workflow_instance: 61427,
    url:                  "https://dev.metrichor.com",
    apikey:               "27448a89ee9794f241307b7e8b9170ba0234b74e",
    bucket:               "eu-west-1-metrichor-dev",
    inputQueueName:       "000-chain-test-rmp-01",
    outputQueueName:      "000-chain-test-rmp-01",
    bucketFolder:         "rmp-test", // private outputqueue,
    targetComponentId:    "",
    chain: {
	components: {}
    },
});

m.autoConfigure();

var statsInterval = setInterval(function () {
    console.log("[" + (new Date()).toISOString() + "] stats", m.stats("sts_expiration"), m.stats("upload"), m.stats("download"));
}, 5000);


setTimeout(function () {
    m.stop_everything();
    clearInterval(statsInterval);
}, 20000);

process.on('SIGINT', function () {
    console.log('Got SIGINT. Stopping.');
    clearInterval(statsInterval);
    m.stop_everything(function () { process.exit(); });
});
