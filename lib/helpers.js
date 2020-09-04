module.exports = {}

module.exports.rootPath = (path) => {
  return '/'.concat(path.split('/').slice(1, -1).join('/'))
}

module.exports.shuffleArray = (input) => {
  let ctr = input.length
  let temp, index

  // While there are elements in the array
  while (ctr > 0) {
    // Pick a random index
    index = Math.floor(Math.random() * ctr)
    // Decrease ctr by 1
    ctr--
    // And swap the last element with it
    temp = input[ctr]
    input[ctr] = input[index]
    input[index] = temp
  }

  return input
}
