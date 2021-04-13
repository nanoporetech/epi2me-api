import fs from 'fs-extra';
import { remove } from 'lodash';
import path from 'path';
import { open } from 'sqlite';
import type { Database } from 'sqlite';
import { Database as DatabaseDriver } from 'sqlite3';
import pkg from '../package.json';
import { utilsFS as utils } from './utils-fs';
import type { Logger } from './Logger';

export interface DBOptions {
  idWorkflowInstance: string;
  inputFolders: string[];
}
export default class db {
  log: Logger;
  readonly db: Promise<Database>;

  constructor(dbRoot: string, options: DBOptions, log: Logger) {
    this.log = log;

    const { idWorkflowInstance, inputFolders } = options;

    log.debug(`setting up ${dbRoot}/db.sqlite for ${idWorkflowInstance}`);

    this.db = fs
      .mkdirp(dbRoot)
      .then(() => {
        this.log.debug(`opening ${dbRoot}/db.sqlite`);
        return open({
          filename: path.join(dbRoot, 'db.sqlite'),
          driver: DatabaseDriver,
        }).then(async (dbh) => {
          this.log.debug(`opened ${dbRoot}/db.sqlite`); // eslint-disable-line no-console
          await dbh.migrate({ migrationsPath: path.join(__dirname, 'migrations') });
          const placeholders = inputFolders.map(() => '(?)').join(',');
          try {
            await Promise.all([
              dbh.run('INSERT INTO meta (version, idWorkflowInstance) VALUES(?, ?)', pkg.version, idWorkflowInstance),
              dbh.run(`INSERT INTO folders (folder_path) VALUES ${placeholders}`, inputFolders),
            ]);

            return dbh;
          } catch (e) {
            this.log.error(e);
            return Promise.reject(e);
          }
        });
      })
      .catch((e) => {
        this.log.error(e);
        throw e;
      });
  }

  async uploadFile(filename: string): Promise<void> {
    const dbh = await this.db;
    const [dir, relative] = utils.stripFile(filename);
    await dbh.run('INSERT OR IGNORE INTO folders (folder_path) VALUES (?)', dir);
    await dbh.run(
      'INSERT INTO uploads(filename, path_id) VALUES(?, (SELECT folder_id FROM folders WHERE folder_path = ?))',
      relative,
      dir,
    );
  }

  async skipFile(filename: string): Promise<void> {
    const dbh = await this.db;
    const [dir, relative] = utils.stripFile(filename);
    await dbh.run('INSERT OR IGNORE INTO folders (folder_path) VALUES (?)', dir);
    await dbh.run(
      'INSERT INTO skips(filename, path_id) VALUES(?, (SELECT folder_id FROM folders WHERE folder_path = ?))',
      relative,
      dir,
    );
  }

  async splitFile(child: string, parent: string): Promise<void> {
    const dbh = await this.db;
    const [dirChild, relativeChild] = utils.stripFile(child);
    const relativeParent = utils.stripFile(parent)[1];
    await dbh.run('INSERT OR IGNORE INTO folders (folder_path) VALUES (?)', dirChild);
    await dbh.run(
      'INSERT INTO splits(filename, parent, child_path_id, start, end) VALUES(?, ?, (SELECT folder_id FROM folders WHERE folder_path = ?), CURRENT_TIMESTAMP, NULL)',
      relativeChild,
      relativeParent,
      dirChild,
    );
  }

  async splitDone(child: string): Promise<void> {
    const dbh = await this.db;
    const [dirChild, relativeChild] = utils.stripFile(child);
    await dbh.run(
      'UPDATE splits SET end=CURRENT_TIMESTAMP WHERE filename=? AND child_path_id=(SELECT folder_id FROM folders WHERE folder_path=?)',
      relativeChild,
      dirChild,
    );
  }

  async splitClean(): Promise<void> {
    const dbh = await this.db;
    const toClean = await dbh.all(
      'SELECT splits.filename, folders.folder_path FROM splits INNER JOIN folders ON folders.folder_id = splits.child_path_id WHERE end IS NULL',
    );

    if (!toClean) {
      this.log.info('no split files to clean');
      return;
    }

    this.log.info(`cleaning ${toClean.length} split files`);
    this.log.debug(
      `going to clean: ${toClean
        .map((o) => {
          return o.filename;
        })
        .join(' ')}`,
    );
    const cleanupPromises = toClean.map((cleanObj) => {
      return fs.unlink(path.join(cleanObj.folder_path, cleanObj.filename)).catch(() => {
        console.warn(`Failed to cleanup ${path.join(cleanObj.folder_path, cleanObj.filename)}`);
      }); // should this module really be responsible for this cleanup operation?
    });
    await Promise.all(cleanupPromises);
  }

  async seenUpload(filename: string): Promise<boolean> {
    //    console.log(`checking seenUpload ${filename}`); // eslint-disable-line no-console
    const dbh = await this.db;
    const [dir, relative] = utils.stripFile(filename);
    return Promise.all([
      dbh.get(
        'SELECT * FROM uploads u INNER JOIN folders ON folders.folder_id = u.path_id WHERE u.filename=? AND folders.folder_path=? LIMIT 1',
        [relative, dir],
      ),
      dbh.get(
        'SELECT * FROM skips s INNER JOIN folders ON folders.folder_id = s.path_id WHERE s.filename=? AND folders.folder_path=? LIMIT 1',
        relative,
        dir,
      ),
    ]).then((results) => {
      // console.log(`checked seenUpload ${filename} \n ${results}`); // eslint-disable-line no-console
      return remove(results, undefined).length > 0;
    });
  }
}
