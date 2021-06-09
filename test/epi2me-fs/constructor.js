import assert from 'assert';
import sinon from 'sinon';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';

describe('epi2me', () => {
  describe('constructor', () => {
    it('should create an epi2me object with defaults and allow overwriting', () => {
      let client;
      assert.doesNotThrow(
        () => {
          client = new EPI2ME();
        },
        Error,
        'client obtained',
      );

      assert.equal(client.url(), 'https://epi2me.nanoporetech.com', 'default url');
      assert.equal(client.apikey(), null, 'default apikey');
    });

    it('should create an epi2me object using the parsed options string', () => {
      let client;
      assert.doesNotThrow(
        () => {
          client = new EPI2ME(
            JSON.stringify({
              url: 'test_url',
            }),
          );
        },
        Error,
        'client obtained',
      );
      assert.equal(client.url(), 'test_url', 'custom url');
    });

    it('should create an epi2me object with log functions', () => {
      let client;

      const customLogging = {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        critical: () => {},
      };

      // Default
      assert.doesNotThrow(
        () => {
          client = new EPI2ME();
        },
        Error,
        'client obtained',
      );

      // Custom logging

      assert.doesNotThrow(
        () => {
          client = new EPI2ME({
            log: customLogging,
          });
        },
        Error,
        'client obtained',
      );
      assert.deepEqual(client.log, customLogging, 'custom logging');

      // Validating custom logging
      assert.throws(
        () => {
          client = new EPI2ME({
            log: {},
          });
        },
        Error,
        'expected log object to have "error", "info" and "warn" methods',
      );
    });

    it('should create an epi2me with opts', () => {
      let client;
      assert.doesNotThrow(
        () => {
          client = new EPI2ME({
            url: 'https://epi2me.local:8000',
            apikey: 'FooBar02',
          });
        },
        Error,
        'client obtained',
      );
      assert.equal(client.url(), 'https://epi2me.local:8000', 'url built from constructor');
      assert.equal(client.apikey(), 'FooBar02', 'apikey built from constructor');
    });
  });
});
