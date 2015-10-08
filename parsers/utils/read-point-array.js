'use strict'

module.exports = function readPointArray (buffer, offset, numPoints) {
  var points = []
  for (let index = offset; index < offset + numPoints * 16; index += 16) {
    points.push({
      x: buffer.readDoubleLE(index, true),
      y: buffer.readDoubleLE(index + 8, true)
    })
  }
  return points
}
