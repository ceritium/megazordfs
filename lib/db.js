const fs = require('fs')
const path = require('path')
const os = require('os')
const Db = require('tingodb')().Db

const dbPath = path.join(os.homedir(), '.megazordfs')
fs.mkdirSync(dbPath, { recursive: true })
const db = new Db(dbPath, {})

const dbVolumes = db.collection('volumes')
const dbEntries = db.collection('entries')
dbEntries.ensureIndex(
  { path: 1, root: 1, volume: 1 },
  { unique: true, background: true, w: 1 },
  (err, indexName) => {
    if (err) console.log(indexName, err)
    console.log('Index done', indexName)
  }
)

module.exports = { dbVolumes, dbEntries }
