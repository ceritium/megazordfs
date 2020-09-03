const Fuse = require('fuse-native')
const fs = require('fs')

const { dbEntries } = require('./db')
const { Replication } = require('./replication')
const { rootPath } = require('./helpers')

const ZERO = 0

const handlers = function (volume) {
  const volumeName = volume._id
  const replication = Replication(volume)

  return {
    create: function (filePath, mode, cb) {
      console.log('create', filePath)

      replication.write(filePath, (fileBlockPath) => {
        fs.mkdirSync(rootPath(fileBlockPath), { recursive: true })
        fs.writeFileSync(fileBlockPath, null)
      }, () => {
        dbEntries.update(
          { path: filePath, volume: volumeName },
          { $set: { mode: mode, size: 0 } },
          { upsert: true, multi: false },
          () => cb(ZERO)
        )
      })
    },

    write: function (filePath, fd, buffer, length, position, cb) {
      console.log('write', filePath, fd, 'length', length, 'position', position)

      replication.write(filePath, (fileBlockPath) => {
        fs.mkdirSync(rootPath(fileBlockPath), { recursive: true })
        const fdBlock = fs.openSync(fileBlockPath, 'a')
        fs.writeSync(fdBlock, buffer, 0, length, position)
        fs.closeSync(fdBlock)
      }, () => cb(length))
    },

    ftruncate: function (filePath, fd, size, cb) {
      console.log('ftruncate', filePath, fd, size)

      replication.write(filePath, (fileBlockPath) => {
        const fdBlock = fs.openSync(fileBlockPath, 'r+')
        fs.ftruncateSync(fdBlock, size)
        fs.closeSync(fdBlock)
      }, () => cb(ZERO))
    },

    unlink: function (filePath, cb) {
      console.log('unlink', filePath)

      replication.unlink(filePath, () => {
        cb(ZERO)
      })
    },

    read: function (filePath, fd, buffer, length, position, cb) {
      console.log('read', filePath, length, position)

      replication.read(filePath, (fileBlockPath) => {
        const fdBlock = fs.openSync(fileBlockPath, 'r')
        fs.readSync(fdBlock, buffer, 0, length, position)
        fs.closeSync(fdBlock)
        cb(length)
      })
    },

    getattr: function (path, cb) {
      // console.log('getattr', path)
      if (path === '/') return cb(null, stat({ mode: '16877', size: 0 }))

      dbEntries.findOne({ path: path, volume: volumeName }, (_err, entry) => {
        if (!entry) return cb(Fuse.ENOENT)

        cb(null, stat({ mode: entry.mode, size: (entry.size) }))
      })
    },

    // DIRS
    mkdir: function (path, mode, cb) {
      console.log('mkdir', path, mode)

      const root = rootPath(path)
      const entry = {
        path: path,
        root: root,
        mode: mode,
        size: 0,
        volume: volumeName
      }

      dbEntries.save(entry, { w: 1 }, () => {
        cb(ZERO)
      })
    },

    readdir: function (path, cb) {
      console.log('readdir', path)
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
      console.log('rmdir', path)
      dbEntries.count({ root: path, volume: volumeName }, (_err, count) => {
        if (count !== 0) return cb(Fuse.ENOTEMPTY)

        dbEntries.remove(
          { path: path, volume: volumeName },
          { multi: true },
          () => { cb(ZERO) })
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
    uid: st.uid !== undefined ? st.uid : process.getuid(),
    gid: st.gid !== undefined ? st.gid : process.getgid()
  }
}

module.exports = { handlers }
