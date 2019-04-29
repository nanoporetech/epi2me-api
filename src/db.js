import sqlite from 'sqlite';
import { mkdirp } from 'fs-extra';
import path from 'path';

export default class db {
  constructor(dbRoot) {
    this.db = mkdirp(dbRoot)
      .then(() => {
        return sqlite.open(path.join(dbRoot, 'db.sqlite'), { Promise }).then(async dbh => {
          try {
            await Promise.all([
              dbh
                .run("CREATE TABLE meta (version CHAR(12) DEFAULT '' NOT NULL, id_workflow_instance INTEGER UNSIGNED)")
                .then(() => {
                  dbh.run("INSERT INTO meta (version) VALUES('0.0.1')");
                }),
              dbh.run("CREATE TABLE uploads (filename CHAR(255) DEFAULT '' NOT NULL PRIMARY KEY)"),
              dbh.run("CREATE TABLE skips (filename CHAR(255) DEFAULT '' NOT NULL PRIMARY KEY)"),
            ]);

            return Promise.resolve(dbh);
          } catch (e) {
            return Promise.reject(e);
          }
        });
      })
      .catch(e => {
        throw e;
      });
  }

  async uploadFile(filename) {
    const dbh = await this.db;
    return dbh.run('INSERT INTO uploads VALUES(?)', filename);
  }

  async skipFile(filename) {
    const dbh = await this.db;
    return dbh.run('INSERT INTO skips VALUES(?)', filename);
  }

  async seenUpload(filename) {
    const dbh = await this.db;
    return dbh.get('SELECT * FROM uploads u, skips s WHERE u.filename=? OR s.filename=? LIMIT 1', filename, filename);
  }
}
