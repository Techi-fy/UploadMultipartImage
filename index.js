const fs = require('fs')
const os = require('os')
const path = require('path')

const {
    promisify,
} = require('util')


const Busboy = require('busboy')
const sharp = require('sharp')
const createError = require('http-errors')

const {
    v4: uuidv4,
} = require('uuid')


const {
    includesArray,
    allSettled,
    createSubmitError,
    unlinkWithError,

    FULFILLED,
    REJECTED,
} = require('./utils')


const mkdir = promisify(fs.mkdir)
const unlink = promisify(fs.unlink)

const destinationDefaultFunc = () => os.tmpdir()
const filenameDefaultFunc = () => uuidv4()
const sharpDefaultFunc = () => sharp()

module.exports = (opts = {}) => {
    let {
        imageFieldNames = [],
        imageMaxSize,
        destination: destinationFunc = destinationDefaultFunc,
        filename: filenameFunc = filenameDefaultFunc,
        sharp: sharpFunc = sharpDefaultFunc,
        required = true,
        fields,
        fieldNameSize,
        fieldSize,
    } = opts

    if (
        (typeof imageFieldNames === 'string' && !imageFieldNames.length)
        ||
        (
            imageFieldNames instanceof Array &&
            imageFieldNames.some(fieldName => !(fieldName + '').length)
        )
    ) {
        throw new Error('If providing, imageFieldNames must be a NOT_EMPTY string, or as array of convertables to NOT_EMPTY strings, or anything else to omit image handling')
    }

    let isSingleFile = true
    if (imageFieldNames instanceof Array) {
        isSingleFile = false
        imageFieldNames = imageFieldNames.map(fieldName => fieldName + '')
    } else if (imageFieldNames && typeof imageFieldNames === 'string') {
        imageFieldNames = [imageFieldNames]
    } else {
        imageFieldNames = []
    }

    if (typeof destinationFunc !== 'function') {
        if (typeof destinationFunc === 'string') {
            const fpath = destinationFunc
            destinationFunc = () => fpath
        } else {
            destinationFunc = destinationDefaultFunc
        }
    }
    if (typeof filenameFunc !== 'function') {
        if (typeof filenameFunc === 'string') {
            const fname = filenameFunc
            filenameFunc = () => fname
        } else {
            filenameFunc = filenameDefaultFunc
        }
    }
    if (typeof sharpFunc !== 'function') {
        sharpFunc = sharpDefaultFunc
    }


    if (
        required instanceof Array
        &&
        (
            required.some(fieldName => !(fieldName + '').length)
            ||
            !includesArray(imageFieldNames, required.map(fieldName => fieldName + ''))
        )
    ) {
        throw new Error(`If provided, required must be a boolean or an array of convertables to NOT_EMPTY strings representing subset of imageFieldNames`)
    }

    if (required instanceof Array) {
        required = required.map(fieldName => fieldName + '')
    } else {
        required = !!required
    }

    return async function (req, res, next) {
        const busboy = new Busboy({
            headers: req.headers,
            limits: {
                files: imageFieldNames.length,
                fileSize: imageMaxSize,
                fieldNameSize,
                fieldSize,
                fields,
            }
        })
        req.pipe(busboy)

        const sendedImageFields = []
        const imageOpsQueue = []
        const fieldOpsQueue = []

        busboy.on('file', (fieldname, file, filename, encoding, mimtype) => imageOpsQueue.push((
            async () => {
                const fileInfo = {
                    fieldname,
                    filename,
                    encoding,
                    mimtype,

                    defaultDest: destinationDefaultFunc(),
                    defaultFilename: filenameDefaultFunc(),
                    defaultSharp: sharpDefaultFunc(),
                }
                sendedImageFields.push(fieldname)

                if (!imageFieldNames.includes(fieldname)) {
                    file.resume()
                    throw createSubmitError(`ImageField: ${fieldname} is not expected`, {
                        fieldname,
                        file: true,
                    })
                }

                let dpath, fname, fpath
                try {
                    dpath = await destinationFunc(fileInfo)
                    fname = await filenameFunc(fileInfo)
                    await mkdir(dpath, {
                        recursive: true
                    })
                    fpath = path.join(dpath, fname)
                } catch (err) {
                    file.resume()
                    throw createSubmitError(`Cant resolve path for file: ${fieldname}`, {
                        fieldname,
                        file: true,
                        originalErrMsg: err.message,
                    })
                }


                const writeFileStream = fs.createWriteStream(fpath, {
                    flags: 'w'
                })
                const writeFinished = new Promise(res => {
                    writeFileStream.on('finish', () => res())
                    writeFileStream.on('error', () => res())
                })


                const sharpStream = sharpFunc(fileInfo)
                sharpStream.pipe(writeFileStream)
                file.pipe(sharpStream)


                let sizeLimitExceeded = false
                file.on('limit', () => {
                    sizeLimitExceeded = true
                })

                return new Promise((res, rej) => sharpStream
                    .on('error', async (err) => {
                        await writeFinished
                        rej(unlinkWithError(fpath, `Bad image uploaded: ${fieldname}, originalname: ${filename}`, {
                            fieldname,
                            file: true,
                            originalErrMsg: err.message,
                        }))
                    })
                    .on('finish', async () => {
                        await writeFinished
                        if (sizeLimitExceeded) return rej(unlinkWithError(fpath, `Image size succeed limit of ${imageMaxSize} bytes: ${fieldname}, originalname: ${filename}`, {
                            fieldname,
                            file: true,
                        }))

                        // validating image
                        try {
                            // await new Promise(res => setTimeout(res, 400))
                            await sharp(fpath).metadata()
                        } catch (err) {
                            return rej(unlinkWithError(fpath, `Bad image uploaded: ${fieldname}, originalname: ${filename}`, {
                                fieldname,
                                originalErrMsg: err.message,
                                file: true,
                            }))
                        }

                        res({
                            fieldname,
                            filename: fname,
                            originalname: filename,
                            dist: dpath,
                            path: fpath,
                        })
                    }))
            })())
        )

        busboy.on('field', (fieldname, val, fieldnameTruncated, valTruncated) => fieldOpsQueue.push((
            async () => {
                // if (fields instanceof Array && !fields.includes(fieldname)) {
                //     throw createSubmitError(`Fieldname: ${fieldname} is not expected`, {
                //         fieldname,
                //         file: false,
                //     })
                // }

                return {
                    fieldname,
                    val,
                    fieldnameTruncated,
                    valTruncated,
                }
            })())
        )


        busboy.on('finish', async () => {
            const fileResults = await allSettled(imageOpsQueue)
            const errors = fileResults[REJECTED]

            if (isSingleFile) {
                req.file = fileResults[FULFILLED].length === 1 ? fileResults[FULFILLED][0] : null
            } else {
                req.files = fileResults[FULFILLED]
            }

            const fieldResults = await allSettled(fieldOpsQueue)
            req.body = fieldResults[FULFILLED].reduce((fieldsMap, field) => {
                fieldsMap[field.fieldname] = field.val
                return fieldsMap
            }, {})

            if (errors.length) {
                console.log(errors)
                const message = errors.reduce((message, err, index) => `${message}${index + 1}. ${err.message}\n`, '')
                allSettled(fileResults.fulfilled.map(file => unlink(file.path)))
                return next(createError(400, message))
            }

            if (required instanceof Array) {
                if (!includesArray(sendedImageFields, required)) {
                    // const error = new Error(`Sended image fields: ${sendedImageFields} are not include all required image fields: ${required}`)
                    // error.sended = sendedImageFields
                    // error.required = required
                    allSettled(fileResults.fulfilled.map(file => unlink(file.path)))
                    return next(createError(400, `Sended image fields: ${sendedImageFields} are not include all required image fields: ${required}`))
                }

            } else {
                if (required && !includesArray(sendedImageFields, imageFieldNames)) {
                    allSettled(fileResults.fulfilled.map(file => unlink(file.path)))
                    return next(createError(400, `Sended image fields: ${sendedImageFields} are not include all required image fields: ${imageFieldNames}`))
                }
            }

            next()
        })
    }
}