import sqlite from 'sqlite';
import { mkdirp } from 'fs-extra';
import path from 'path';

export default class db {
  constructor(dbRoot) {
    this.db = mkdirp(dbRoot).then(() => {
      return sqlite.open(path.join(dbRoot, 'db.sqlite'), { Promise }).then(dbh => dbh.migrate()); // { force: 'last' }));
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
