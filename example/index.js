const path = require('path')

const uploadImage = require('../')
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
        <input type="file" name="imagefield2"><br />
        <input type="submit">
    </form>
    </body>
    </html>
    `)
})

app.post('/', uploadImage({
    imageFieldNames: [],
    required: [],
    destination: (fileInfo) => path.join(ROOT_DIR, './images'),
    filename: (fileInfo) => fileInfo.defaultFilename + '.png',
    sharp: (fileInfo) => fileInfo.defaultSharp.rotate(140).resize(400, 400).png(),
}), (req, res, next) => {
    res.send(req.file)
})

app.listen(8000, (err) => {
    if (err) return console.log(err)
    console.log(`Server started successfully: http://localhost:8000`)
})