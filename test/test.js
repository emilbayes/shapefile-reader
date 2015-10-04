'use strict'
const fs = require('fs')
const path = require('path')

const test = require('tape')
const shapefileReader = require('../shapefile-reader')

test('constructor throws', function (assert) {
  assert.throws(shapefileReader, 'no options passed')
  assert.throws(shapefileReader.bind(null, {}), 'no shp options key')
  assert.end()
})

test('read header', function (assert) {
  shapefileReader({
    shp: fs.createReadStream(path.join(__dirname, './fixtures/null.shp'))
  })
  .on('header', function (header) {
    assert.equal(header.fileCode, 9994, 'fileCode is 9994')
    assert.equal(header.version, 1000, 'file version is 1000')
    assert.equal(header.fileLength, 288, 'fileLenght matches filesize (288 bytes)')
    assert.ok(header.shapeType, 'has shapeType')
    assert.ok(header.boundingBox, 'has boundingBox')

    assert.end()
  })
  .resume()
})
