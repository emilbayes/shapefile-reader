'use strict'

// const NO_DATA = -1e38

const async = require('async')
const stream = require('stream')
const inherits = require('inherits')
const ShpReader = require('./lib/shp-reader.js')
const DbfReader = require('./lib/dbf-reader.js')

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

  this.headers = null

  // Create readers
  this._shpReader = new ShpReader(files.shp)
  this._dbfReader = new DbfReader(files.dbf)

  // State
  this._inBody = false
}

ShapefileStream.prototype._readHeader = function (callback) {
  async.parallel({
    shp: (done) => this._shpReader.readHeader(done),
    bdf: (done) => this._dbfReader.readHeader(done)
  }, callback)
}

ShapefileStream.prototype._readRecord = function (callback) {
  async.parallel({
    shp: (done) => this._shpReader.readRecord(done),
    dbf: (done) => this._dbfReader.readRecord(done)
  }, callback)
}

ShapefileStream.prototype._read = function () {
  const self = this

  if (!this._inBody) {
    this._readHeader(function (err, headers) {
      if (err) return self.emit('error', err)

      self._inBody = true
      self.headers = headers
      self.emit('header', headers)

      self._readRecord(done)
    })
  } else {
    self._readRecord(done)
  }

  function done (err, record) {
    if (err) return self.emit('error', err)
    
    if (record.shp === null/* && record.dbf === null*/) return self.push(null)
    if (record.shp !== null && record.dbf !== null) return self.push(record)

    self.emit('error', new Error('.shp and .bdf don\'t have the same amount of records'))
  }
}
