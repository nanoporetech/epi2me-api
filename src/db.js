import fs from 'fs-extra';
import { merge, remove } from 'lodash';
import path from 'path';
import sqlite from 'sqlite';
import pkg from '../package.json';

export default class db {
  constructor(dbRoot, optionsIn, log) {
    const options = merge({}, optionsIn);
    this.options = options;
    this.log = log;

    const { idWorkflowInstance } = options;

    log.debug(`setting up ${dbRoot}/db.sqlite for ${idWorkflowInstance}`);

    this.db = fs
      .mkdirp(dbRoot)
      .then(() => {
        this.log.debug(`opening ${dbRoot}/db.sqlite`);
        return sqlite
          .open((dbRoot === ':memory:' && dbRoot) || path.join(dbRoot, 'db.sqlite'), {
            Promise,
          })
          .then(async dbh => {
            this.log.debug(`opened ${dbRoot}/db.sqlite`); // eslint-disable-line no-console
            try {
              await Promise.all([
                dbh
                  .run(
                    "CREATE TABLE IF NOT EXISTS meta (version CHAR(12) DEFAULT '' NOT NULL, idWorkflowInstance INTEGER UNSIGNED, inputFolder CHAR(255) default '')",
                  )
                  .then(() => {
                    dbh.run(
                      'INSERT INTO meta (version, idWorkflowInstance, inputFolder) VALUES(?, ?, ?)',
                      pkg.version,
                      idWorkflowInstance,
                      options.inputFolder,
                    );
                  }),
                dbh.run("CREATE TABLE IF NOT EXISTS uploads (filename CHAR(255) DEFAULT '' NOT NULL PRIMARY KEY)"),
                dbh.run("CREATE TABLE IF NOT EXISTS skips (filename CHAR(255) DEFAULT '' NOT NULL PRIMARY KEY)"),
                dbh.run(
                  "CREATE TABLE IF NOT EXISTS splits (filename CHAR(255) DEFAULT '' NOT NULL PRIMARY KEY, parent CHAR(255) DEFAULT '' NOT NULL, start DATETIME NOT NULL, end DATETIME)",
                ),
              ]);

              return Promise.resolve(dbh);
            } catch (e) {
              this.log.error(e);
              return Promise.reject(e);
            }
          });
      })
      .catch(e => {
        this.log.error(e);
        throw e;
      });
  }

  async uploadFile(filename) {
    const dbh = await this.db;
    const relative = filename.replace(new RegExp(`^${this.options.inputFolder}`), '');
    return dbh.run('INSERT INTO uploads VALUES(?)', relative);
  }

  async skipFile(filename) {
    const dbh = await this.db;
    const relative = filename.replace(new RegExp(`^${this.options.inputFolder}`), '');
    return dbh.run('INSERT INTO skips VALUES(?)', relative);
  }

  async splitFile(child, parent) {
    const dbh = await this.db;
    const relativeChild = child.replace(new RegExp(`^${this.options.inputFolder}`), '');
    const relativeParent = parent.replace(new RegExp(`^${this.options.inputFolder}`), '');
    return dbh.run('INSERT INTO splits VALUES(?, ?, CURRENT_TIMESTAMP, NULL)', relativeChild, relativeParent);
  }

  async splitDone(child) {
    const dbh = await this.db;
    const relativeChild = child.replace(new RegExp(`^${this.options.inputFolder}`), '');
    return dbh.run('UPDATE splits SET end=CURRENT_TIMESTAMP WHERE filename=?', relativeChild);
  }

  async splitClean() {
    const dbh = await this.db;
    return dbh.all('SELECT filename FROM splits WHERE end IS NULL').then(toClean => {
      if (!toClean) {
        this.log.info('no split files to clean');
        return Promise.resolve();
      }

      this.log.info(`cleaning ${toClean.length} split files`);
      this.log.debug(
        `going to clean: ${toClean
          .map(o => {
            return o.filename;
          })
          .join(' ')}`,
      );
      const cleanupPromises = toClean.map(cleanObj => {
        return fs.unlink(path.join(this.options.inputFolder, cleanObj.filename)).catch(() => {}); // should this module really be responsible for this cleanup operation?
      });
      return Promise.all(cleanupPromises);
    });
  }

  async seenUpload(filename) {
    //    console.log(`checking seenUpload ${filename}`); // eslint-disable-line no-console
    const dbh = await this.db;
    const relative = filename.replace(new RegExp(`^${this.options.inputFolder}`), '');
    return Promise.all([
      dbh.get('SELECT * FROM uploads u WHERE u.filename=? LIMIT 1', relative),
      dbh.get('SELECT * FROM skips s WHERE s.filename=? LIMIT 1', relative),
    ]).then(results => {
      //      console.log(`checked seenUpload ${filename}`); // eslint-disable-line no-console
      return remove(results, undefined).length;
    });
  }
}
