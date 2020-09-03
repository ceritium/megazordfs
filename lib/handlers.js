const Fuse = require('fuse-native')
const fs = require('fs')
const path = require('path')

const { dbEntries } = require('./db.js')

const rootPath = (path) => {
  return '/'.concat(path.split('/').slice(1, -1).join('/'))
}

const ZERO = 0

const handlers = function (volume) {
  const volumeName = volume._id

  return {
    access: function (path, mode, cb) {
      return cb(ZERO)
    },

    flush: function (path, fd, cb) {
      return cb(ZERO)
    },

    fsync: function (path, fd, datasync, cb) {
      return cb(ZERO)
    },

    fsyncdir: function (path, fd, datasync, cb) {
      return cb(ZERO)
    },

    getxattr: function (path, name, position, cb) {
      // console.log('getxattr', path, name, position)
      return cb(null)
    },

    getattr: function (path, cb) {
      // console.log('getattr', path)
      if (path === '/') return cb(null, stat({ mode: '16877', size: 0 }))

      return dbEntries.findOne({ path: path, volume: volumeName }, (err, entry) => {
        if (err) console.log(err)
        if (entry) {
          return cb(null, stat({ mode: entry.mode, size: (entry.size) }))
        } else {
          return cb(Fuse.ENOENT)
        }
      })
    },

    truncate: function (path, size, cb) {
      console.log('truncate', path, size)
      return cb(ZERO)
    },

    ftruncate: function (path, fd, size, cb) {
      console.log('ftruncate', path, fd, size)
      return cb(ZERO)
    },

    rmdir: function (path, cb) {
      console.log('rmdir', path)
      dbEntries.count({ root: path, volume: volumeName }, (err, count) => {
        if (err) console.log(err)
        if (count === 0) {
          dbEntries.remove({ path: path, volume: volumeName }, { multi: true }, (err) => {
            if (err) console.log(err)
            return cb(ZERO)
          })
        } else {
          return cb(Fuse.ENOTEMPTY)
        }
      })
    },

    unlink: function (filePath, cb) {
      console.log('unlink', filePath)
      dbEntries.remove({ path: filePath, volume: volumeName }, { multi: true }, (err) => {
        const pathBlock1 = path.join(volume.blocks[0], filePath)
        try {
          fs.unlinkSync(pathBlock1)
        } catch (err) {
          if (err) console.log(err)
        }
        if (err) console.log(err)
        return cb(ZERO)
      })
    },

    rename: function (src, dest, cb) {
      console.log('rename', src, dest)
      // TODO: rename non empty directory
      const root = rootPath(dest)
      dbEntries.update({ path: src, volume: volumeName },
        { $set: { path: dest, root: root } }, {}, (err) => {
          if (err) console.log(err)

          return cb(ZERO)
        })
    },

    create: function (path, mode, cb) {
      console.log('create', path)
      const root = rootPath(path)
      const entry = {
        path: path,
        root: root,
        mode: mode,
        size: 0,
        volume: volumeName
      }

      return dbEntries.insert(entry, (err, _item) => {
        if (err) console.log(err)

        return cb(ZERO)
      })
    },

    write: function (filePath, fd, buffer, length, position, cb) {
      console.log('write', filePath, fd, 'length', length, 'position', position)

      const pathBlock1 = path.join(volume.blocks[0], filePath)
      const pathBlock2 = path.join(volume.blocks[1], filePath)

      fs.mkdirSync(rootPath(pathBlock1), { recursive: true })
      const fd1 = fs.openSync(pathBlock1, 'a')
      fs.writeSync(fd1, buffer, 0, length, position)

      fs.mkdirSync(rootPath(pathBlock2), { recursive: true })
      const fd2 = fs.openSync(pathBlock2, 'a')
      fs.writeSync(fd2, buffer, 0, length, position)

      const stat = fs.statSync(pathBlock1)
      dbEntries.update({ path: filePath, volume: volumeName },
        { $set: { size: stat.size } }, {}, (err) => {
          if (err) console.log(err)
          return cb(length)
        })
    },

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

      dbEntries.save(entry, { w: 1 }, (err, item) => {
        if (err) console.log(err)

        return cb(ZERO)
      })
    },

    readdir: function (path, cb) {
      console.log('readdir', path)
      return dbEntries.find({ root: path, volume: volumeName }).toArray((err, entries) => {
        if (err) console.log(err)

        let pattern = path
        if (path !== '/') {
          pattern = `${path}/`
        }

        const items = entries.map(x => x.path.replace(pattern, ''))
        return cb(null, items)
      })
    },

    release: function (path, fd, cb) {
      return cb(ZERO)
    },

    read: function (filePath, fd, buffer, length, position, cb) {
      console.log('read', filePath, length, position)

      const pathBlock1 = path.join(volume.blocks[0], filePath)
      const fdMain = fs.openSync(pathBlock1, 'r')

      fs.readSync(fdMain, buffer, 0, length, position)
      return cb(length)
    },

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
    // mode: st.mode === 'dir' ? 16877 : (st.mode === 'file' ? 33188 : (st.mode === 'link' ? 41453 : st.mode)),
    mode: st.mode || 33188,
    uid: st.uid !== undefined ? st.uid : process.getuid(),
    gid: st.gid !== undefined ? st.gid : process.getgid()
  }
}

module.exports = { handlers }
