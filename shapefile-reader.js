'use strict'

// const NO_DATA = -1e38

const async = require('async')
const stream = require('stream')
const endpoint = require('endpoint')
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
  this._files = files
  this._shpReader = new ShpReader(files.shp)
  this._dbfReader = new DbfReader(files.dbf)

  // State
  this._inBody = false
}

ShapefileStream.prototype._readHeader = function (callback) {
  const self = this

  // read character encoding from .cpg
  if (this._files.hasOwnProperty('cpg')) {
    this._files.cpg.pipe(endpoint(function (err, buffer) {
      if (err) return callback(err)

      self._dbfReader.setEncoding(buffer.toString('ascii'))
      phase2()
    }))
  } else {
    phase2()
  }

  // read header from .shp (contains shapes) and .bdf (contains properties)
  function phase2 () {
    async.parallel({
      shp: (done) => self._shpReader.readHeader(done),
      bdf: (done) => self._dbfReader.readHeader(done)
    }, callback)
  }
}

ShapefileStream.prototype._readRecord = function (callback) {
  async.parallel({
    shp: (done) => this._shpReader.readRecord(done),
    dbf: (done) => this._dbfReader.readRecord(done)
  }, function (err, record) {
    if (err) return callback(err)

    if (record.shp === null && record.dbf === null) {
      callback(null, null)
    } else if (record.shp !== null && record.dbf !== null) {
      record.shp.properties = record.dbf
      callback(null, record.shp)
    } else {
      callback(new Error('.shp and .bdf don\'t have the same amount of records'))
    }
  })
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

    self.push(record)
  }
}
