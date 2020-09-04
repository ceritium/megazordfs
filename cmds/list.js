const dbVolumes = require('../lib/db').dbVolumes

exports.command = 'list'
exports.aliases = ['ls']
exports.desc = 'List existing volumes'
exports.builder = {}
exports.handler = function (argv) {
  dbVolumes.find({}, (_err, volumes) => {
    volumes.toArray((_err, volumes) => {
      console.log(volumes)
    })
  })
}
