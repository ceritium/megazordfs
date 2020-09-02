const Fuse = require('fuse-native')
const { dbEntries } = require('./db.js')

const rootPath = (path) => {
  return '/'.concat(path.split('/').slice(1,-1).join('/'))
}

const handlers = function (volumeName) {
  return {
    access: function (path, mode, cb) {
      return cb(0)
    },

    flush: function (path, fd, cb) {
      return cb(0)
    },

    fsync: function (path, fd, datasync, cb) {
      return cb(0)
    },

    fsyncdir: function (path, fd, datasync, cb) {
      return cb(0)
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
          return cb(null, stat({ mode: entry.mode, size: (entry.length) }))
        } else {
          return cb(Fuse.ENOENT)
        }
      })
    },

    truncate: function (path, size, cb) {
      console.log('truncate', path, size)
      process.nextTick(cb, 0)
    },

    ftruncate: function (path, fd, size, cb) {
      console.log('ftruncate', path, fd, size)
      return cb(0)
    },

    rmdir: function (path, cb) {
      console.log('rmdir', path)
      dbEntries.count({ root: path, volume: volumeName }, (err, count) => {
        if (err) console.log(err)
        if (count === 0) {
          dbEntries.remove({ path: path, volume: volumeName }, { multi: true }, (err) => {
            if (err) console.log(err)
            dbEntries.loadDatabase(() => {
              return cb(0)
            })
          })
        } else {
          console.log(1)
          return cb(1)
        }
      })
    },

    unlink: function (path, cb) {
      console.log('unlink', path)
      dbEntries.remove({ path: path, volume: volumeName }, { multi: true }, (err) => {
        if (err) console.log(err)
        dbEntries.loadDatabase(() => {
          return cb(0)
        })
      })
    },

    rename: function (src, dest, cb) {
      console.log('rename', src, dest)
      const root = rootPath(dest)
      dbEntries.update({ path: src, volume: volumeName },
        { $set: { path: dest, root: root } }, {}, (err) => {
        if (err) console.log(err)

        dbEntries.loadDatabase(() => {
          return cb(0)
        })
      })
    },

    create: function (path, mode, cb) {
      console.log('create', path)
      const root = rootPath(path)
      const entry = {
        path: path,
        root: root,
        mode: mode,
        length: 0,
        volume: volumeName
      }

      return dbEntries.insert(entry, (err, _item) => {
        if (err) console.log(err)

        dbEntries.loadDatabase(()=>{
          return cb(0)
        })
      })
    },

    write: function (path, fd, buffer, length, position, cb) {
      console.log('write', path, fd, length, position)

      // const nBuf// = Buffer.alloc(length + position)
      let nBuf = null

      dbEntries.findOne({ path: path, volume: volumeName }, (err, entry) => {
        if(entry.data) {
          nBuf = Buffer.alloc(Math.max(length + position, (entry.length || 0)))
          nBuf.write(entry.data.toString())
        }
      })

      if (!nBuf) nBuf = Buffer.alloc(length + position)
      nBuf.write(buffer.toString(), position, length)

      console.log('size', nBuf.length)
      dbEntries.update({ path: path, volume: volumeName },
        { $set: { length: nBuf.length, data: nBuf.toJSON().data } }, {}, (err) => {
          if (err) console.log(err)

          dbEntries.loadDatabase(() => {
            return cb(length)
          })
        })
    },

    mkdir: function (path, mode, cb) {
      const root = rootPath(path)
      const entry = {
        path: path,
        root: root,
        mode: mode,
        length: 0,
        volume: volumeName
      }
      return dbEntries.insert(entry, (err, _item) => {
        if (err) console.log(err)

        dbEntries.loadDatabase(() => {
          return cb(0)
        })
      })
    },

    readdir: function (path, cb) {
      console.log('readdir', path)
      return dbEntries.find({ root: path, volume: volumeName }, (err, entries) => {
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
      return cb(0)
    },

    read: function (path, fd, buf, len, pos, cb) {
      console.log('read', path, fd, len, pos)
      return dbEntries.findOne({ path: path, volume: volumeName }, (err, entry) => {
        if (err) console.log(err)
        if (!entry) return cb(0)

        const str = Buffer.from(entry.data || []).toString().slice(pos, pos + len)
        buf.write(str)
        return cb(str.length)
      })
    },

    statfs: (path, cb) => {
      // TODO: Implement when write to real devices
      cb(0, {
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
