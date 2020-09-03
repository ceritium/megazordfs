const path = require('path')

const Replication = (volume) => {
  return {
    write: (filePath, cb) => {
      volume.blocks.forEach((blockPath) => {
        const fileBlockPath = path.join(blockPath, filePath)
        try {
          return cb(fileBlockPath, blockPath)
        } catch (e) {
          console.log(e)
        }
      })
    },

    read: (filePath, cb) => {
      const fileBlockPath = path.join(volume.blocks[0], filePath)
      try {
        return cb(fileBlockPath)
      } catch (e) {
        console.log(e)
      }
    }
  }
}

module.exports = { Replication }
