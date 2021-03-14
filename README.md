# UploadMultipartImage

## Description
A node.js module for handling uploaded images and text fields with
**multipart/form-data** for [express.js](express).

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
Key | Description | Default
---| ---| ---|
**imageFieldNames?** | Defines which image fieldnames your application expects. If any expected, then if not expected image fields encountered before all expected ones are processed, **error** will be fired, if nothing expeted, then any files will be simply thrown away | **[]**, i.e. images will thrown away
**required?** | Defines subset of **imageFieldNames** which are required, or boolean which indicates if all provided **imageFieldNames** are required | **true**
**destination?** | Defines folder path where to save uploaded images | **os.tmpdir()**
**filename?** | Defines filename to save image with (extension included) | **uuidv4()**
**sharp?** | Defines function which **MUST** return new Instance of sharp to process images | **sharp()**
**imageMaxSize?** | Defines Max Size in bytes for image fields, Details and Default See - [BusBoy limits:fileSize](busboy-options)
**fieldNameSize?** | Defines fieldnames Max Size in bytes, Details and Default See - [BusBoy limits:fieldNameSize](busboy-options)
**fieldSize?** | Defines non-image field value Max Size in bytes, Details and Default See - [BusBoy limits:fieldSize](busboy-options)
**fields?** | Defines non-image fields Max count, Details and Default See - [BusBoy limits:fields](busboy-options)

If **imageFieldNames** is an array of convertables to strings, then files metadata will be provided
with **req.files**, if it is a string, then it will be provided with **req.file**.

You can _omit_ **imageFieldNames** property, set it to _null_ or _empty_array_, then images will be simply thrown away, and middleware will act as simle text field handler.

Other details see in **TSDocs**.

[busboy-options]:(https://www.npmjs.com/package/busboy#busboy-methods)
[express]:(https://www.npmjs.com/package/express)