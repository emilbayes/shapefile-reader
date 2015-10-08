'use strict'

// const NO_DATA = -1e38

const stream = require('stream')
const inherits = require('inherits')
const ShpReader = require('./lib/shp-reader.js')

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

  this.header = null

  // Create readers
  this._shpReader = new ShpReader(files.shp)

  // State
  this._inBody = false
}

ShapefileStream.prototype._read = function () {
  const self = this

  if (!this._inBody) {
    this._shpReader.readHeader(function (err, header) {
      if (err) return self.emit('error', err)

      self._inBody = true
      self.header = header
      self.emit('header', header)

      self._shpReader.readRecord(done)
    })
  } else {
    self._shpReader.readRecord(done)
  }

  function done (err, record) {
    if (err) return self.emit('error', err)
    // record may be null, indicating there is no more data
    self.push(record)
  }
}
