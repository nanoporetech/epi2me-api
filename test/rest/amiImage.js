import sinon from 'sinon';
import assert from 'assert';
import utils from '../../src/utils';
import REST from '../../src/rest';

describe('rest.amiImage', () => {
  let client;

  beforeEach(() => {
    client = new REST({
      url: 'http://metrichor.local:8080',
      apikey: 'FooBar02',
    });
  });

  it('should not support local mode', async () => {
    client.options.local = true;
    const data = {
      aws_id: 'ami-12345',
      name: 'mon ami',
      description: 'foo bar baz',
      id_region: 1,
      is_active: 1,
    };
    try {
      await client.amiImage('ami-12345', data);
      assert.fail(`unexpected success`);
    } catch (err) {
      assert.ok(String(err).match(/unsupported in local mode/));
    }
  });

  it('should update an amiImage', async () => {
    const data = {
      aws_id: 'ami-12345',
      name: 'mon ami',
      description: 'foo bar baz',
      id_region: 1,
      is_active: 1,
    };
    const stub = sinon.stub(utils, 'put').resolves({
      status: 'success',
    });

    let obj;
    try {
      obj = await client.amiImage('ami-12345', data);
    } catch (err) {
      assert.fail(err);
    } finally {
      stub.restore();
    }
    assert.deepEqual(obj, {
      status: 'success',
    });
  });

  it('should create an amiImage', async () => {
    const data = {
      aws_id: 'ami-12345',
      name: 'mon ami',
      description: 'foo bar baz',
      id_region: 1,
      is_active: 1,
    };
    const stub = sinon.stub(utils, 'post').resolves({
      status: 'success',
    });

    try {
      const obj = await client.amiImage(data);
      assert.deepEqual(obj, {
        status: 'success',
      });
    } catch (e) {
      assert.fail(e);
    } finally {
      stub.restore();
    }
  });

  it('should read an amiImage', async () => {
    const data = {
      aws_id: 'ami-12345',
      name: 'mon ami',
      description: 'foo bar baz',
      id_region: 1,
      is_active: 1,
    };
    const stub = sinon.stub(client, 'read').resolves(data);

    try {
      const obj = await client.amiImage('ami-12345');
      assert.deepEqual(obj, data);
    } catch (e) {
      assert.fail(e);
    } finally {
      stub.restore();
    }
  });
});
