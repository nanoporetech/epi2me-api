import assert from 'assert';
import sinon from 'sinon';
import EPI2ME from '../../src/epi2me-fs';

describe('session-manager', () => {
  describe('session', () => {
    let clock;
    let stubs;

    beforeEach(() => {
      const now = new Date();
      clock = sinon.useFakeTimers(now.getTime());
      stubs = [];
    });

    afterEach(() => {
      clock.restore();
      stubs.forEach(s => {
        s.restore();
      });
    });

    const epi2me = {
      REST: {
        instanceToken: () => {},
      },
    };

    const child = {
      config: {
        update: () => {},
      },
    };

    const log = {
      debug: sinon.fake(),
    };

    it('should yield if unexpired', async () => {
      const sm = new EPI2ME.SessionManager(1, epi2me, [child], {
        log,
      });
      const d = new Date();
      d.setMinutes(d.getMinutes() + 1);
      sm.sts_expiration = d.getTime();
      stubs.push(sinon.stub(epi2me.REST, 'instanceToken').resolves({}));
      await sm.session();
      assert.equal(epi2me.REST.instanceToken.callCount, 0, 'no token requested');
    });

    it('should request if uninitialised', async () => {
      const sm = new EPI2ME.SessionManager(1, epi2me, [child], {
        log,
      });

      const token = {
        expiration: new Date('1974-03-25'),
      };
      stubs.push(sinon.stub(epi2me.REST, 'instanceToken').resolves(token));
      stubs.push(sinon.stub(child.config, 'update'));
      await sm.session();
      assert.equal(epi2me.REST.instanceToken.callCount, 1, 'new token requested');
      assert.equal(child.config.update.callCount, 1, 'config update');
    });

    it('should request if expired', async () => {
      const sm = new EPI2ME.SessionManager(1, epi2me, [child], {
        log,
      });
      const d = new Date('1974-03-25');
      d.setMinutes(d.getMinutes() - 1);
      sm.sts_expiration = d.getTime();

      const token = {
        expiration: '1974-03-25',
      };
      stubs.push(sinon.stub(epi2me.REST, 'instanceToken').resolves(token));
      stubs.push(sinon.stub(child.config, 'update'));
      await sm.session();
      assert.equal(epi2me.REST.instanceToken.callCount, 1, 'new token requested');
      assert.equal(child.config.update.callCount, 1, 'config update');
    });

    it('should set expiry time', async () => {
      const sm = new EPI2ME.SessionManager(1, epi2me, [child], {
        log,
      });

      const token = {
        expiration: '1974-03-25',
      };
      stubs.push(sinon.stub(epi2me.REST, 'instanceToken').resolves(token));
      stubs.push(sinon.stub(child.config, 'update'));
      await sm.session();

      assert.deepEqual(sm.sts_expiration, 133401600000, 'set time');
    });

    it('should configure extra attrs', async () => {
      const sm = new EPI2ME.SessionManager(1, epi2me, [child], {
        log,
        proxy: 'http://test.local:3128/',
        region: 'eu-test-1',
      });

      const token = {
        expiration: '1974-03-25',
      };
      stubs.push(sinon.stub(epi2me.REST, 'instanceToken').resolves(token));
      stubs.push(sinon.stub(child.config, 'update'));
      await sm.session();

      assert.equal(child.config.update.args[0][0].httpOptions.agent.proxy.href, 'http://test.local:3128/', 'proxy');
      assert.equal(child.config.update.args[0][0].region, 'eu-test-1', 'region');
    });
  });
});
