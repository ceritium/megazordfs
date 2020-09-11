const Fuse = require('fuse-native')
const fs = require('fs')

const { dbEntries } = require('./db')
const { Replication } = require('./replication')
const { rootPath } = require('./helpers')

const ZERO = 0
const MODES = {
  DIR: 16877,
  FILE: 33188,
  LINK: 41453
}

const FDS = {}
let lastFd = 0

const handlers = function (volume) {
  const volumeName = volume._id
  const replication = Replication(volume)

  return {
    create: function (path, mode, cb) {
      const fds = {}
      replication.write(path, (fileBlockPath) => {
        fs.mkdirSync(rootPath(fileBlockPath), { recursive: true })
        fs.writeFileSync(fileBlockPath, '')
        const fdBlock = fs.openSync(fileBlockPath, 'w')
        fds[fileBlockPath] = fdBlock
      }, () => {
        dbEntries.update(
          { path: path, volume: volumeName },
          { $set: { mode: MODES.FILE, size: 0 } },
          { upsert: true, multi: false },
          () => {
            const newFd = lastFd++
            FDS[newFd] = fds
            cb(ZERO, newFd)
          }
        )
      })
    },

    write: function (path, fd, buffer, length, position, cb) {
      const fds = Object.values(FDS[fd])
      const cloned = Buffer.alloc(buffer.length)
      buffer.copy(cloned)
      Promise.all(fds.map((fdBlock) => {
        new Promise((resolve) => {
          fs.write(fdBlock, cloned, 0, length, position, () => {
            return resolve()
          })
        })
      })).then(() => {
        return cb(length)
      })
    },

    ftruncate: function (path, fd, size, cb) {
      const fds = Object.values(FDS[fd])
      Promise.all(fds.map((fdBlock) => {
        new Promise((resolve) => {
          fs.ftruncateSync(fdBlock, size)
        })
      })).then(() => {
        return cb(ZERO)
      })
    },

    unlink: function (path, cb) {
      replication.unlink(path, () => cb(ZERO))
    },

    read: function (path, fd, buffer, length, position, cb) {
      const fdBlock = Object.values(FDS[fd])[0]
      fs.read(fdBlock, buffer, 0, length, position, () => {
        cb(length)
      })
    },

    getattr: function (path, cb) {
      if (path === '/') return cb(null, stat({ mode: MODES.DIR, size: 0 }))

      dbEntries.findOne({ path: path, volume: volumeName }, (_err, entry) => {
        if (!entry) return cb(Fuse.ENOENT)

        if (entry.mode === MODES.FILE) {
          replication.read(path, (fileBlockPath) => {
            const stat = fs.statSync(fileBlockPath)
            cb(ZERO, stat)
          })
        } else {
          cb(ZERO, stat({ mode: entry.mode, size: entry.size }))
        }
      })
    },

    setxattr: (path, name, value, pos, flags, cb) => {
      cb(ZERO)
    },

    flush: (path, fd, cb) => {
      if (!FDS[fd]) return cb(ZERO)

      const fds = Object.values(FDS[fd])
      Promise.all(fds.map((fdBlock) => {
        new Promise((resolve) => {
          fs.fsync(fdBlock, (_err) => {
            resolve()
          })
        })
      })).then(() => {
        cb(ZERO)
      })
    },

    open: function (path, flags, cb) {
      const fds = {}
      replication.write(path, (fileBlockPath, blockPath) => {
        const fdBlock = fs.openSync(fileBlockPath, flags)
        fds[fileBlockPath] = fdBlock
      }, () => {
        const newFd = lastFd++
        FDS[newFd] = fds
        cb(ZERO, newFd)
      })
    },

    release: function (path, fd, cb) {
      if (FDS[fd]) {
        const fds = Object.values(FDS[fd])
        if (fds) {
          fds.forEach((fdBlock) => {
            fs.closeSync(fdBlock)
          })

          delete FDS[fd]
        }
      }
      cb(ZERO)
    },

    // DIRS
    mkdir: function (path, mode, cb) {
      const root = rootPath(path)
      const entry = {
        path: path,
        root: root,
        mode: MODES.DIR,
        size: 0,
        volume: volumeName
      }

      dbEntries.save(entry, { w: 1 }, () => cb(ZERO))
    },

    readdir: function (path, cb) {
      dbEntries.find({ root: path, volume: volumeName })
        .toArray((_err, entries) => {
          let pattern = path
          if (path !== '/') {
            pattern = `${path}/`
          }

          const items = entries.map(x => x.path.replace(pattern, ''))
          cb(null, items)
        })
    },

    rmdir: function (path, cb) {
      dbEntries.count({ root: path, volume: volumeName }, (_err, count) => {
        if (count !== 0) return cb(Fuse.ENOTEMPTY)

        dbEntries.remove(
          { path: path, volume: volumeName },
          { multi: true },
          () => cb(ZERO))
      })
    },

    // OTHERS
    //
    // rename: function (src, dest, cb) {
    //   console.log('rename', src, dest)
    //
    //   replication.write(src, (srcBlockPath, blockPath) => {
    //     const destBlockPath = path.join(blockPath, dest)
    //     fs.renameSync(srcBlockPath, destBlockPath)
    //   })
    //
    //   const root = rootPath(dest)
    //   dbEntries.update({ path: src, volume: volumeName },
    //     { $set: { path: dest, root: root } }, {}, (err) => {
    //       if (err) console.log(err)
    //
    //       // dbEntries.update({ root: src, volume: volumeName },
    //       //   { $set: { path: dest, root: src } }, {}, (err) => {
    //       //     if (err) console.log(err)
    //
    //       return cb(ZERO)
    //     })
    // },

    statfs: (path, cb) => {
      // TODO: Implement when write to real devices
      cb(ZERO, {
        bsize: 1000000,
        frsize: 1000000,
        blocks: 1000000,
        bfree: 1000000,
        bavail: 1000000,
        files: 1000000,
        ffree: 1000000,
        favail: 1000000,
        fsid: 1000000,
        flag: 1000000,
        namemax: 1000000
      })
    }
  }
}

const stat = function (st) {
  return {
    mtime: st.mtime || new Date(),
    atime: st.atime || new Date(),
    ctime: st.ctime || new Date(),
    size: st.size !== undefined ? st.size : 0,
    mode: st.mode || 33188,
    uid: process.getuid(),
    gid: process.getgid()
  }
}

module.exports = { handlers }
