import assert from 'assert';
import sinon from 'sinon';
import fs from 'fs-extra';
import tmp from 'tmp';
import path from 'path';
import Profile from '../../src/profile';

describe('epi2me.profile', () => {
  let tmpProfile;
  beforeEach(() => {
    tmpProfile = path.join(tmp.dirSync().name, '.epi2me.json');
    sinon.stub(Profile, 'profilePath').returns(tmpProfile);
  });

  afterEach(() => {
    Profile.profilePath.restore();
  });

  it('should yield no profiles', async () => {
    const p = new Profile();
    assert.deepEqual(p.profiles(), {}, 'no file');
  });

  it('should yield no profiles', async () => {
    fs.writeJSONSync(tmpProfile, {});
    const p = new Profile();
    assert.deepEqual(p.profiles(), {}, 'empty file');
  });

  it('should yield no profiles', async () => {
    fs.writeJSONSync(tmpProfile, {
      profiles: {},
    });
    const p = new Profile();
    assert.deepEqual(p.profiles(), {}, 'empty profiles');
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
    assert.deepEqual(p.profiles(), ['bob@bob-machine'], 'one profile');
  });
});
