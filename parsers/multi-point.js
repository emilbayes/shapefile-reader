'use strict'

const readBoundingBox = require('./utils/read-bounding-box')
const readPointArray = require('./utils/read-point-array')

module.exports = function MultiPoint (buffer) {
  this.type = 'multiPoint'
  this.box = readBoundingBox(buffer, 4)
  this.points = readPointArray(buffer, 40, buffer.readInt32LE(36, true))
}
