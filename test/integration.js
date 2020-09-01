const assert = require('assert')
const { describe, it, before, beforeEach, after } = require('mocha')
const fs = require('fs')
const path = require('path')

const createMountpoint = require('./fixtures/mnt')
const mnt = createMountpoint()

const { spawn, exec } = require('child_process')
const volume = process.pid

exec(`node cli volumes create ${volume} blockA blockB`)
const megazordfs = spawn('node', ['cli', 'volumes', 'start', volume, mnt])

megazordfs.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`)
})

megazordfs.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`)
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
    megazordfs.kill()
  })

  it('mkdir', function () {
    const filePath = path.join('/', 'dirA')
    const hostFilePath = path.join(mnt, filePath)
    fs.mkdirSync(hostFilePath)
  })

  it('readdir', function () {
    const filePath = path.join('/', 'dirA')
    const hostFilePath = path.join(mnt, filePath)
    fs.mkdirSync(hostFilePath, { recursive: true })

    const dir = fs.opendirSync(mnt)
    assert.strictEqual(dir.readSync().name, 'dirA')
  })
})
