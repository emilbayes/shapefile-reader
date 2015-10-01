'use strict'
const fs = require('fs')
const path = require('path')

const test = require('tape')
const shapefileReader = require('../shapefile-reader')

test('constructor throws', function (assert) {
  assert.throws(shapefileReader, 'no options passed')
  assert.throws(shapefileReader.bind(null, {}), 'no shapefile options key')
  assert.end()
})

test('read header', function (assert) {
  shapefileReader({shapefile: fs.createReadStream(path.join(__dirname, './fixtures/null.shp'))})
  .on('header', function (header) {
    assert.equal(header.fileCode, 9994, 'fileCode is 9994')
    assert.equal(header.version, 1000, 'file version is 1000')
    assert.ok(header.fileLength >= 100, 'fileLenght is at least 100 bytes (header is 100 bytes)')
    assert.ok(header.shapeType, 'has shapeType')
    assert.ok(header.boundingBox, 'has boundingBox')

    assert.end()
  })
})
