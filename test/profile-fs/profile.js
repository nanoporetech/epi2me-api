import assert from 'assert';
import sinon from 'sinon';
import fs from 'fs-extra';
import tmp from 'tmp';
import path from 'path';
import Profile from '../../src/profile-fs';

describe('epi2me.profile-fs', () => {
  let tmpProfile;
  beforeEach(() => {
    tmpProfile = path.join(tmp.dirSync().name, '.epi2me.json');
    sinon.stub(Profile, 'profilePath').returns(tmpProfile);
  });

  afterEach(() => {
    Profile.profilePath.restore();
  });

  it('should yield no profile', async () => {
    const p = new Profile();
    try {
      p.profile('bob@bob-machine');
      assert.fail('unexpected success');
    } catch (e) {
      assert.ok(String(e).match(/Cannot read property/), 'no file');
    }
  });

  it('should yield no profile', async () => {
    fs.writeJSONSync(tmpProfile, {});
    const p = new Profile();
    assert.deepEqual(
      p.profile('bob@bob-machine'), {
        endpoint: 'https://epi2me.nanoporetech.com',
      },
      'empty file',
    );
  });

  it('should yield no profile', async () => {
    fs.writeJSONSync(tmpProfile, {
      profiles: {},
    });
    const p = new Profile();
    assert.deepEqual(
      p.profile('bob@bob-machine'), {
        endpoint: 'https://epi2me.nanoporetech.com',
      },
      'empty profile',
    );
  });

  it('should yield one profile', async () => {
    fs.writeJSONSync(tmpProfile, {
      profiles: {
        'bob@bob-machine': {
          apikey: 'foo',
          apisecret: 'bar',
        },
      },
    });
    const p = new Profile();
    assert.deepEqual(
      p.profile('bob@bob-machine'), {
        apikey: 'foo',
        apisecret: 'bar',
        endpoint: 'https://epi2me.nanoporetech.com',
      },
      'one profile',
    );
  });

  // Insertions

  it('should set new profile', async () => {
    fs.remove(tmpProfile);
    const p = new Profile();
    p.profile('bob@bob-machine', {
      apikey: 'new',
    });

    assert.deepEqual(p.profile('bob@bob-machine'), {
      apikey: 'new',
      endpoint: 'https://epi2me.nanoporetech.com',
    });

    assert.deepEqual(
      fs.readJSONSync(tmpProfile), {
        profiles: {
          'bob@bob-machine': {
            apikey: 'new',
          },
        },
      },
      'file content',
    );
  });

  it('should set new profile', async () => {
    fs.writeJSONSync(tmpProfile, {});
    const p = new Profile();
    p.profile('bob@bob-machine', {
      apikey: 'new',
    });

    assert.deepEqual(
      p.profile('bob@bob-machine'), {
        apikey: 'new',
        endpoint: 'https://epi2me.nanoporetech.com',
      },
      'empty file',
    );

    assert.deepEqual(
      fs.readJSONSync(tmpProfile), {
        profiles: {
          'bob@bob-machine': {
            apikey: 'new',
          },
        },
      },
      'file content',
    );
  });

  it('should set new profile', async () => {
    fs.writeJSONSync(tmpProfile, {
      profiles: {},
    });
    const p = new Profile();
    p.profile('bob@bob-machine', {
      apikey: 'new',
    });

    assert.deepEqual(
      p.profile('bob@bob-machine'), {
        apikey: 'new',
        endpoint: 'https://epi2me.nanoporetech.com',
      },
      'empty profile',
    );

    assert.deepEqual(
      fs.readJSONSync(tmpProfile), {
        profiles: {
          'bob@bob-machine': {
            apikey: 'new',
          },
        },
      },
      'file content',
    );
  });

  it('should update profile', async () => {
    fs.writeJSONSync(tmpProfile, {
      profiles: {
        'bob@bob-machine': {
          apikey: 'foo',
          apisecret: 'bar',
        },
      },
    });
    const p = new Profile();
    p.profile('bob@bob-machine', {
      apikey: 'new',
    });
    assert.deepEqual(
      p.profile('bob@bob-machine'), {
        apikey: 'new',
        apisecret: 'bar',
        endpoint: 'https://epi2me.nanoporetech.com',
      },
      'one profile',
    );
    assert.deepEqual(
      fs.readJSONSync(tmpProfile), {
        profiles: {
          'bob@bob-machine': {
            apikey: 'new',
            apisecret: 'bar',
          },
        },
      },
      'file content',
    );
  });

  it('should update profile without losing labs_token', async () => {
    fs.writeJSONSync(tmpProfile, {
      labs_token: 'foo-bar-baz',
      profiles: {
        'bob@bob-machine': {
          apikey: 'foo',
          apisecret: 'bar',
        },
      },
    });
    const p = new Profile();
    p.profile('deunan@bob-machine', {
      apikey: 'new',
      apisecret: 'newer',
    });
    assert.deepEqual(p.profiles(), ['bob@bob-machine', 'deunan@bob-machine'], 'two profiles');
    assert.deepEqual(
      fs.readJSONSync(tmpProfile), {
        labs_token: 'foo-bar-baz',
        profiles: {
          'bob@bob-machine': {
            apikey: 'foo',
            apisecret: 'bar',
          },
          'deunan@bob-machine': {
            apikey: 'new',
            apisecret: 'newer',
          },
        },
      },
      'file content',
    );
  });
});
