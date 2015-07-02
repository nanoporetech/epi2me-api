var Metrichor = require("../lib/metrichor");
var m = new Metrichor({
    inputFolder:          "/Users/rmp/whats-in-my-pot.tiny",
    outputFolder:         "/Users/rmp/whats-in-my-pot.tiny/downloads",
    id_workflow_instance: 61427,
    url:                  "https://dev.metrichor.com",
    apikey:               "27448a89ee9794f241307b7e8b9170ba0234b74e",
    bucket:               "eu-west-1-metrichor-dev",
    inputQueueName:       "000-chain-test-rmp-01",
    outputQueueName:      "000-chain-test-rmp-01",
    bucketFolder:         "rmp-test", // private outputqueue,
    chain: {
	components: {},
	targetComponentId:    ""
    },
});



function dumpstats () {
    console.log("[" + (new Date()).toISOString() + "] stats ", m.stats("upload").success, "/", m.stats("download").success);
}

function cleanup (cb) {
    clearInterval(statsInterval);
    m.stop_everything(cb);
    dumpstats();
}

m.autoConfigure();

var statsInterval = setInterval(dumpstats, 5000);

setTimeout(cleanup, 20000);

process.on('SIGINT', function () {
    console.log('Got SIGINT. Stopping.');
    cleanup(function () { process.exit(); });
});
