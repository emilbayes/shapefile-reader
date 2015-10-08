'use strict'

module.exports = function readBoundingBox (buffer, offset) {
  const xMin = buffer.readDoubleLE(offset, true)
  const yMin = buffer.readDoubleLE(offset + 8, true)
  const xMax = buffer.readDoubleLE(offset + 16, true)
  const yMax = buffer.readDoubleLE(offset + 24, true)
  return {xMin, yMin, xMax, yMax}
}
