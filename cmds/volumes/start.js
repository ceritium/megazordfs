const Fuse = require('fuse-native')

const { dbVolumes } = require('../../lib/db.js')
const { handlers } = require('../../lib/handlers.js')

exports.command = 'start <volume> <mountPath>'
exports.aliases = []
exports.desc = 'Start a volume'
exports.builder = {}
exports.handler = function (argv) {
  start(argv.volume, argv.mountPath)
}

const fuseOpts = { force: true, mkdir: true, displayFolder: true, allowOther: true, debug: false }

const start = function (volumeName, mountPath) {
  dbVolumes.findOne({ _id: volumeName }, (err, volume) => {
    if (err) console.log(err)

    if (volume) {
      console.log(volume)
      const fuse = new Fuse(mountPath, handlers(volumeName), fuseOpts)
      fuse.mount()

      process.once('SIGINT', function () {
        setTimeout(process.kill.bind(process, process.pid), 2000).unref()
        fuse.unmount(err => {
          if (err) {
            console.log('filesystem at ' + fuse.mnt + ' not unmounted', err)
          } else {
            console.log('filesystem at ' + fuse.mnt + ' unmounted')
          }
        })
      })
    }
  })
}
