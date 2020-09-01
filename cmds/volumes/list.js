const dbVolumes = require('../../lib/db.js').dbVolumes

exports.command = 'list'
exports.aliases = ['ls']
exports.desc = 'List existing volumes'
exports.builder = {}
exports.handler = function (argv) {
  dbVolumes.find({}, (err, volumes) => {
    if (err) console.log(err)
    console.log(volumes)
  })
}
