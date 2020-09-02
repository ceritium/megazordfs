const path = require('path')
const os = require('os')
const Db = require('tingodb')().Db

const dbPath = path.join(os.homedir(), '.megazordfs')
const db = new Db(dbPath, {})

const dbVolumes = db.collection('volumes')
const dbEntries = db.collection('entries')

module.exports = { dbVolumes, dbEntries }
