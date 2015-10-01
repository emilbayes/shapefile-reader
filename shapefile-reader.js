'use strict'

const SHP_INT = 4
const SHP_DOUBLE = 8

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

const stream = require('stream')
const inherits = require('inherits')

module.exports = ShapefileStream

inherits(ShapefileStream, stream.Readable)
function ShapefileStream (opts) {
  if (!(this instanceof ShapefileStream)) return new ShapefileStream(opts)

  if (!opts || !opts.shapefile) throw new Error('Missing `shapefile` option')

  stream.Readable.call(this, opts)

  this._inBody = false

  this._shpStream = opts.shapefile

  const self = this
  // When the source stream ends, end this stream
  this._shpStream.on('end', () => self.push(null))
  // When the source stream becomes readable, "refresh" this stream
  this._shpStream.on('readable', () => self.read(0))

  this.header = null
}

ShapefileStream.prototype._read = function (bytes) {
  if (!this._inBody) {
    // Header is 100 bytes
    const chunk = this._shpStream.read(100)

    // If not available, wait until we can read the full headers
    if (chunk === null) return this.push('')

    this.header = {
      fileCode: chunk.readIntBE(0, SHP_INT),
      fileLength: chunk.readIntBE(24, SHP_INT),
      version: chunk.readIntLE(28, SHP_INT),
      shapeType: SHAPE_TYPES[chunk.readIntLE(32, SHP_INT)],
      boundingBox: {
        xMin: chunk.readDoubleLE(36, SHP_DOUBLE),
        yMin: chunk.readDoubleLE(44, SHP_DOUBLE),
        xMax: chunk.readDoubleLE(52, SHP_DOUBLE),
        yMax: chunk.readDoubleLE(60, SHP_DOUBLE),
        zMin: chunk.readDoubleLE(68, SHP_DOUBLE),
        zMax: chunk.readDoubleLE(76, SHP_DOUBLE),
        mMin: chunk.readDoubleLE(84, SHP_DOUBLE),
        mMax: chunk.readDoubleLE(92, SHP_DOUBLE)
      }
    }

    this.emit('header', this.header)
    this._inBody = true
  }
}
