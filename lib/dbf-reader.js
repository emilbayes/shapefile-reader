'use strict'

const assert = require('assert')

function DbfReader (stream) {
  this.stream = stream
  this.recordParser = null
  this.recordSize = -1
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

    // Store the record size for later use, when the records are read
    self.recordSize = header.recordSize

    // Now that that we know the vesion is 3, we know where the field
    // descriptors are.
    self._readBytes(header.headerSize - 32, function (err, fieldDescriptorsBuffer) {
      if (err) return callback(err)

      // parse the filed descriptors
      header.fieldDescriptors = self._parseFieldDescriptors(header, fieldDescriptorsBuffer)

      // using the filed descriptors build a parser function for the record buffer
      self.recordParser = self._buildRecordParser(header.fieldDescriptors)

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
  for (let n = 0; buffer.readUInt8(n) !== 0x0d; n += 32) {
    // 0x00 terminates the field name
    const nameLength = Math.min(buffer.indexOf(0x00, n) - n, 11)

    fieldDescriptors.push({
      // TODO: think about character encoding
      name: buffer.toString('ascii', n, n + nameLength),
      type: buffer.toString('ascii', n + 11, n + 12),
      length: buffer.readUInt8(n + 16)
    })
  }

  return fieldDescriptors
}

DbfReader.prototype._buildRecordParser = function (fieldDescriptors) {
  // TODO: Why 1, mbostock/shapefile does the same. But I can't find it anywhere
  // int the documentation.
  let parserOffset = 1
  let parserFunction = 'return {\n'
  for (const field of fieldDescriptors) {
    parserFunction += `\t${JSON.stringify(field.name)}: parsers[${JSON.stringify(field.type)}](` +
                        `buffer, ${parserOffset}, ${field.length}`+
                      `),\n`
    parserOffset += field.length
  }
  parserFunction += '};\n'

  return new Function('buffer', 'parsers', parserFunction)
}

DbfReader.prototype.readRecord = function (callback) {
  const self = this

  // dBASE uses a fixed size record, where the size is defined in header
  this._readBytes(this.recordSize, function (err, buffer) {
    if (err) return callback(err)
    if (buffer === null) return callback(null, null)

    callback(null, self.recordParser(buffer, parsers))
  })
}

const parsers = {
  B: fieldNumber,
  C: fieldString,
  D: fieldDate,
  N: fieldNumber,
  L: fieldBoolean,
  M: fieldNumber,
  // "@": fieldDate,
  // "L": fieldLong,
  // "+": fieldLong,
  F: fieldFloat,
  O: fieldDouble,
  G: fieldNumber
}

// 10 digits representing a .DBT block number. The number is stored as a
// string, right justified and padded with blanks.
function fieldNumber (buffer, offset, size) {
  const str = buffer.toString('ascii', offset, offset + size)
  const num = parseInt(str, 10)
  return Number.isNaN(num) ? null : num
}

// All OEM code page characters - padded with blanks to the width of the field.
function fieldString (buffer, offset, size) {
  // TODO: think about character encoding
  const str = buffer.toString('ascii', offset, offset + size)
  const trimed = str.trim()
  return trimed.length === 0 ? null : trimed
}

// 8 bytes - date stored as a string in the format YYYYMMDD.
function fieldDate (buffer, offset, size) {
  const str = buffer.toString('ascii', offset, offset + size)
  const Y = parseInt(str.slice(0, 4), 10)
  const M = parseInt(str.slice(4, 6), 10)
  const D = parseInt(str.slice(6, 8), 10)

  const d = new Date(Y, M - 1, D, 0, 0, 0, 0, 0)
  // JavaScript uses local time by default
  d.setMinutes(-d.getTimezoneOffset())
  return d
}

// 1 byte - initialized to 0x20 (space) otherwise T or F.
function fieldBoolean (buffer, offset, size) {
  const str = buffer.toString('ascii', offset, offset + size)
  // TODO: why all these extra cases, according to the documentation there
  // is only T and F
  switch (str) {
    case 'y':
    case 'Y':
    case 't':
    case 'T':
      return true
    case 'n':
    case 'N':
    case 'f':
    case 'F':
      return false
    default:
      return null
  }
}

// Number stored as a string, right justified, and padded with blanks to the
// width of the field.
function fieldFloat (buffer, offset, size) {
  const str = buffer.toString('ascii', offset, offset + size)
  const num = parseFloat(str)
  return Number.isNaN(num) ? null : num
}

function fieldDouble (buffer, offset) {
  return buffer.readDoubleLE(offset, true)
}
