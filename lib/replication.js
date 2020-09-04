const path = require('path')
const fs = require('fs')

const { dbEntries } = require('./db')
const { rootPath } = require('./helpers')

const cbBlocks = (blocks, filePath, cb) => {
  blocks.forEach((blockPath) => {
    const fileBlockPath = path.join(blockPath, filePath)
    cb(fileBlockPath, blockPath)
  })
}

const Replication = (volume) => {
  const volumeName = volume._id
  return {
    unlink: (filePath, cbResult) => {
      // TODO: Delete empty directories
      dbEntries.findOne({ path: filePath, volume: volumeName }, (_err, entry) => {
        dbEntries.remove(
          { path: filePath, volume: volumeName }, { multi: true },
          () => {
            cbBlocks(entry.blocks, filePath, fs.unlinkSync)
            cbResult()
          })
      })
    },
    write: (filePath, cbWrite, cbResult) => {
      dbEntries.findOne({ path: filePath, volume: volumeName }, (_err, entry) => {
        const blocks = (entry && entry.blocks) ? entry.blocks : volume.blocks

        cbBlocks(blocks, filePath, cbWrite)

        const fileBlockPath = path.join(blocks[0], filePath)
        const stat = fs.statSync(fileBlockPath)
        const root = rootPath(filePath)

        dbEntries.update(
          { path: filePath, volume: volumeName },
          { $set: { root: root, blocks: blocks, size: stat.size } },
          { upsert: true, multi: false },
          cbResult
        )
      })
    },

    read: (filePath, cb) => {
      dbEntries.findOne({ path: filePath, volume: volume._id }, (_err, entry) => {
        if (entry) {
          const fileBlockPath = path.join(entry.blocks[0], filePath)
          cb(fileBlockPath)
        }
      })
    }
  }
}

module.exports = { Replication }
