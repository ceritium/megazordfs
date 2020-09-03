const Fuse = require('fuse-native')
const assert = require('assert')
const { describe, it, before, after } = require('mocha')
const fs = require('fs')
const path = require('path')

const createMountpoint = require('./fixtures/mnt')
const pathBase = createMountpoint()
const mnt = path.join(pathBase, 'megazordfs')
const mntA = path.join(pathBase, 'mntA')
const mntB = path.join(pathBase, 'mntB')
fs.mkdirSync(mntA, { recursive: true })
fs.mkdirSync(mntB, { recursive: true })

const { spawn, execSync } = require('child_process')
const volume = `vol-${process.pid}`

execSync(`node cli volumes create ${volume} ${mntA} ${mntB}`)
const megazordfs = spawn('node', ['cli', 'volumes', 'start', volume, mnt])
console.log(`node cli volumes start ${volume} ${mnt}`)

megazordfs.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`)
})

megazordfs.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`)
})

megazordfs.on('exit', (data) => {
  console.error(`exit: ${data}`)
})

megazordfs.on('close', (data) => {
  console.error(`error: ${data}`)
})

function sleep (ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

describe('handlers', function () {
  before(async () => {
    await sleep(1000)
  })

  after(() => {
    fs.rmdirSync(mnt, { recursive: true })
    megazordfs.kill('SIGINT')
  })

  it('mkdir', function () {
    const filePath = path.join('/', 'dir')
    const hostFilePath = path.join(mnt, filePath)
    fs.mkdirSync(hostFilePath)
  })

  it('readdir', function () {
    const filePath = path.join('/', 'dir')
    const hostFilePath = path.join(mnt, filePath)
    fs.mkdirSync(hostFilePath, { recursive: true })

    const dir = fs.opendirSync(mnt)
    assert.strictEqual(dir.readSync().name, 'dir')
  })

  it('ftruncate', function () {
    const filePath = path.join(mnt, 'file')
    fs.writeFileSync(filePath, 'hello world')

    assert.strictEqual(fs.readFileSync(filePath).toString(), 'hello world')
    const fd = fs.openSync(filePath, 'r+')
    fs.ftruncateSync(fd, 5)
    fs.closeSync(fd)

    assert.strictEqual(fs.readFileSync(filePath).toString(), 'hello')
  })

  it('unlink a file', function () {
    const filePath = path.join(mnt, 'file')
    fs.writeFileSync(filePath, null)
    assert.ok(fs.existsSync(filePath))

    fs.unlinkSync(filePath)
    assert.ok(!fs.existsSync(filePath))
  })

  it('unlink a dir', function () {
    const dirPath = path.join(mnt, 'dir')
    fs.mkdirSync(dirPath, { recursive: true })
    assert.ok(fs.existsSync(dirPath))

    try {
      fs.unlinkSync(dirPath)
    } catch (err) {
      assert.strictEqual(err.code, 'EPERM')
      assert.strictEqual(err.syscall, 'unlink')
    }
  })

  it('rmdir empty dir', function () {
    const dirPath = path.join(mnt, 'emptyDir')
    fs.mkdirSync(dirPath, { recursive: true })
    assert.ok(fs.existsSync(dirPath))

    fs.rmdirSync(dirPath)
    assert.ok(!fs.existsSync(dirPath))
  })

  it('rmdir non empty dir', function () {
    const dirPath = path.join(mnt, 'noEmptyDir')
    fs.mkdirSync(dirPath, { recursive: true })
    assert.ok(fs.existsSync(dirPath))

    const filePath = path.join(dirPath, 'file')
    fs.writeFileSync(filePath, null)
    assert.ok(fs.existsSync(filePath))

    try {
      fs.rmdirSync(dirPath)
    } catch (err) {
      assert.strictEqual(err.errno, Fuse.ENOTEMPTY)
      assert.strictEqual(err.syscall, 'rmdir')
    }
  })

  it('mkdir nested', function () {
    const dirPath = path.join(mnt, 'dir')
    fs.mkdirSync(dirPath, { recursive: true })
    const subDirPath = path.join(dirPath, 'subDir')
    fs.mkdirSync(subDirPath)
    assert.ok(fs.existsSync(dirPath))
  })

  it('write empty file', function () {
    const fileName = 'emptyFile'
    const filePath = path.join(mnt, fileName)
    fs.writeFileSync(filePath, null)
    assert.ok(fs.existsSync(filePath))
  })

  it('write small file', function () {
    const data = 'hello world'
    const fileName = 'smallFile'
    const filePath = path.join(mnt, fileName)
    fs.writeFileSync(filePath, data)
    assert.ok(fs.existsSync(filePath))

    assert.strictEqual(fs.readFileSync(filePath).toString(), data)
  })

  it('write big file', function () {
    const data = 'A'.repeat(100000)
    const fileName = 'bigFile'
    const filePath = path.join(mnt, fileName)
    fs.writeFileSync(filePath, data)
    assert.ok(fs.existsSync(filePath))

    assert.strictEqual(fs.readFileSync(filePath).length, data.length)
    fs.unlinkSync(filePath)
  })
})
