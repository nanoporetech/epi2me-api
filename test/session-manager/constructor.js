import assert from 'assert';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';
import { NoopLogger } from '../../src/Logger';

describe('session-manager', () => {
  describe('constructor', () => {
    it('should require at least one child', () => {
      try {
        new EPI2ME.SessionManager(1, null, [], { log: NoopLogger }); // eslint-disable-line
        assert.fail(`unexpected success`);
      } catch (e) {
        assert.ok(String(e).match(/must specify children to session/), String(e));
      }
    });

    it('should construct', () => {
      try {
        new EPI2ME.SessionManager(1, null, [{}], { log: NoopLogger }); // eslint-disable-line
        assert.ok(`constructed`);
      } catch (e) {
        assert.fail(`unexpected failure`);
      }
    });
  });
});
