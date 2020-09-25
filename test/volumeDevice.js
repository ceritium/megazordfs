const assert = require('assert')
const { it } = require('mocha')

const { stats, virtualDeviceSize, smallerStripe, buildPool } = require('../lib/volumeDevice')

it('stats', () => {
  stats(['.'])
})

it('buildPool', () => {
  const blockA = { total: 100 }
  const blockB = { total: 200 }
  const blockC = { total: 300 }
  const blocks = [blockA, blockB, blockC]

  const poolA = buildPool(blocks, 1)
  assert.deepStrictEqual(poolA, [[blockC, blockB, blockA]])

  const poolB = buildPool(blocks, 2)
  assert.deepStrictEqual(poolB, [[blockC], [blockB, blockA]])

  const poolC = buildPool(blocks, 3)
  assert.deepStrictEqual(poolC, [[blockC], [blockB], [blockA]])

  const poolD = buildPool(blocks, 4)
  assert.deepStrictEqual(poolD, [[blockC], [blockB], [blockA], []])
})

it('smallerStripe', () => {
  const stripeA = [
    { total: 100 },
    { total: 220 },
    { total: 220 }
  ]

  const stripeB = [
    { total: 2 },
    { total: 10 }
  ]

  const stripeC = [
    { total: 200 }
  ]

  const pool = [stripeA, stripeB, stripeC]
  const res = smallerStripe(pool)

  assert.strictEqual(res, stripeB)
})

it('virtualDeviceSize', () => {
  const blockStats = [
    {
      block: '/tmp/BLOCK1',
      available: 100,
      free: 200,
      total: 300
    },
    {
      block: '/tmp/BLOCK2',
      available: 100,
      free: 500,
      total: 600
    },
    {
      block: '/tmp/BLOCK3',
      available: 100,
      free: 100,
      total: 200
    }
  ]

  const virtualDevice = virtualDeviceSize(blockStats, 2)
  assert.strictEqual(virtualDevice.totalSize(), 500)
  assert.strictEqual(virtualDevice.freeSpace(), 300)
})
