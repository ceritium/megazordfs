const Nedb = require('nedb')
const path = require('path')
const os = require('os')

const dbPath = path.join(os.homedir(), '.megazord')
const dbVolumesPath = path.join(dbPath, 'volumes')
const dbEntriesPath = path.join(dbPath, 'entries')

const dbVolumes = new Nedb({ filename: dbVolumesPath, autoload: true })
const dbEntries = new Nedb({ filename: dbEntriesPath, autoload: true })

module.exports = { dbVolumes, dbEntries }
