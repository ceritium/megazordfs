const assert = require('assert')
const { describe, it, before, beforeEach, after } = require('mocha')
const fs = require('fs')
const path = require('path')

const createMountpoint = require('./fixtures/mnt')
const mnt = createMountpoint()

const { spawn, execSync } = require('child_process')
const volume = `vol-${process.pid}`

execSync(`node cli volumes create ${volume} blockA blockB`)
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
  before(async function () {
    await sleep(1000)
  })

  after(function () {
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
  })
})
