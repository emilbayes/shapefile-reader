'use strict'
const fs = require('fs')
const path = require('path')
const endpoint = require('endpoint')
const interpreted = require('interpreted')

const shapefileReader = require('../shapefile-reader')

interpreted({
  source: path.resolve(__dirname, 'source'),
  expected: path.resolve(__dirname, 'expected'),

  readSource: false,
  // update: true,
  run: ['null', 'points', 'multipoints', 'empty', 'date-property',
        'boolean-property', 'mixed-properties', 'number-property',
        'string-property', 'latin1-property', 'utf8-property',
        'ignore-properties'],

  test: function (name, callback) {
    const dirPath = path.resolve(__dirname, 'source', name)
    fs.readdir(dirPath, function (err, filenames) {
      if (err) return callback(err)

      // Construct an { [ext]: stream } object
      const files = {}
      for (const filename of filenames) {
        if (filename[0] === '.') continue
        const filepath = path.resolve(dirPath, filename)
        const ext = path.extname(filename).slice(1)
        files[ext] = fs.createReadStream(filepath)
      }

      // Create reader and concat items
      const reader = shapefileReader(files)
      reader.pipe(endpoint({ objectMode: true }, function (err, items) {
        if (err) return callback(err)

        // done, also add the header to the dataset
        callback(null, jsonNormalize({
          headers: reader.headers,
          items: items
        }))
      }))
    })
  }
})

function jsonNormalize (obj) {
  return JSON.parse(JSON.stringify(obj))
}
