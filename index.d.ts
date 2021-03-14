import {
    Sharp,
} from 'sharp'
import { RequestHandler } from 'express';

declare global {
    namespace Express {
        interface Request {
            /** Image metadata if **imageFieldName** is a string */
            file: RequestImage;
            /**
             * Array of images metadata if **imageFieldName** is an array
             */
            files: RequestImage[];
        }
    }
}

interface RequestImage {
    /**File fieldname in form */
    fieldname: string;
    /**Destination of tha file */
    dist: string;
    /**File generated name */
    filename: string;
    /**File original name */
    originalname: string;
    /**File full path */
    path: string;
}


interface fileInfo {
    /**
     * fieldname of file.
     */
    fieldname: string;
    /**original filename on client computer */
    filename: string;
    /**Encoding of a file */
    encoding: string;
    /**Mimtype of a file */
    mimtype: string;

    /**Default calculated destination to save the file */
    defaultDest: string;
    /**Default calculated filename to save file with */
    defaultFilename: string;
    /**Default newly created sharp instance */
    defaultSharp: Sharp;
}

/**
 * Creates middleware for multipart image uploads handling
 * @param opts - options to controle upload handling behaviour
 */
declare function uploadImage(opts: {
    /**
     * Image field names to watch for in data stream. Omit, or set to `null | []` - to not expect images
     * @default [] - i.e. its not expecting any images
     */
    imageFieldNames?: string | string[] | null;
    /**
     * Image max size in bytes, details see in _busboy_ options- https://www.npmjs.com/package/busboy#busboy-methods
     */
    imageMaxSize?: number;
    /**
     * Defines where to save if image is valid. Path will be automatically created if not exists
     * @default os.tmpdir()
     */
    destination?: string | ((file: fileInfo) => string);
    /**
     * Image name to save with if image is valid
     * @default uuidv4()
     */
    filename?: string | ((file: fileInfo) => string);
    /**
     * Sharp instance creator for each new image processing
     * @default ()=>sharp()
     */
    sharp?: (file: fileInfo) => Sharp;
    /**
     * Defines, that all given image fields are required - if boolean, or which image fields are required - if array of convertables to NOT_EMPTY strings.
     * @default true
     */
    required?: boolean | string[]
    /**See _busboy_ options- https://www.npmjs.com/package/busboy#busboy-methods*/
    fields?: number;
    /**See _busboy_ options- https://www.npmjs.com/package/busboy#busboy-methods*/
    fieldNameSize?: number;
    /**See _busboy_ options- https://www.npmjs.com/package/busboy#busboy-methods*/
    fieldSize?: number;
}): RequestHandler;


export = uploadImage