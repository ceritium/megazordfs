const disk = require('diskusage')

const stats = (blocks) => {
  blocks.map((block) => {
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

const virtualDeviceSize = (blockStats, copiesNum = 2) => {
  let mainSize = 0
  const mainBlocks = []
  let replicaSize = 0
  const replicaBlocks = []

  const sortedBlocks = blockStats.sort((a, b) => b.total - a.total)

  sortedBlocks.forEach((block) => {
    if (mainSize <= replicaSize) {
      mainSize += block.total
      mainBlocks.push(block)
    } else {
      replicaSize += block.total
      replicaBlocks.push(block)
    }
  })

  return {
    mainBlocks: mainBlocks,
    replicaBlocks: replicaBlocks,
    totalSize: () => Math.min(mainSize, replicaSize),

    available: () => {
      const mainAvailable = mainBlocks.map((block) => {
        return block.available
      }).reduce((acc, cVal) => { return acc + cVal })

      const replicaAvailable = replicaBlocks.map((block) => {
        return block.available
      }).reduce((acc, cVal) => { return acc + cVal })

      return Math.min(mainAvailable, replicaAvailable)
    },

    freeSpace: () => {
      const mainFree = mainBlocks.map((block) => {
        return block.free
      }).reduce((acc, cVal) => { return acc + cVal })

      const replicaFree = replicaBlocks.map((block) => {
        return block.free
      }).reduce((acc, cVal) => { return acc + cVal })

      return Math.min(mainFree, replicaFree)
    },

    mainBlock: () => {
    },

    replicaBlock: () => {
    }
  }
}

const virtualDevice = (volume) => {
  return virtualDeviceSize(stats(volume.blocks))
}

module.exports = { virtualDevice, virtualDeviceSize, stats, smallerStripe, buildPool }
