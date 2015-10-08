'use strict'

function NullShape () {
  this.type = 'nullShape'
}
exports.nullShape = NullShape

function Point (buffer) {
  this.type = 'point'
  this.point = {
    x: buffer.readDoubleLE(4, true),
    y: buffer.readDoubleLE(12, true)
  }
}
exports.point = Point

function MultiPoint (buffer) {
  this.type = 'multiPoint'
  this.box = readBoundingBox(buffer, 4)
  this.points = readPointArray(buffer, 40, buffer.readInt32LE(36, true))
}
exports.multiPoint = MultiPoint

function readBoundingBox (buffer, offset) {
  const Xmin = buffer.readDoubleLE(offset, true)
  const Ymin = buffer.readDoubleLE(offset + 8, true)
  const Xmax = buffer.readDoubleLE(offset + 16, true)
  const Ymax = buffer.readDoubleLE(offset + 24, true)
  return {Xmin, Ymin, Xmax, Ymax}
}

function readPointArray (buffer, offset, numPoints) {
  var points = []
  for (let index = offset; index < offset + numPoints * 16; index += 16) {
    points.push({
      x: buffer.readDoubleLE(index, true),
      y: buffer.readDoubleLE(index + 8, true)
    })
  }
  return points
}
