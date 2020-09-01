exports.command = 'volumes <command>'
exports.desc = 'Manage volumes'
exports.builder = function (yargs) {
  return yargs.commandDir('volumes')
}
exports.handler = function (argv) {}
