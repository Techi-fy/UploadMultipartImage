const fs = require('fs')

const {
    promisify,
} = require('util')


const promiseAllSettled = require('promise.allsettled')


const unlink = promisify(fs.unlink)

async function unlinkWithError(path, message, data) {
    try {
        await unlink(path)
    } catch { }
    return createSubmitError(message, data)
}

function createSubmitError(message, data = null) {
    const error = new Error(message)
    if (data !== null && data !== undefined) error.data = data
    return error
}

const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'
async function allSettled(promises) {
    if (!(promises instanceof Array)) {
        throw new Error(`Promises Must be array of promises`)
    }

    const settled = await promiseAllSettled(promises)

    const mapped = {
        [FULFILLED]: [],
        [REJECTED]: []
    }
    for (const p of settled) {
        let value
        if (p.status === FULFILLED) {
            value = await p.value
            mapped[FULFILLED].push(value)
        } else if (p.status === REJECTED) {
            value = await p.reason
            mapped[REJECTED].push(value)
        }
    }

    return mapped
}

module.exports = {
    unlinkWithError,
    createSubmitError,
    allSettled,

    FULFILLED,
    REJECTED,
}