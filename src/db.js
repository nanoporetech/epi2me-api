import sqlite from 'sqlite';
import { mkdirp } from 'fs-extra';
import { remove } from 'lodash';
import path from 'path';

export default class db {
  constructor(dbRoot, idWorkflowInstance) {
    console.log(`setting up ${dbRoot}/db.sqlite for ${idWorkflowInstance}`); // eslint-disable-line no-console

    this.db = mkdirp(dbRoot)
      .then(() => {
        console.log(`opening ${dbRoot}/db.sqlite`); // eslint-disable-line no-console
        return sqlite.open(path.join(dbRoot, 'db.sqlite'), { Promise }).then(async dbh => {
          console.log(`opened ${dbRoot}/db.sqlite`); // eslint-disable-line no-console
          try {
            await Promise.all([
              dbh
                .run(
                  "CREATE TABLE IF NOT EXISTS meta (version CHAR(12) DEFAULT '' NOT NULL, id_workflow_instance INTEGER UNSIGNED)",
                )
                .then(() => {
                  dbh.run("INSERT INTO meta (version, id_workflow_instance) VALUES('0.0.1', ?)", idWorkflowInstance);
                }),
              dbh.run("CREATE TABLE IF NOT EXISTS uploads (filename CHAR(255) DEFAULT '' NOT NULL PRIMARY KEY)"),
              dbh.run("CREATE TABLE IF NOT EXISTS skips (filename CHAR(255) DEFAULT '' NOT NULL PRIMARY KEY)"),
            ]);
            console.log(`done schema ${dbRoot}/db.sqlite`); // eslint-disable-line no-console

            return Promise.resolve(dbh);
          } catch (e) {
            console.log(e); // eslint-disable-line no-console
            return Promise.reject(e);
          }
        });
      })
      .catch(e => {
        console.log(e); // eslint-disable-line no-console
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
    console.log(`checking seenUpload ${filename}`); // eslint-disable-line no-console
    const dbh = await this.db;
    return Promise.all([
      dbh.get('SELECT * FROM uploads u WHERE u.filename=? LIMIT 1', filename),
      dbh.get('SELECT * FROM skips s WHERE s.filename=? LIMIT 1', filename),
    ]).then(results => {
      console.log(`checked seenUpload ${filename}`); // eslint-disable-line no-console
      return remove(results, undefined).length;
    });
  }
}
