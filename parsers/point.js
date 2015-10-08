'use strict'

module.exports = function Point (buffer) {
  this.type = 'point'
  this.point = {
    x: buffer.readDoubleLE(4, true),
    y: buffer.readDoubleLE(12, true)
  }
}
