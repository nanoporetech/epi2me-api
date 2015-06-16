var Metrichor = require("../lib/metrichor");
var m = new Metrichor({
    watchFolder:          "/tmp",
    id_workflow_instance: 61427,
    url:                  "https://dev.metrichor.com",
    apikey:               "27448a89ee9794f241307b7e8b9170ba0234b74e",
    bucket:               "eu-west-1-metrichor-dev",
    queueName:            "000-chain-test-rmp-01",
    bucketFolder:         "rmp-test", // private outputqueue,
    targetComponentId:    "",
    chain: {
	components: {}
    },
});

m.autoConfigure();
