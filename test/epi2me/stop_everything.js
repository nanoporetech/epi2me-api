const assert = require("assert");
const sinon  = require("sinon");

import EPI2ME from "../../src/epi2me";
import REST from "../../src/rest";

describe('epi2me.stop_everything', () => {

    it('should clear download interval', (done) => {
        let client;
        const clock = sinon.useFakeTimers();

        assert.doesNotThrow(() => {
            client = new EPI2ME();
            sinon.stub(client.REST, "stop_workflow").callsFake();
            
            client._downloadCheckInterval = setInterval(() => {}, 100);
        });
        
        assert.doesNotThrow(() => {
            client.stop_everything();
        }, Error, 'client obtained');
        
        clock.restore();
        done();
    });
    
    it('should clear statecheck interval', (done) => {
        let client;
        const clock = sinon.useFakeTimers();
        
        assert.doesNotThrow(() => {
            client = new EPI2ME();
            sinon.stub(client.REST, "stop_workflow").callsFake();
            
            client._stateCheckInterval = setInterval(() => {}, 100);
        });
        
        assert.doesNotThrow(() => {
            client.stop_everything();
        }, Error, 'client obtained');
        
        clock.restore();
        done();
    });
    
    it('should clear filecheck interval', (done) => {
        let client;
        const clock = sinon.useFakeTimers();
        
        assert.doesNotThrow(() => {
            client = new EPI2ME();
            sinon.stub(client.REST, "stop_workflow").callsFake();
            
            client._downloadCheckInterval = setInterval(() => {}, 100);
            client._stateCheckInterval = setInterval(() => {}, 100);
            client._fileCheckInterval = setInterval(() => {}, 100);
        });
        
        assert.doesNotThrow(() => {
            client.stop_everything();
        }, Error, 'client obtained');
        
        clock.restore();
        done();
    });
    /* converted to promise.all - not quite right
    it('should drain upload worker', (done) => {
        let client;
        const clock = sinon.useFakeTimers();
        
        let uploadDrain = sinon.fake();
        
        assert.doesNotThrow(() => {
            client = new EPI2ME();
            sinon.stub(client.REST, "stop_workflow").callsFake();
            client.uploadWorkerPool = { "drain": uploadDrain };
            
            client._downloadCheckInterval = setInterval(() => {}, 100);
            client._stateCheckInterval    = setInterval(() => {}, 100);
            client._fileCheckInterval     = setInterval(() => {}, 100);
        });
        
        assert.doesNotThrow(() => {
            client.stop_everything();
        }, Error, 'client obtained');
        
        sinon.assert.calledOnce(uploadDrain); // upload drain requested
        
        clock.restore();
        done();
    });
    */
    it('should drain download worker', (done) => {
        let client;
        const clock = sinon.useFakeTimers();
        
        let downloadDrain=sinon.fake();
        
        assert.doesNotThrow(() => {
            client = new EPI2ME();
            sinon.stub(client.REST, "stop_workflow").callsFake();
            client.downloadWorkerPool = { "drain": downloadDrain };
            
            client._downloadCheckInterval = setInterval(() => {}, 100);
            client._stateCheckInterval = setInterval(() => {}, 100);
            client._fileCheckInterval = setInterval(() => {}, 100);
        });
        
        assert.doesNotThrow(() => {
            client.stop_everything();
        }, Error, 'client obtained');
        
        sinon.assert.calledOnce(downloadDrain); // download drain requested
        
        clock.restore();
        done();
    });
    
    it('should request stop_workflow with callback', (done) => {
        let client;
        const clock = sinon.useFakeTimers();
        
        let stub1;
        let stub2 = sinon.fake();
        assert.doesNotThrow(() => {
            client = new EPI2ME({id_workflow_instance: 12345});
            stub1 = sinon.stub(client.REST, "stop_workflow").callsFake((id, cb) => { return cb(); });
        });
        
        assert.doesNotThrow(() => {
            client.stop_everything(stub2);
        }, Error, 'client obtained');
        
        sinon.assert.calledOnce(stub1); // rest call made
        sinon.assert.calledOnce(stub2); // callback fired
        
        clock.restore();
        done();
    });
    
    it('should request stop_workflow without callback', (done) => {
        let client;
        const clock = sinon.useFakeTimers();
        
        let stub1;
        assert.doesNotThrow(() => {
            client = new EPI2ME({id_workflow_instance: 12345});
            stub1 = sinon.stub(client.REST, "stop_workflow").callsFake((id, cb) => { return cb(); });
        });
        
        assert.doesNotThrow(() => {
            client.stop_everything();
        }, Error, 'client obtained');
        
        sinon.assert.calledOnce(stub1); // rest call made
        
        clock.restore();
        done();
    });
    
    
    it('should fire callback', (done) => {
        let client;
        const clock = sinon.useFakeTimers();
        
        let stub2 = sinon.fake();
        assert.doesNotThrow(() => {
            client = new EPI2ME();
        });
        
        assert.doesNotThrow(() => {
            client.stop_everything(stub2);
        }, Error, 'client obtained');
        
        sinon.assert.calledOnce(stub2); // callback fired
        
        clock.restore();
        done();
    });
});
