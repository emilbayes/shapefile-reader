`shapefile-reader` - WIP
========================

> Streaming Shapefile reader

This is a very early work in progress. Come back later.

Installation
------------

```bash
npm install shapefile-reader
```

Usage
-----

```js
const fs = require('fs')
const shapefileReader = require('shapefile-reader')

shapefileReader({
  shapefile: fs.createReadStream('some-shapefile.shp')
})
.on('header', function (header) {
  // Most interesting is probably header.boundingBox and header.shapeType
})
```

License
-------

* [ISC](LICENSE)
* Test Shapefiles courtesy of Mike Bostock's [`shapefile` module](https://github.com/mbostock/shapefile)
