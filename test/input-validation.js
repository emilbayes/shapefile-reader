'use strict'
const test = require('tap').test
const shapefileReader = require('../shapefile-reader')

test('constructor throws', function (assert) {
  assert.throws(shapefileReader, 'no options passed')
  assert.throws(shapefileReader.bind(null, {}), 'no shp options key')
  assert.end()
})
