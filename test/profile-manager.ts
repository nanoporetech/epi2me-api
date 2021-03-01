import { ProfileManager } from '../src/ProfileManager';
import { instantiateProfileManager } from '../src/instantiateProfileManager';
import assert from 'assert';
import path from 'path';
import tmp from 'tmp';
import { promises as fs } from 'fs';

async function deleteFile(filepath: string) {
  try {
    await fs.unlink(filepath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
}

async function exists(filepath: string) {
  try {
    await fs.stat(filepath);
    return true;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
  return false;
}

function delay(duration: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

describe('ProfileManager', () => {
  it('accepts a dictionary of profile', () => {
    const managerA = new ProfileManager({}, 'example.net');
    const managerB = new ProfileManager(
      {
        example_a: { apikey: 'its a key', apisecret: 'its a secret' },
      },
      'other.net',
    );
    assert.deepStrictEqual([...managerA.profileNames()], []);
    assert.deepStrictEqual([...managerB.profileNames()], ['example_a']);
  });
  it('returns a profile when queried', () => {
    const manager = new ProfileManager(
      {
        example_a: { apikey: 'its a key', apisecret: 'its a secret' },
      },
      'other.net',
    );
    assert.deepStrictEqual(manager.get('example_a'), {
      apikey: 'its a key',
      apisecret: 'its a secret',
      endpoint: 'other.net',
    });
    assert.strictEqual(manager.get('non existent'), null);
  });
  it('prefers a saved endpoint over default', () => {
    const manager = new ProfileManager(
      {
        example_a: { apikey: 'its a key', apisecret: 'its a secret', endpoint: 'a true.net' },
      },
      'other.net',
    );
    assert.deepStrictEqual(manager.get('example_a'), {
      apikey: 'its a key',
      apisecret: 'its a secret',
      endpoint: 'a true.net',
    });
  });
  it('can create new entries', () => {
    const manager = new ProfileManager({}, 'endpoint.net');
    assert.strictEqual([...manager.profileNames()].length, 0);
    manager.create('first', { apikey: 'first' });
    assert.strictEqual([...manager.profileNames()].length, 1);
    manager.create('second', { apikey: 'second' });
    assert.strictEqual([...manager.profileNames()].length, 2);
    assert.deepStrictEqual(manager.get('first'), { apikey: 'first', endpoint: 'endpoint.net' });
  });
  it('prevents creating a duplicate entry', () => {
    const manager = new ProfileManager(
      {
        first: { apikey: 'first' },
      },
      'endpoint.net',
    );
    assert.throws(() => manager.create('first', {}));
  });
  it('allows updating properties', () => {
    const manager = new ProfileManager(
      {
        first: { apikey: 'first' },
        second: { apikey: 'second' },
      },
      'endpoint.net',
    );
    assert.deepStrictEqual(manager.get('first'), { apikey: 'first', endpoint: 'endpoint.net' });
    assert.deepStrictEqual(manager.get('second'), { apikey: 'second', endpoint: 'endpoint.net' });

    manager.update('first', { endpoint: 'special.net' });

    assert.deepStrictEqual(manager.get('first'), { apikey: 'first', endpoint: 'special.net' });
    assert.deepStrictEqual(manager.get('second'), { apikey: 'second', endpoint: 'endpoint.net' });
  });
  it('throws when trying to update non existent keys', () => {
    const manager = new ProfileManager({}, 'endpoint.net');

    assert.throws(() => manager.update('first', { apikey: 'new' }));
  });
  it('throws when trying to delete non existent keys', () => {
    const manager = new ProfileManager({}, 'endpoint.net');

    assert.throws(() => manager.delete('first'));
  });
  it('allow deleting a key', () => {
    const manager = new ProfileManager(
      {
        first: { apikey: 'first' },
        second: { apikey: 'second' },
      },
      'endpoint.net',
    );

    assert.deepStrictEqual(manager.get('first'), { apikey: 'first', endpoint: 'endpoint.net' });
    assert.deepStrictEqual(manager.get('second'), { apikey: 'second', endpoint: 'endpoint.net' });
    manager.delete('first');
    assert.strictEqual(manager.get('first'), null);
    assert.deepStrictEqual(manager.get('second'), { apikey: 'second', endpoint: 'endpoint.net' });
    manager.delete('second');
    assert.strictEqual(manager.get('first'), null);
    assert.strictEqual(manager.get('second'), null);
  });
  it('triggers an update when something changes', () => {
    let changeCounter = 0;
    const manager = new ProfileManager({}, 'endpoint.net');
    manager.profiles$.subscribe(() => {
      changeCounter += 1;
    });
    assert.strictEqual(changeCounter, 0);
    manager.create('1', {});
    assert.strictEqual(changeCounter, 1);
    manager.get('1');
    assert.strictEqual(changeCounter, 1);
    manager.profileNames();
    assert.strictEqual(changeCounter, 1);
    manager.update('1', { apisecret: 'secret thing' });
    assert.strictEqual(changeCounter, 2);
    manager.delete('1');
    assert.strictEqual(changeCounter, 3);
  });

  describe('from disc', () => {
    it('does not create a file if no profiles exist', async () => {
      const profilePath = path.join(tmp.dirSync().name, '.epi2me.json');
      // ensure no file at destination
      await deleteFile(profilePath);
      await instantiateProfileManager({ filepath: profilePath });
      // hopefully long enough...
      await delay(50);
      assert.strictEqual(await exists(profilePath), false);
    });

    it('does create a file if a profile is created', async () => {
      const profilePath = path.join(tmp.dirSync().name, '.epi2me.json');
      // ensure no file at destination
      await deleteFile(profilePath);
      const manager = await instantiateProfileManager({ filepath: profilePath });
      manager.create('bob', { apikey: 'bobskey' });
      // hopefully long enough...
      await delay(50);
      const contents = JSON.parse(await fs.readFile(profilePath, 'utf8'));
      assert.deepStrictEqual(contents, {
        profiles: {
          bob: {
            apikey: 'bobskey',
          },
        },
      });
    });

    it('empty file gives empty profile', async () => {
      const profilePath = path.join(tmp.dirSync().name, '.epi2me.json');

      const data = {
        profiles: {
          bob: {
            apikey: 'bobskey',
          },
        },
      };
      await fs.writeFile(profilePath, JSON.stringify(data));
      const manager = await instantiateProfileManager({ filepath: profilePath, defaultEndpoint: 'endpoint.net' });
      assert.strictEqual([...manager.profileNames()].length, 1);
      assert.deepStrictEqual(manager.get('bob'), { ...data.profiles.bob, endpoint: 'endpoint.net' });
    });

    it('default endpoint is read from file', async () => {
      const profilePath = path.join(tmp.dirSync().name, '.epi2me.json');

      const data = {
        endpoint: 'special.net',
        profiles: {
          bob: {
            apikey: 'bobskey',
          },
        },
      };
      await fs.writeFile(profilePath, JSON.stringify(data));
      const manager = await instantiateProfileManager({ filepath: profilePath, defaultEndpoint: 'endpoint.net' });
      assert.deepStrictEqual(manager.get('bob'), { ...data.profiles.bob, endpoint: 'special.net' });
      manager.create('alice', { apisecret: 'bobs secret' });
      await delay(50);
      assert.deepStrictEqual(JSON.parse(await fs.readFile(profilePath, 'utf8')), {
        endpoint: 'special.net',
        profiles: {
          bob: {
            apikey: 'bobskey',
          },
          alice: {
            apisecret: 'bobs secret',
          },
        },
      });
      manager.delete('bob');
      await delay(50);
      assert.deepStrictEqual(JSON.parse(await fs.readFile(profilePath, 'utf8')), {
        endpoint: 'special.net',
        profiles: {
          alice: {
            apisecret: 'bobs secret',
          },
        },
      });
    });
  });
});
