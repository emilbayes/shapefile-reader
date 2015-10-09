'use strict'

const assert = require('assert')

function DbfReader (stream) {
  this.stream = stream
}
module.exports = DbfReader

DbfReader.prototype._readBytes = function (bytes, callback) {
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

DbfReader.prototype.readHeader = function (callback) {
  const self = this

  // Shapefile header is always 100 bytes
  this._readBytes(32, function (err, fixedHeaderBuffer) {
    if (err) return callback(err)
    const header = self._parseFixedHeader(fixedHeaderBuffer)

    // Only version 3 is supported at this point. The same is the case for
    // (mbostock/shapefile), except they don't do the validation
    if (header.fileVersion !== 3) {
      return callback(null, new Error(
        'only .dbf version 3 (dBASE level 5) is supported,' +
        'got version ' + header.fileVersion
      ))
    }

    // Now that that we know the vesion is 3, we know where the field
    // descriptors are.
    self._readBytes(header.headerSize - 32, function (err, fieldDescriptorsBuffer) {
      if (err) return callback(err)

      header.fieldDescriptors = self._parseFieldDescriptors(header, fieldDescriptorsBuffer)
      callback(null, header)
    })
  })
}

DbfReader.prototype._parseFixedHeader = function (buffer) {
  const fileType = buffer.readUInt8(0, true)

  return {
    fileVersion: fileType & 0b00000011,
    date: new Date(1900 + buffer.readUInt8(1), buffer.readUInt8(2) - 1, buffer.readUInt8(3)),
    recordCount: buffer.readUInt32LE(4),
    headerSize: buffer.readUInt16LE(8),
    recordSize: buffer.readUInt16LE(10)
  }
}

DbfReader.prototype._parseFieldDescriptors = function (header, buffer) {
  const fieldDescriptors = []

  // 0x0d is the termination byte
  for (let n = 0; buffer.readUInt8(n) != 0x0d; n += 32) {
    // 0x00 terminates the field name
    const nameLength = Math.min(buffer.indexOf(0x00, n) - n, 11)

    fieldDescriptors.push({
      name: buffer.toString("ascii", n, n + nameLength),
      type: buffer.toString("ascii", n + 11, n + 12),
      length: buffer.readUInt8(n + 16)
    });
  }

  return fieldDescriptors
}

DbfReader.prototype.readRecord = function (callback) {
  callback(null, {})
}
