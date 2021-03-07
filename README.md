# UploadMultipartImage

## Description
A node.js module for handling uploaded images and text fields with
**multipart/form-data** for [express.js](https://www.npmjs.com/package/express).

## Requirements
- [node.js](https://nodejs.org/) -- v11.5.0 or newer

## Usage
```javascript
const path = require('path')

const uploadImage = require('@exio.tech/upload-multipart-image')
const express = require('express')


const ROOT_DIR = require.main.path

const app = express()

app.get('/', (req, res, next) => {
    res.send(`
    <html>
    <head></head>
    <body>
    <form method="POST" enctype="multipart/form-data">
        <input type="text" name="textfield"><br />
        <input type="file" name="imagefield"><br />
        <input type="submit">
    </form>
    </body>
    </html>
    `)
})

app.post('/', uploadImage({
    imageFieldNames: 'imagefield', // OR multiple - ['image1', 'image2']
    destination: (fileInfo) => path.join(ROOT_DIR, './images'),
    filename: (fileInfo) => fileInfo.defaultFilename + '.png',
    sharp: (fileInfo) => fileInfo.defaultSharp.rotate(140).resize(400, 400).png(),
}), (req, res, next) => {
    res.send(req.file)
})

app.listen(8000, (err) => {
    if (err) return console.log(err)
    console.log('Server started successfully')
})
```
If **imageFieldNames** is an array of convertables to strings, then files metadata will be provided
with **req.files**, not **req.file**.

You can _omit_ this property, set it to _null_ or _empty_array_, then images will be simply thrown away, and middleware will act as simle text field handler.

Details see in **TSDocs**.