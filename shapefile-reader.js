'use strict'

const SHAPE_TYPES = {
  0: 'nullShape',
  1: 'point',
  3: 'polyLine',
  5: 'polygon',
  8: 'multiPoint',
  11: 'pointZ',
  13: 'polyLineZ',
  15: 'polygonZ',
  18: 'multiPointZ',
  21: 'pointM',
  23: 'polyLineM',
  25: 'polygonM',
  28: 'multiPointM',
  31: 'multiPatch'
}

// const NO_DATA = -1e38

const assert = require('assert')
const stream = require('stream')
const inherits = require('inherits')

module.exports = ShapefileStream

inherits(ShapefileStream, stream.Readable)
function ShapefileStream (files, options) {
  if (!(this instanceof ShapefileStream)) return new ShapefileStream(files)
  stream.Readable.call(this, Object.assign({ objectMode: true }, options))

  // Validate input
  if (typeof files !== 'object' || files === null) {
    throw new TypeError('first argument must be an object of file streams')
  }
  if (!files.shp) throw new Error('No shp property is set')

  this._files = files
  this.header = null

  // State
  this._inBody = false
}

ShapefileStream.prototype._readBytes = function (stream, bytes, callback) {
  const chunk = stream.read(bytes)
  if (chunk !== null) {
    assert(chunk.length === bytes) // dev assert, should be removed once well tested
    return callback(null, chunk)
  }

  stream.once('readable', function () {
    const chunk = stream.read(bytes)
    assert(chunk.length === bytes) // dev assert, should be removed once well tested
    callback(null, chunk)
  })
}

ShapefileStream.prototype._readHeader = function (callback) {
  const self = this
  this._readBytes(this._files.shp, 100, function (err, chunk) {
    if (err) return callback(err)

    self.header = {
      fileCode: chunk.readInt32BE(0, true),
      fileLength: chunk.readInt32BE(24, true) * 2,
      version: chunk.readInt32LE(28, true),
      shapeType: SHAPE_TYPES[chunk.readInt32LE(32, true)],
      boundingBox: {
        xMin: chunk.readDoubleLE(36, true),
        yMin: chunk.readDoubleLE(44, true),
        xMax: chunk.readDoubleLE(52, true),
        yMax: chunk.readDoubleLE(60, true),
        zMin: chunk.readDoubleLE(68, true),
        zMax: chunk.readDoubleLE(76, true),
        mMin: chunk.readDoubleLE(84, true),
        mMax: chunk.readDoubleLE(92, true)
      }
    }

    self.emit('header', self.header)
    self._inBody = true
    callback(null)
  })
}

ShapefileStream.prototype._readRecord = function (callback) {
  this.push(null)
  callback(null)
}

ShapefileStream.prototype._read = function () {
  const self = this

  if (!this._inBody) {
    this._readHeader(function (err) {
      if (err) return self.emit('error', err)
      self._readRecord(done)
    })
  } else {
    self._readRecord(done)
  }

  function done (err) {
    if (err) return self.emit('error', err)
  }
}
