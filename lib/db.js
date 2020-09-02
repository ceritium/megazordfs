const fs = require('fs')
const path = require('path')
const os = require('os')
const Db = require('tingodb')().Db

const dbPath = path.join(os.homedir(), '.megazordfs')
fs.mkdirSync(dbPath, { recursive: true })
const db = new Db(dbPath, {})

const dbVolumes = db.collection('volumes')
const dbEntries = db.collection('entries')

module.exports = { dbVolumes, dbEntries }
