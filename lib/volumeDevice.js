const disk = require('diskusage')

const stats = (blocks) => {
  const res = {}
  blocks.forEach((block) => {
    res[block] = disk.checkSync(block)
    res[block].block = block
  })

  return res
}

const virtualDeviceSize = (blockStats) => {
  let mainSize = 0
  const mainBlocks = []
  let replicaSize = 0
  const replicaBlocks = []

  const sortedBlocks = Object.values(blockStats).sort((a, b) => b.total - a.total)

  sortedBlocks.forEach((block) => {
    if (mainSize <= replicaSize) {
      mainSize += block.total
      mainBlocks.push(block)
    } else {
      replicaSize += block.total
      replicaBlocks.push(block)
    }
  })

  console.log('mainBlocks', mainBlocks)
  console.log('replicaBlocks', replicaBlocks)

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

module.exports = { virtualDevice, virtualDeviceSize, stats }
