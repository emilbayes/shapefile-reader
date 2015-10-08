'use strict'

const assert = require('assert')
const SHAPE_TYPES = require('./shape-types.js')
const shapeTypeParsers = require('../parsers')

function ShpReader (stream) {
  this.stream = stream
}
module.exports = ShpReader

ShpReader.prototype._readBytes = function (bytes, callback) {
  const stream = this.stream
  const chunk = stream.read(bytes)
  if (chunk !== null) {
    assert(chunk.length === bytes) // dev assert, should be removed once well tested
    return callback(null, chunk)
  }

  stream.once('readable', function () {
    const chunk = stream.read(bytes)
    assert(chunk === null || chunk.length === bytes) // dev assert, should be removed once well tested
    callback(null, chunk)
  })
}

ShpReader.prototype.readHeader = function (callback) {
  const self = this

  // Shapefile header is always 100 bytes
  this._readBytes(100, function (err, buffer) {
    if (err) return callback(err)
    callback(null, self._parseHeader(buffer))
  })
}

ShpReader.prototype._parseHeader = function (buffer) {
  return {
    fileCode: buffer.readInt32BE(0, true),
    // File length is counted in 16-bit words, meaning we need to double
    // the number to get bytes
    fileLength: buffer.readInt32BE(24, true) * 2,
    version: buffer.readInt32LE(28, true),
    shapeType: SHAPE_TYPES[buffer.readInt32LE(32, true)],
    boundingBox: {
      xMin: buffer.readDoubleLE(36, true),
      yMin: buffer.readDoubleLE(44, true),
      xMax: buffer.readDoubleLE(52, true),
      yMax: buffer.readDoubleLE(60, true),
      zMin: buffer.readDoubleLE(68, true),
      zMax: buffer.readDoubleLE(76, true),
      mMin: buffer.readDoubleLE(84, true),
      mMax: buffer.readDoubleLE(92, true)
    }
  }
}

ShpReader.prototype.readRecord = function (callback) {
  const self = this

  // first read the record header to get the content size
  this._readBytes(8, function (err, headerBuffer) {
    if (err) return callback(err)
    if (!headerBuffer) return callback(null, null) // no more data

    // Why care about he the record number?
    // const recordNumber = buffer.readInt32BE(0, true)

    // Again, byte lengths in Shapefiles are in number of 16 bit words, so we
    // need to convert to bytes
    const recordLength = headerBuffer.readInt32BE(4, true) * 2

    // read the record content
    self._readBytes(recordLength, function (err, contentBuffer) {
      if (err) return callback(err)

      // Parse and check the shapeType
      const shapeType = contentBuffer.readInt32LE(0, true)
      if (!SHAPE_TYPES.hasOwnProperty(shapeType)) {
        // Should probably be custom error. Maybe RecordTypeError
        callback(TypeError(`Unknown record type (id = ${shapeType})`))
      }

      // shapeType is good, parse contentBuffer
      const content = new shapeTypeParsers[SHAPE_TYPES[shapeType]](contentBuffer)
      callback(null, content)
    })
  })
}
