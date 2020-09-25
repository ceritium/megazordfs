const assert = require('assert')
const { describe, it, before, after } = require('mocha')

const { stats, virtualDeviceSize } = require('../lib/volumeDevice')

it('stats', () => {
  console.log(stats(['.']))
})

it('virtualDeviceSize', () => {
  const blockStats = {
    '/tmp/BLOCK1': {
      block: '/tmp/BLOCK1',
      available: 100,
      free: 200,
      total: 300
    },
    '/tmp/BLOCK2': {
      block: '/tmp/BLOCK2',
      available: 100,
      free: 500,
      total: 600
    },
    '/tmp/BLOCK3': {
      block: '/tmp/BLOCK3',
      available: 100,
      free: 100,
      total: 200
    }
  }
  const virtualDevice = virtualDeviceSize(blockStats)
  assert.strictEqual(virtualDevice.totalSize(), 500)
  assert.strictEqual(virtualDevice.freeSpace(), 300)
})
