import assert from 'assert';
import EPI2ME from '../../src/epi2me-fs';

describe('session-manager', () => {
  describe('constructor', () => {
    it('should require instance id', () => {
      try {
        new EPI2ME.SessionManager(); // eslint-disable-line
        assert.fail(`unexpected success`);
      } catch (e) {
        assert.ok(String(e).match(/must specify id_workflow_instance/), String(e));
      }
    });

    it('should require children to update', () => {
      try {
        new EPI2ME.SessionManager(1); // eslint-disable-line
        assert.fail(`unexpected success`);
      } catch (e) {
        assert.ok(String(e).match(/must specify children to session/), String(e));
      }
    });

    it('should require at least one child', () => {
      try {
        new EPI2ME.SessionManager(1, null, []); // eslint-disable-line
        assert.fail(`unexpected success`);
      } catch (e) {
        assert.ok(String(e).match(/must specify children to session/), String(e));
      }
    });

    it('should construct', () => {
      try {
        new EPI2ME.SessionManager(1, null, [{}]); // eslint-disable-line
        assert.ok(`constructed`);
      } catch (e) {
        assert.fail(`unexpected failure`);
      }
    });
  });
});
