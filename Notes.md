Shapefile Technical Description
===============================

Naming Conventions
------------------
We can probably ignore all this and leave it up to the user...

* Allowed "prefix" `/^[a-z0-9][a-z0-9_-]{0,7}$/i`
* Files:
  ```js
[
  prefix + '.shp', // main file
  prefix + '.shx', // index file
  prefix + '.dbf' // dBASE file
]
```

Numeric Types
-------------

* Integer: signed 32-bit integer (4b)
* Float: signed 64-bit IEEE double precision float (8b)
* No data: `(n) => n < -1e38`

Main File (.shp)
===============

* Fixed-length file header (100b)
* Variable-length records
  * Fixed-length record header (8b)
  * Variable-length record contents

Byte order
----------

* Little endian: Data related (record contents, header description fields)
* Big endian: File management (file and record lengths, record offsets)
