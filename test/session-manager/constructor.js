import assert from 'assert';
import sinon from 'sinon';
import EPI2ME from '../../src/epi2me-fs';

describe('session-manager', () => {
  describe('constructor', () => {
    it('should require instance id', () => {
      try {
        const sm = new EPI2ME.SessionManager();
        assert.fail(`unexpected success`);
      } catch (e) {
        assert.ok(String(e).match(/must specify id_workflow_instance/), String(e));
      }
    });

    it('should require children to update', () => {
      try {
        const sm = new EPI2ME.SessionManager(1);
        assert.fail(`unexpected success`);
      } catch (e) {
        assert.ok(String(e).match(/must specify children to session/), String(e));
      }
    });

    it('should require at least one child', () => {
      try {
        const sm = new EPI2ME.SessionManager(1, null, []);
        assert.fail(`unexpected success`);
      } catch (e) {
        assert.ok(String(e).match(/must specify children to session/), String(e));
      }
    });

    it('should construct', () => {
      try {
        const sm = new EPI2ME.SessionManager(1, null, [{}]);
        assert.ok(`constructed`);
      } catch (e) {
        assert.fail(`unexpected failure`);
      }
    });
  });
});
