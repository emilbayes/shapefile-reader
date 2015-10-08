'use strict'

module.exports = function readBoundingBox (buffer, offset) {
  const Xmin = buffer.readDoubleLE(offset, true)
  const Ymin = buffer.readDoubleLE(offset + 8, true)
  const Xmax = buffer.readDoubleLE(offset + 16, true)
  const Ymax = buffer.readDoubleLE(offset + 24, true)
  return {Xmin, Ymin, Xmax, Ymax}
}
