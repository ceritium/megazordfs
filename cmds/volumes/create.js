const dbVolumes = require('../../lib/db.js').dbVolumes

exports.command = 'create <name> [blocks...]'
exports.desc = 'Create a volume named <name>'
exports.builder = {}
exports.handler = function (argv) {
  console.log('creating volume %s', argv.name)
  console.log(argv.blocks)
  const volume = {
    _id: argv.name,
    blocks: argv.blocks
  }

  dbVolumes.insert(volume)
}
