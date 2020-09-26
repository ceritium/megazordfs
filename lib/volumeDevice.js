const disk = require('diskusage')
const { shuffleArray } = require('./helpers')

const stats = (blocks) => {
  return blocks.map((block) => {
    return { block, ...disk.checkSync(block) }
  })
}

const sortPool = (pool) => {
  return pool.sort((stripeA, stripeB) => {
    const sizeStripe = (stripe) => {
      return stripe.reduce((acc, block) => {
        return acc + block.total
      }, 0)
    }

    return (sizeStripe(stripeA) - sizeStripe(stripeB))
  })
}

const smallerStripe = (pool) => {
  return sortPool(pool)[0]
}

const buildPool = (blockStats, copiesNum = 2) => {
  const pool = []
  for (let step = 0; step < copiesNum; step++) {
    pool.push([])
  }

  const sortedBlocks = blockStats.sort((a, b) => b.total - a.total)
  sortedBlocks.forEach((block) => {
    const stripe = smallerStripe(pool)
    stripe.push(block)
  })

  return sortPool(pool).reverse()
}

const virtualDeviceForBlockStats = (blockStats, copiesNum = 2) => {
  const pool = buildPool(blockStats, copiesNum)
  const stripe = smallerStripe(pool)

  const sumStripe = (attr) => {
    return stripe.reduce((acc, block) => { return acc + block[attr] }, 0)
  }

  return {
    totalSize: () => sumStripe('total'),
    available: () => sumStripe('available'),
    freeSpace: () => sumStripe('free'),
    writeBlocks: () => {
      return pool.map((stripe) => {
        return shuffleArray(stripe.map((block) => block.block))[0]
      })
    }
  }
}

const virtualDevice = (volume) => {
  return virtualDeviceForBlockStats(stats(volume.blocks))
}

module.exports = { virtualDevice, virtualDeviceForBlockStats, stats, smallerStripe, buildPool }
