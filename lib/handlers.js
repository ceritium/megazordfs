const Fuse = require('fuse-native')
const { dbEntries } = require('./db.js')

const handlers = function(volumeName){
  return {
    access: function(path, mode, cb) {
      return cb(0)
    },

    flush: function(path, fd, cb) {
      return cb(0)
    },

    fsync: function(path, fd, datasync, cb) {
      return cb(0)
    },

    fsyncdir: function(path, fd, datasync, cb) {
      return cb(0)
    },

    getxattr: function (path, name, position, cb) {
      console.log('getxattr', path, name, position)
      return cb(null)
    },

    truncate: function (path, size, cb) {
      console.log('runcate', path, size)
      process.nextTick(cb, 0)
    },

    ftruncate: function(path, fd, size, cb) {
      console.log('ftruncate', path, fd, size)
      return cb(0)
    },

    rename: function (src, dest, cb) {
      console.log(src, dest)
      const root = '/'.concat(dest.split('/').slice(1,-1).join('/'))
      dbEntries.update({ path: src, volume: volumeName },
        { $set: { path: dest, root: root } }, {}, (err) => {
        if (err) console.log(err)

        dbEntries.loadDatabase()
        return cb(0) // we handled all the data
      })
    },

    create: function (path, mode, cb) {
      console.log('create', path)
      const root = '/'.concat(path.split('/').slice(1,-1).join('/'))
      if (root.length == 0) root = '/'
      const entry = {
        path: path,
        root: root,
        mode: mode,
        volume: volumeName
      }

      return dbEntries.insert(entry, (err, _item) => {
        if (err) console.log(err)

        dbEntries.loadDatabase()
        return cb(0)
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

        dbEntries.loadDatabase(()=>{
          return cb(length)
        })
      })
    },

    mkdir: function (path, mode, cb) {
      const root = '/'.concat(path.split('/').slice(1,-1).join('/'))
      const entry = {
        path: path,
        mode: mode,
        root: root,
        volume: volumeName
      }
      return dbEntries.insert(entry, (err, _item) => {
        if (err) console.log(err)

        dbEntries.loadDatabase(()=>{
          return cb(0)
        })
      })
    },

    readdir: function (path, cb) {
      // if (path !== '/') {
      //   path = `${path}/`
      // }
      //
      // const rex = new RegExp(`^${path.replace(".", "\\.")}\\w+$`)
      return dbEntries.find({ root: path, volume: volumeName }, (err, entries) => {
        if (err) console.log(err)
        const items = entries.map(x => x.path.replace(path, ''))
        return cb(null, items)
      })
    },

    getattr: function (path, cb) {
      console.log('getattr', path)
      if (path === '/') return cb(null, stat({ mode: '16877', size: 4096 }))

      return dbEntries.findOne({ path: path, volume: volumeName }, (err, entry) => {
        if (err) console.log(err)
        if (entry) {
          return cb(null, stat({ mode: entry.mode, size: (entry.length) }))
        } else {
          return cb(Fuse.ENOENT)
        }
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
        console.log('size', buf.length)
        return cb(str.length)
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
