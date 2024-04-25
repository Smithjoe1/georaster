(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["GeoRaster"] = factory();
	else
		root["GeoRaster"] = factory();
})(typeof self !== 'undefined' ? self : this, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 9251:
/***/ ((module, __unused_webpack___webpack_exports__, __webpack_require__) => {

"use strict";

// NAMESPACE OBJECT: ./src/worker.js
var worker_namespaceObject = {};
__webpack_require__.r(worker_namespaceObject);

// EXTERNAL MODULE: ./src_geotiff/geotiff.js + 26 modules
var geotiff = __webpack_require__(4617);
// EXTERNAL MODULE: ../../node_modules/geotiff-palette/index.js
var geotiff_palette = __webpack_require__(8286);
// EXTERNAL MODULE: ../../node_modules/calc-image-stats/dist/calc-image-stats.min.js
var calc_image_stats_min = __webpack_require__(1353);
var calc_image_stats_min_default = /*#__PURE__*/__webpack_require__.n(calc_image_stats_min);
// EXTERNAL MODULE: ./src/utils.js
var utils = __webpack_require__(2347);
;// CONCATENATED MODULE: ./src/parseData.js




function processResult(result) {
  const stats = calc_image_stats_min_default()(result.values, {
    height: result.height,
    layout: '[band][row][column]',
    noData: result.noDataValue,
    precise: false,
    stats: ['max', 'min', 'range'],
    width: result.width
  });
  result.maxs = stats.bands.map(band => band.max);
  result.mins = stats.bands.map(band => band.min);
  result.ranges = stats.bands.map(band => band.range);
  return result;
}

/* We're not using async because trying to avoid dependency on babel's polyfill
There can be conflicts when GeoRaster is used in another project that is also
using @babel/polyfill */
function parseData(data, debug) {
  return new Promise((resolve, reject) => {
    try {
      if (debug) console.log('starting parseData with', data);
      if (debug) console.log('\tGeoTIFF:', typeof GeoTIFF);
      const result = {};
      let height, width;
      if (data.rasterType === 'object') {
        result.values = data.data;
        result.height = height = data.metadata.height || result.values[0].length;
        result.width = width = data.metadata.width || result.values[0][0].length;
        result.pixelHeight = data.metadata.pixelHeight;
        result.pixelWidth = data.metadata.pixelWidth;
        result.projection = data.metadata.projection;
        result.xmin = data.metadata.xmin;
        result.ymax = data.metadata.ymax;
        result.noDataValue = data.metadata.noDataValue;
        result.numberOfRasters = result.values.length;
        result.xmax = result.xmin + result.width * result.pixelWidth;
        result.ymin = result.ymax - result.height * result.pixelHeight;
        result._data = null;
        resolve(processResult(result));
      } else if (data.rasterType === 'geotiff') {
        result._data = data.data;
        const initArgs = [data.data];
        let initFunction = geotiff.fromArrayBuffer;
        if (data.sourceType === 'url') {
          initFunction = geotiff.fromUrl;
          initArgs.push(data.options);
        } else if (data.sourceType === 'Blob') {
          initFunction = geotiff.fromBlob;
        }
        if (debug) console.log('data.rasterType is geotiff');
        resolve(initFunction(...initArgs).then(geotiff => {
          if (debug) console.log('geotiff:', geotiff);
          return geotiff.getImage().then(image => {
            try {
              if (debug) console.log('image:', image);
              const fileDirectory = image.fileDirectory;
              const {
                GeographicTypeGeoKey,
                ProjectedCSTypeGeoKey
              } = image.getGeoKeys() || {};
              result.projection = ProjectedCSTypeGeoKey || GeographicTypeGeoKey || data.metadata.projection;
              if (debug) console.log('projection:', result.projection);
              result.height = height = image.getHeight();
              if (debug) console.log('result.height:', result.height);
              result.width = width = image.getWidth();
              if (debug) console.log('result.width:', result.width);
              const [resolutionX, resolutionY] = image.getResolution();
              result.pixelHeight = Math.abs(resolutionY);
              result.pixelWidth = Math.abs(resolutionX);
              const [originX, originY] = image.getOrigin();
              result.xmin = originX;
              result.xmax = result.xmin + width * result.pixelWidth;
              result.ymax = originY;
              result.ymin = result.ymax - height * result.pixelHeight;
              result.noDataValue = fileDirectory.GDAL_NODATA ? parseFloat(fileDirectory.GDAL_NODATA) : null;
              result.numberOfRasters = fileDirectory.SamplesPerPixel;
              if (fileDirectory.ColorMap) {
                result.palette = (0,geotiff_palette.getPalette)(image);
              }
              if (!data.readOnDemand) {
                return image.readRasters().then(rasters => {
                  result.values = rasters.map(valuesInOneDimension => {
                    return (0,utils.unflatten)(valuesInOneDimension, {
                      height,
                      width
                    });
                  });
                  return processResult(result);
                });
              } else {
                result._geotiff = geotiff;
                return result;
              }
            } catch (error) {
              reject(error);
              console.error('[georaster] error parsing georaster:', error);
            }
          });
        }));
      }
    } catch (error) {
      reject(error);
      console.error('[georaster] error parsing georaster:', error);
    }
  });
}
;// CONCATENATED MODULE: ./src/worker.js


// this is a bit of a hack to trick geotiff to work with web worker
// eslint-disable-next-line no-unused-vars
const worker_window = (/* unused pure expression or super */ null && (self));
onmessage = e => {
  const data = e.data;
  parseData(data).then(result => {
    const transferBuffers = [];
    if (result.values) {
      let last;
      result.values.forEach(a => a.forEach(_ref => {
        let {
          buffer
        } = _ref;
        if (buffer instanceof ArrayBuffer && buffer !== last) {
          transferBuffers.push(buffer);
          last = buffer;
        }
      }));
    }
    if (result._data instanceof ArrayBuffer) {
      transferBuffers.push(result._data);
    }
    postMessage(result, transferBuffers);
    close();
  }).catch(error => {
    postMessage({
      error
    });
    close();
  });
};
;// CONCATENATED MODULE: ../../node_modules/georaster-to-canvas/index.js
/* global ImageData */

function toImageData(georaster, canvasWidth, canvasHeight) {
  if (georaster.values) {
    const { noDataValue, mins, ranges, values } = georaster;
    const numBands = values.length;
    const xRatio = georaster.width / canvasWidth;
    const yRatio = georaster.height / canvasHeight;
    const data = new Uint8ClampedArray(canvasWidth * canvasHeight * 4);
    for (let rowIndex = 0; rowIndex < canvasHeight; rowIndex++) {
      for (let columnIndex = 0; columnIndex < canvasWidth; columnIndex++) {
        const rasterRowIndex = Math.round(rowIndex * yRatio);
        const rasterColumnIndex = Math.round(columnIndex * xRatio);
        const pixelValues = values.map(band => {
          try {
            return band[rasterRowIndex][rasterColumnIndex];
          } catch (error) {
            console.error(error);
          }
        });
        const haveDataForAllBands = pixelValues.every(value => value !== undefined && value !== noDataValue);
        if (haveDataForAllBands) {
          const i = (rowIndex * (canvasWidth * 4)) + 4 * columnIndex;
          if (numBands === 1) {
            const pixelValue = Math.round(pixelValues[0]);
            const scaledPixelValue = Math.round((pixelValue - mins[0]) / ranges[0] * 255);
            data[i] = scaledPixelValue;
            data[i + 1] = scaledPixelValue;
            data[i + 2] = scaledPixelValue;
            data[i + 3] = 255;
          } else if (numBands === 3) {
            try {
              const [r, g, b] = pixelValues;
              data[i] = r;
              data[i + 1] = g;
              data[i + 2] = b;
              data[i + 3] = 255;
            } catch (error) {
              console.error(error);
            }
          } else if (numBands === 4) {
            try {
              const [r, g, b, a] = pixelValues;
              data[i] = r;
              data[i + 1] = g;
              data[i + 2] = b;
              data[i + 3] = a;
            } catch (error) {
              console.error(error);
            }
          }
        }
      }
    }
    return new ImageData(data, canvasWidth, canvasHeight);
  }
}

function toCanvas(georaster, options) {
  if (typeof ImageData === "undefined") {
    throw `toCanvas is not supported in your environment`;
  } else {
    const canvas = document.createElement("CANVAS");
    const canvasHeight = options && options.height ? Math.min(georaster.height, options.height) : Math.min(georaster.height, 100);
    const canvasWidth = options && options.width ? Math.min(georaster.width, options.width) : Math.min(georaster.width, 100);
    canvas.height = canvasHeight;
    canvas.width = canvasWidth;
    canvas.style.minHeight = "200px";
    canvas.style.minWidth = "400px";
    canvas.style.maxWidth = "100%";
    const context = canvas.getContext("2d");
    const imageData = toImageData(georaster, canvasWidth, canvasHeight);
    context.putImageData(imageData, 0, 0);
    return canvas;
  }
}


;// CONCATENATED MODULE: ./src/index.js
/* module decorator */ module = __webpack_require__.hmd(module);


/* global Blob */
/* global URL */

//import fetch from 'cross-fetch';





function urlExists(url) {
  try {
    return fetch(url, {
      method: 'HEAD'
    }).then(response => response.status === 200).catch(error => false);
  } catch (error) {
    return Promise.resolve(false);
  }
}
function getValues(geotiff, options) {
  const {
    left,
    top,
    right,
    bottom,
    width,
    height,
    resampleMethod
  } = options;
  //const {left, top, right, bottom, width, height, resampleMethod, resampleSteps} = options;
  // note this.image and this.geotiff both have a readRasters method;
  // they are not the same thing. use this.geotiff for experimental version
  // that reads from best overview
  return geotiff.readRasters({
    window: [left, top, right, bottom],
    width: width,
    height: height,
    resampleMethod: resampleMethod || 'bilinear'
  }).then(rasters => {
    /*
      The result appears to be an array with a width and height property set.
      We only need the values, assuming the user remembers the width and height.
      Ex: [[0,27723,...11025,12924], width: 10, height: 10]
    */
    return rasters.map(raster => (0,utils.unflatten)(raster, {
      height,
      width
    }));
  });
}
;
class GeoRaster {
  constructor(data, metadata, debug) {
    let options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    if (debug) console.log('starting GeoRaster.constructor with', data, metadata);
    this._web_worker_is_available = typeof worker_namespaceObject["default"] !== 'undefined';
    this._blob_is_available = typeof Blob !== 'undefined';
    this._url_is_available = typeof URL !== 'undefined';
    this._options = options;

    // check if should convert to buffer
    if (typeof data === 'object' && data.constructor && data.constructor.name === 'Buffer' && Buffer.isBuffer(data) === false) {
      data = new Buffer(data);
    }
    this.readOnDemand = false;
    if (typeof data === 'string') {
      if (debug) console.log('data is a url');
      this._data = data;
      this._url = data;
      this.rasterType = 'geotiff';
      this.sourceType = 'url';
      this.readOnDemand = true;
    } else if (typeof Blob !== 'undefined' && data instanceof Blob) {
      this._data = data;
      this.rasterType = 'geotiff';
      this.sourceType = 'Blob';
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
      // this is node
      if (debug) console.log('data is a buffer');
      this._data = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      this.rasterType = 'geotiff';
      this.sourceType = 'Buffer';
    } else if (data instanceof ArrayBuffer) {
      // this is browser
      this._data = data;
      this.rasterType = 'geotiff';
      this.sourceType = 'ArrayBuffer';
      this._metadata = metadata;
    } else if (Array.isArray(data) && metadata) {
      this._data = data;
      this.rasterType = 'object';
      this._metadata = metadata;
    }
    if (metadata && metadata.readOnDemand !== undefined) {
      this.readOnDemand = metadata.readOnDemand;
    }
    if (debug) console.log('this after construction:', this);
  }
  preinitialize(debug) {
    if (debug) console.log('starting preinitialize');
    if (this._url) {
      // initialize these outside worker to avoid weird worker error
      // I don't see how cache option is passed through with fromUrl,
      // though constantinius says it should work: https://github.com/geotiffjs/geotiff.js/issues/61
      const ovrURL = this._url + '.ovr';
      return urlExists(ovrURL).then(ovrExists => {
        if (debug) console.log('overview exists:', ovrExists);
        this._options = Object.assign({}, {
          cache: true,
          forceXHR: false
        }, this._options);
        if (debug) console.log('options:', this._options);
        if (ovrExists) {
          return (0,geotiff.fromUrls)(this._url, [ovrURL], this._options);
        } else {
          return (0,geotiff.fromUrl)(this._url, this._options);
        }
      });
    } else {
      // no pre-initialization steps required if not using a Cloud Optimized GeoTIFF
      return Promise.resolve();
    }
  }
  initialize(debug) {
    return this.preinitialize(debug).then(geotiff => {
      return new Promise((resolve, reject) => {
        if (debug) console.log('starting GeoRaster.initialize');
        if (debug) console.log('this', this);
        if (this.rasterType === 'object' || this.rasterType === 'geotiff' || this.rasterType === 'tiff') {
          const parseDataArgs = {
            data: this._data,
            options: this._options,
            rasterType: this.rasterType,
            sourceType: this.sourceType,
            readOnDemand: this.readOnDemand,
            metadata: this._metadata
          };
          const parseDataDone = data => {
            for (const key in data) {
              this[key] = data[key];
            }
            if (this.readOnDemand) {
              if (this._url) this._geotiff = geotiff;
              this.getValues = function (options) {
                return getValues(this._geotiff, options);
              };
            }
            this.toCanvas = function (options) {
              return toCanvas(this, options);
            };
            resolve(this);
          };
          if (this._web_worker_is_available && !this.readOnDemand) {
            const worker = new worker_namespaceObject["default"](); // Replace 'worker.js' with the path to your worker file
            worker.onmessage = e => {
              if (debug) console.log('main thread received message:', e);
              if (e.data.error) reject(e.data.error);else parseDataDone(e.data);
            };
            worker.onerror = e => {
              if (debug) console.log('main thread received error:', e);
              reject(e);
            };
            if (debug) console.log('about to postMessage');
            if (this._data instanceof ArrayBuffer) {
              worker.postMessage(parseDataArgs, [this._data]);
            } else {
              worker.postMessage(parseDataArgs);
            }
          } else {
            if (debug && !this._web_worker_is_available) console.log('web worker is not available');
            parseData(parseDataArgs, debug).then(result => {
              if (debug) console.log('result:', result);
              parseDataDone(result);
            }).catch(reject);
          }
        } else {
          reject('couldn\'t find a way to parse');
        }
      });
    });
  }
}
const parseGeoraster = function (input, metadata, debug) {
  let options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  if (debug) console.log('starting parseGeoraster with ', input, metadata);
  if (input === undefined) {
    const errorMessage = '[Georaster.parseGeoraster] Error. You passed in undefined to parseGeoraster. We can\'t make a raster out of nothing!';
    throw Error(errorMessage);
  }
  return new GeoRaster(input, metadata, debug, options).initialize(debug);
};
if ( true && typeof module.exports !== 'undefined') {
  module.exports = parseGeoraster;
}

/*
    The following code allows you to use GeoRaster without requiring
*/

if (typeof window !== 'undefined') {
  window['parseGeoraster'] = parseGeoraster;
} else if (typeof self !== 'undefined') {
  self['parseGeoraster'] = parseGeoraster; // jshint ignore:line
}

/***/ }),

/***/ 2347:
/***/ ((module) => {

function countIn1D(array) {
  return array.reduce((counts, value) => {
    if (counts[value] === undefined) {
      counts[value] = 1;
    } else {
      counts[value]++;
    }
    return counts;
  }, {});
}
function countIn2D(rows) {
  return rows.reduce((counts, values) => {
    values.forEach(value => {
      if (counts[value] === undefined) {
        counts[value] = 1;
      } else {
        counts[value]++;
      }
    });
    return counts;
  }, {});
}

/*
Takes in a flattened one dimensional typed array
representing two-dimensional pixel values
and returns an array of typed arrays with the same buffer.
*/
function unflatten(valuesInOneDimension, size) {
  const {
    height,
    width
  } = size;
  const valuesInTwoDimensions = [];
  for (let y = 0; y < height; y++) {
    const start = y * width;
    const end = start + width;
    valuesInTwoDimensions.push(valuesInOneDimension.subarray(start, end));
  }
  return valuesInTwoDimensions;
}
module.exports = {
  countIn1D,
  countIn2D,
  unflatten
};

/***/ }),

/***/ 3668:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  A: () => (/* binding */ BaseDecoder)
});

;// CONCATENATED MODULE: ./src_geotiff/predictor.js
function decodeRowAcc(row, stride) {
  let length = row.length - stride;
  let offset = 0;
  do {
    for (let i = stride; i > 0; i--) {
      row[offset + stride] += row[offset];
      offset++;
    }
    length -= stride;
  } while (length > 0);
}
function decodeRowFloatingPoint(row, stride, bytesPerSample) {
  let index = 0;
  let count = row.length;
  const wc = count / bytesPerSample;
  while (count > stride) {
    for (let i = stride; i > 0; --i) {
      row[index + stride] += row[index];
      ++index;
    }
    count -= stride;
  }
  const copy = row.slice();
  for (let i = 0; i < wc; ++i) {
    for (let b = 0; b < bytesPerSample; ++b) {
      row[bytesPerSample * i + b] = copy[(bytesPerSample - b - 1) * wc + i];
    }
  }
}
function applyPredictor(block, predictor, width, height, bitsPerSample, planarConfiguration) {
  if (!predictor || predictor === 1) {
    return block;
  }
  for (let i = 0; i < bitsPerSample.length; ++i) {
    if (bitsPerSample[i] % 8 !== 0) {
      throw new Error('When decoding with predictor, only multiple of 8 bits are supported.');
    }
    if (bitsPerSample[i] !== bitsPerSample[0]) {
      throw new Error('When decoding with predictor, all samples must have the same size.');
    }
  }
  const bytesPerSample = bitsPerSample[0] / 8;
  const stride = planarConfiguration === 2 ? 1 : bitsPerSample.length;
  for (let i = 0; i < height; ++i) {
    // Last strip will be truncated if height % stripHeight != 0
    if (i * stride * width * bytesPerSample >= block.byteLength) {
      break;
    }
    let row;
    if (predictor === 2) {
      // horizontal prediction
      switch (bitsPerSample[0]) {
        case 8:
          row = new Uint8Array(block, i * stride * width * bytesPerSample, stride * width * bytesPerSample);
          break;
        case 16:
          row = new Uint16Array(block, i * stride * width * bytesPerSample, stride * width * bytesPerSample / 2);
          break;
        case 32:
          row = new Uint32Array(block, i * stride * width * bytesPerSample, stride * width * bytesPerSample / 4);
          break;
        default:
          throw new Error(`Predictor 2 not allowed with ${bitsPerSample[0]} bits per sample.`);
      }
      decodeRowAcc(row, stride, bytesPerSample);
    } else if (predictor === 3) {
      // horizontal floating point
      row = new Uint8Array(block, i * stride * width * bytesPerSample, stride * width * bytesPerSample);
      decodeRowFloatingPoint(row, stride, bytesPerSample);
    }
  }
  return block;
}
;// CONCATENATED MODULE: ./src_geotiff/compression/basedecoder.js

class BaseDecoder {
  async decode(fileDirectory, buffer) {
    const decoded = await this.decodeBlock(buffer);
    const predictor = fileDirectory.Predictor || 1;
    if (predictor !== 1) {
      const isTiled = !fileDirectory.StripOffsets;
      const tileWidth = isTiled ? fileDirectory.TileWidth : fileDirectory.ImageWidth;
      const tileHeight = isTiled ? fileDirectory.TileLength : fileDirectory.RowsPerStrip || fileDirectory.ImageLength;
      return applyPredictor(decoded, predictor, tileWidth, tileHeight, fileDirectory.BitsPerSample, fileDirectory.PlanarConfiguration);
    }
    return decoded;
  }
}

/***/ }),

/***/ 9594:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   E: () => (/* binding */ addDecoder),
/* harmony export */   f: () => (/* binding */ getDecoder)
/* harmony export */ });
const registry = new Map();
function addDecoder(cases, importFn) {
  if (!Array.isArray(cases)) {
    cases = [cases]; // eslint-disable-line no-param-reassign
  }
  cases.forEach(c => registry.set(c, importFn));
}
async function getDecoder(fileDirectory) {
  const importFn = registry.get(fileDirectory.Compression);
  if (!importFn) {
    throw new Error(`Unknown compression method identifier: ${fileDirectory.Compression}`);
  }
  const Decoder = await importFn();
  return new Decoder(fileDirectory);
}

// Add default decoders to registry (end-user may override with other implementations)
addDecoder([undefined, 1], () => __webpack_require__.e(/* import() */ 888).then(__webpack_require__.bind(__webpack_require__, 9888)).then(m => m.default));
addDecoder(5, () => __webpack_require__.e(/* import() */ 665).then(__webpack_require__.bind(__webpack_require__, 7665)).then(m => m.default));
addDecoder(6, () => {
  throw new Error('old style JPEG compression is not supported.');
});
addDecoder(7, () => __webpack_require__.e(/* import() */ 42).then(__webpack_require__.bind(__webpack_require__, 5042)).then(m => m.default));
addDecoder([8, 32946], () => Promise.all(/* import() */[__webpack_require__.e(668), __webpack_require__.e(417)]).then(__webpack_require__.bind(__webpack_require__, 3417)).then(m => m.default));
addDecoder(32773, () => __webpack_require__.e(/* import() */ 913).then(__webpack_require__.bind(__webpack_require__, 7913)).then(m => m.default));
addDecoder(34887, () => Promise.all(/* import() */[__webpack_require__.e(668), __webpack_require__.e(156), __webpack_require__.e(18)]).then(__webpack_require__.bind(__webpack_require__, 1084)).then(async m => {
  await m.zstd.init();
  return m;
}).then(m => m.default));
addDecoder(50001, () => __webpack_require__.e(/* import() */ 135).then(__webpack_require__.bind(__webpack_require__, 7135)).then(m => m.default));

/***/ }),

/***/ 4617:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  BaseClient: () => (/* reexport */ BaseClient),
  BaseDecoder: () => (/* reexport */ basedecoder/* default */.A),
  BaseResponse: () => (/* reexport */ BaseResponse),
  GeoTIFF: () => (/* binding */ GeoTIFF),
  GeoTIFFImage: () => (/* reexport */ geotiffimage),
  MultiGeoTIFF: () => (/* binding */ MultiGeoTIFF),
  Pool: () => (/* reexport */ pool),
  addDecoder: () => (/* reexport */ compression/* addDecoder */.E),
  "default": () => (/* binding */ geotiff),
  fromArrayBuffer: () => (/* binding */ fromArrayBuffer),
  fromBlob: () => (/* binding */ fromBlob),
  fromCustomClient: () => (/* binding */ fromCustomClient),
  fromFile: () => (/* binding */ fromFile),
  fromUrl: () => (/* binding */ fromUrl),
  fromUrls: () => (/* binding */ fromUrls),
  getDecoder: () => (/* reexport */ compression/* getDecoder */.f),
  globals: () => (/* reexport */ globals),
  rgb: () => (/* reexport */ rgb_namespaceObject),
  setLogger: () => (/* reexport */ setLogger),
  writeArrayBuffer: () => (/* binding */ writeArrayBuffer)
});

// NAMESPACE OBJECT: ./src_geotiff/rgb.js
var rgb_namespaceObject = {};
__webpack_require__.r(rgb_namespaceObject);
__webpack_require__.d(rgb_namespaceObject, {
  fromBlackIsZero: () => (fromBlackIsZero),
  fromCIELab: () => (fromCIELab),
  fromCMYK: () => (fromCMYK),
  fromPalette: () => (fromPalette),
  fromWhiteIsZero: () => (fromWhiteIsZero),
  fromYCbCr: () => (fromYCbCr)
});

;// CONCATENATED MODULE: ./node_modules/@petamoriken/float16/src/_util/messages.mjs
const THIS_IS_NOT_AN_OBJECT = "This is not an object";
const THIS_IS_NOT_A_FLOAT16ARRAY_OBJECT = "This is not a Float16Array object";
const THIS_CONSTRUCTOR_IS_NOT_A_SUBCLASS_OF_FLOAT16ARRAY =
  "This constructor is not a subclass of Float16Array";
const THE_CONSTRUCTOR_PROPERTY_VALUE_IS_NOT_AN_OBJECT =
  "The constructor property value is not an object";
const SPECIES_CONSTRUCTOR_DIDNT_RETURN_TYPEDARRAY_OBJECT =
  "Species constructor didn't return TypedArray object";
const DERIVED_CONSTRUCTOR_CREATED_TYPEDARRAY_OBJECT_WHICH_WAS_TOO_SMALL_LENGTH =
  "Derived constructor created TypedArray object which was too small length";
const ATTEMPTING_TO_ACCESS_DETACHED_ARRAYBUFFER =
  "Attempting to access detached ArrayBuffer";
const CANNOT_CONVERT_UNDEFINED_OR_NULL_TO_OBJECT =
  "Cannot convert undefined or null to object";
const CANNOT_MIX_BIGINT_AND_OTHER_TYPES =
  "Cannot mix BigInt and other types, use explicit conversions";
const ITERATOR_PROPERTY_IS_NOT_CALLABLE = "@@iterator property is not callable";
const REDUCE_OF_EMPTY_ARRAY_WITH_NO_INITIAL_VALUE =
  "Reduce of empty array with no initial value";
const THE_COMPARISON_FUNCTION_MUST_BE_EITHER_A_FUNCTION_OR_UNDEFINED =
  "The comparison function must be either a function or undefined";
const OFFSET_IS_OUT_OF_BOUNDS = "Offset is out of bounds";

;// CONCATENATED MODULE: ./node_modules/@petamoriken/float16/src/_util/primordials.mjs
/* eslint-disable no-restricted-globals, no-restricted-syntax */
/* global SharedArrayBuffer */



/** @type {<T extends (...args: any) => any>(target: T) => (thisArg: ThisType<T>, ...args: any[]) => any} */
function uncurryThis(target) {
  return (thisArg, ...args) => {
    return ReflectApply(target, thisArg, args);
  };
}

/** @type {(target: any, key: string | symbol) => (thisArg: any, ...args: any[]) => any} */
function uncurryThisGetter(target, key) {
  return uncurryThis(
    ReflectGetOwnPropertyDescriptor(
      target,
      key
    ).get
  );
}

// Reflect
const {
  apply: ReflectApply,
  construct: ReflectConstruct,
  defineProperty: ReflectDefineProperty,
  get: ReflectGet,
  getOwnPropertyDescriptor: ReflectGetOwnPropertyDescriptor,
  getPrototypeOf: ReflectGetPrototypeOf,
  has: ReflectHas,
  ownKeys: ReflectOwnKeys,
  set: ReflectSet,
  setPrototypeOf: ReflectSetPrototypeOf,
} = Reflect;

// Proxy
const NativeProxy = (/* unused pure expression or super */ null && (Proxy));

// Number
const {
  EPSILON,
  MAX_SAFE_INTEGER,
  isFinite: primordials_NumberIsFinite,
  isNaN: primordials_NumberIsNaN,
} = Number;

// Symbol
const {
  iterator: SymbolIterator,
  species: SymbolSpecies,
  toStringTag: SymbolToStringTag,
  for: SymbolFor,
} = Symbol;

// Object
const NativeObject = Object;
const {
  create: primordials_ObjectCreate,
  defineProperty: ObjectDefineProperty,
  freeze: ObjectFreeze,
  is: ObjectIs,
} = NativeObject;
const ObjectPrototype = NativeObject.prototype;
/** @type {(object: object, key: PropertyKey) => Function | undefined} */
const ObjectPrototype__lookupGetter__ = /** @type {any} */ (ObjectPrototype).__lookupGetter__
  ? uncurryThis(/** @type {any} */ (ObjectPrototype).__lookupGetter__)
  : (object, key) => {
    if (object == null) {
      throw NativeTypeError(
        CANNOT_CONVERT_UNDEFINED_OR_NULL_TO_OBJECT
      );
    }

    let target = NativeObject(object);
    do {
      const descriptor = ReflectGetOwnPropertyDescriptor(target, key);
      if (descriptor !== undefined) {
        if (ObjectHasOwn(descriptor, "get")) {
          return descriptor.get;
        }

        return;
      }
    } while ((target = ReflectGetPrototypeOf(target)) !== null);
  };
/** @type {(object: object, key: PropertyKey) => boolean} */
const ObjectHasOwn = /** @type {any} */ (NativeObject).hasOwn ||
  uncurryThis(ObjectPrototype.hasOwnProperty);

// Array
const NativeArray = Array;
const ArrayIsArray = NativeArray.isArray;
const ArrayPrototype = NativeArray.prototype;
/** @type {(array: ArrayLike<unknown>, separator?: string) => string} */
const ArrayPrototypeJoin = uncurryThis(ArrayPrototype.join);
/** @type {<T>(array: T[], ...items: T[]) => number} */
const ArrayPrototypePush = uncurryThis(ArrayPrototype.push);
/** @type {(array: ArrayLike<unknown>, ...opts: any[]) => string} */
const ArrayPrototypeToLocaleString = uncurryThis(
  ArrayPrototype.toLocaleString
);
const NativeArrayPrototypeSymbolIterator = ArrayPrototype[SymbolIterator];
/** @type {<T>(array: T[]) => IterableIterator<T>} */
const ArrayPrototypeSymbolIterator = uncurryThis(NativeArrayPrototypeSymbolIterator);

// Math
const {
  abs: primordials_MathAbs,
  trunc: MathTrunc,
} = Math;

// ArrayBuffer
const NativeArrayBuffer = ArrayBuffer;
const ArrayBufferIsView = NativeArrayBuffer.isView;
const ArrayBufferPrototype = NativeArrayBuffer.prototype;
/** @type {(buffer: ArrayBuffer, begin?: number, end?: number) => number} */
const ArrayBufferPrototypeSlice = uncurryThis(ArrayBufferPrototype.slice);
/** @type {(buffer: ArrayBuffer) => ArrayBuffer} */
const ArrayBufferPrototypeGetByteLength = uncurryThisGetter(ArrayBufferPrototype, "byteLength");

// SharedArrayBuffer
const NativeSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined" ? SharedArrayBuffer : null;
/** @type {(buffer: SharedArrayBuffer) => SharedArrayBuffer} */
const SharedArrayBufferPrototypeGetByteLength = NativeSharedArrayBuffer
  && uncurryThisGetter(NativeSharedArrayBuffer.prototype, "byteLength");

// TypedArray
/** @typedef {Uint8Array|Uint8ClampedArray|Uint16Array|Uint32Array|Int8Array|Int16Array|Int32Array|Float32Array|Float64Array|BigUint64Array|BigInt64Array} TypedArray */
/** @type {any} */
const TypedArray = ReflectGetPrototypeOf(Uint8Array);
const TypedArrayFrom = TypedArray.from;
const TypedArrayPrototype = TypedArray.prototype;
const NativeTypedArrayPrototypeSymbolIterator = TypedArrayPrototype[SymbolIterator];
/** @type {(typedArray: TypedArray) => IterableIterator<number>} */
const TypedArrayPrototypeKeys = uncurryThis(TypedArrayPrototype.keys);
/** @type {(typedArray: TypedArray) => IterableIterator<number>} */
const TypedArrayPrototypeValues = uncurryThis(
  TypedArrayPrototype.values
);
/** @type {(typedArray: TypedArray) => IterableIterator<[number, number]>} */
const TypedArrayPrototypeEntries = uncurryThis(
  TypedArrayPrototype.entries
);
/** @type {(typedArray: TypedArray, array: ArrayLike<number>, offset?: number) => void} */
const TypedArrayPrototypeSet = uncurryThis(TypedArrayPrototype.set);
/** @type {<T extends TypedArray>(typedArray: T) => T} */
const TypedArrayPrototypeReverse = uncurryThis(
  TypedArrayPrototype.reverse
);
/** @type {<T extends TypedArray>(typedArray: T, value: number, start?: number, end?: number) => T} */
const TypedArrayPrototypeFill = uncurryThis(TypedArrayPrototype.fill);
/** @type {<T extends TypedArray>(typedArray: T, target: number, start: number, end?: number) => T} */
const TypedArrayPrototypeCopyWithin = uncurryThis(
  TypedArrayPrototype.copyWithin
);
/** @type {<T extends TypedArray>(typedArray: T, compareFn?: (a: number, b: number) => number) => T} */
const TypedArrayPrototypeSort = uncurryThis(TypedArrayPrototype.sort);
/** @type {<T extends TypedArray>(typedArray: T, start?: number, end?: number) => T} */
const TypedArrayPrototypeSlice = uncurryThis(TypedArrayPrototype.slice);
/** @type {<T extends TypedArray>(typedArray: T, start?: number, end?: number) => T} */
const TypedArrayPrototypeSubarray = uncurryThis(
  TypedArrayPrototype.subarray
);
/** @type {((typedArray: TypedArray) => ArrayBuffer)} */
const TypedArrayPrototypeGetBuffer = uncurryThisGetter(
  TypedArrayPrototype,
  "buffer"
);
/** @type {((typedArray: TypedArray) => number)} */
const TypedArrayPrototypeGetByteOffset = uncurryThisGetter(
  TypedArrayPrototype,
  "byteOffset"
);
/** @type {((typedArray: TypedArray) => number)} */
const TypedArrayPrototypeGetLength = uncurryThisGetter(
  TypedArrayPrototype,
  "length"
);
/** @type {(target: unknown) => string} */
const TypedArrayPrototypeGetSymbolToStringTag = uncurryThisGetter(
  TypedArrayPrototype,
  SymbolToStringTag
);

// Uint8Array
const NativeUint8Array = Uint8Array;

// Uint16Array
const NativeUint16Array = Uint16Array;
/** @type {Uint16ArrayConstructor["from"]} */
const Uint16ArrayFrom = (...args) => {
  return ReflectApply(TypedArrayFrom, NativeUint16Array, args);
};

// Uint32Array
const NativeUint32Array = Uint32Array;

// Float32Array
const NativeFloat32Array = Float32Array;

// ArrayIterator
/** @type {any} */
const ArrayIteratorPrototype = ReflectGetPrototypeOf([][SymbolIterator]());
/** @type {<T>(arrayIterator: IterableIterator<T>) => IteratorResult<T>} */
const ArrayIteratorPrototypeNext = uncurryThis(ArrayIteratorPrototype.next);

// Generator
/** @type {<T = unknown, TReturn = any, TNext = unknown>(generator: Generator<T, TReturn, TNext>, value?: TNext) => T} */
const GeneratorPrototypeNext = uncurryThis((function* () {})().next);

// Iterator
const IteratorPrototype = ReflectGetPrototypeOf(ArrayIteratorPrototype);

// DataView
const DataViewPrototype = DataView.prototype;
/** @type {(dataView: DataView, byteOffset: number, littleEndian?: boolean) => number} */
const DataViewPrototypeGetUint16 = uncurryThis(
  DataViewPrototype.getUint16
);
/** @type {(dataView: DataView, byteOffset: number, value: number, littleEndian?: boolean) => void} */
const primordials_DataViewPrototypeSetUint16 = uncurryThis(
  DataViewPrototype.setUint16
);

// Error
const NativeTypeError = TypeError;
const NativeRangeError = (/* unused pure expression or super */ null && (RangeError));

// WeakSet
/**
 * Do not construct with arguments to avoid calling the "add" method
 * @type {{new <T extends {}>(): WeakSet<T>}}
 */
const NativeWeakSet = WeakSet;
const WeakSetPrototype = NativeWeakSet.prototype;
/** @type {<T extends {}>(set: WeakSet<T>, value: T) => Set<T>} */
const WeakSetPrototypeAdd = uncurryThis(WeakSetPrototype.add);
/** @type {<T extends {}>(set: WeakSet<T>, value: T) => boolean} */
const WeakSetPrototypeHas = uncurryThis(WeakSetPrototype.has);

// WeakMap
/**
 * Do not construct with arguments to avoid calling the "set" method
 * @type {{new <K extends {}, V>(): WeakMap<K, V>}}
 */
const NativeWeakMap = WeakMap;
const WeakMapPrototype = NativeWeakMap.prototype;
/** @type {<K extends {}, V>(weakMap: WeakMap<K, V>, key: K) => V} */
const WeakMapPrototypeGet = uncurryThis(WeakMapPrototype.get);
/** @type {<K extends {}, V>(weakMap: WeakMap<K, V>, key: K) => boolean} */
const WeakMapPrototypeHas = uncurryThis(WeakMapPrototype.has);
/** @type {<K extends {}, V>(weakMap: WeakMap<K, V>, key: K, value: V) => WeakMap} */
const primordials_WeakMapPrototypeSet = uncurryThis(WeakMapPrototype.set);

;// CONCATENATED MODULE: ./node_modules/@petamoriken/float16/src/_util/arrayIterator.mjs


/** @type {WeakMap<{}, IterableIterator<any>>} */
const arrayIterators = new NativeWeakMap();

const SafeIteratorPrototype = primordials_ObjectCreate(null, {
  next: {
    value: function next() {
      const arrayIterator = WeakMapPrototypeGet(arrayIterators, this);
      return ArrayIteratorPrototypeNext(arrayIterator);
    },
  },

  [SymbolIterator]: {
    value: function values() {
      return this;
    },
  },
});

/**
 * Wrap the Array around the SafeIterator If Array.prototype [@@iterator] has been modified
 * @type {<T>(array: T[]) => Iterable<T>}
 */
function arrayIterator_safeIfNeeded(array) {
  if (
    array[SymbolIterator] === NativeArrayPrototypeSymbolIterator &&
    ArrayIteratorPrototype.next === ArrayIteratorPrototypeNext
  ) {
    return array;
  }

  const safe = primordials_ObjectCreate(SafeIteratorPrototype);
  primordials_WeakMapPrototypeSet(arrayIterators, safe, ArrayPrototypeSymbolIterator(array));
  return safe;
}

/** @type {WeakMap<{}, Generator<any>>} */
const generators = new NativeWeakMap();

/** @see https://tc39.es/ecma262/#sec-%arrayiteratorprototype%-object */
const DummyArrayIteratorPrototype = primordials_ObjectCreate(IteratorPrototype, {
  next: {
    value: function next() {
      const generator = WeakMapPrototypeGet(generators, this);
      return GeneratorPrototypeNext(generator);
    },
    writable: true,
    configurable: true,
  },
});

for (const key of ReflectOwnKeys(ArrayIteratorPrototype)) {
  // next method has already defined
  if (key === "next") {
    continue;
  }

  // Copy ArrayIteratorPrototype descriptors to DummyArrayIteratorPrototype
  ObjectDefineProperty(DummyArrayIteratorPrototype, key, ReflectGetOwnPropertyDescriptor(ArrayIteratorPrototype, key));
}

/**
 * Wrap the Generator around the dummy ArrayIterator
 * @type {<T>(generator: Generator<T>) => IterableIterator<T>}
 */
function wrap(generator) {
  const dummy = ObjectCreate(DummyArrayIteratorPrototype);
  WeakMapPrototypeSet(generators, dummy, generator);
  return dummy;
}

;// CONCATENATED MODULE: ./node_modules/@petamoriken/float16/src/_util/converter.mjs


const INVERSE_OF_EPSILON = 1 / EPSILON;

/**
 * rounds to the nearest value;
 * if the number falls midway, it is rounded to the nearest value with an even least significant digit
 * @param {number} num
 * @returns {number}
 */
function roundTiesToEven(num) {
  return (num + INVERSE_OF_EPSILON) - INVERSE_OF_EPSILON;
}

const FLOAT16_MIN_VALUE = 6.103515625e-05;
const FLOAT16_MAX_VALUE = 65504;
const FLOAT16_EPSILON = 0.0009765625;

const FLOAT16_EPSILON_MULTIPLIED_BY_FLOAT16_MIN_VALUE = FLOAT16_EPSILON * FLOAT16_MIN_VALUE;
const FLOAT16_EPSILON_DEVIDED_BY_EPSILON = FLOAT16_EPSILON * INVERSE_OF_EPSILON;

/**
 * round a number to a half float number
 * @param {unknown} num - double float
 * @returns {number} half float number
 */
function roundToFloat16(num) {
  const number = +num;

  // NaN, Infinity, -Infinity, 0, -0
  if (!NumberIsFinite(number) || number === 0) {
    return number;
  }

  // finite except 0, -0
  const sign = number > 0 ? 1 : -1;
  const absolute = MathAbs(number);

  // small number
  if (absolute < FLOAT16_MIN_VALUE) {
    return sign * roundTiesToEven(absolute / FLOAT16_EPSILON_MULTIPLIED_BY_FLOAT16_MIN_VALUE) * FLOAT16_EPSILON_MULTIPLIED_BY_FLOAT16_MIN_VALUE;
  }

  const temp = (1 + FLOAT16_EPSILON_DEVIDED_BY_EPSILON) * absolute;
  const result = temp - (temp - absolute);

  // large number
  if (result > FLOAT16_MAX_VALUE || NumberIsNaN(result)) {
    return sign * Infinity;
  }

  return sign * result;
}

// base algorithm: http://fox-toolkit.org/ftp/fasthalffloatconversion.pdf

const buffer = new NativeArrayBuffer(4);
const floatView = new NativeFloat32Array(buffer);
const uint32View = new NativeUint32Array(buffer);

const baseTable = new NativeUint16Array(512);
const shiftTable = new NativeUint8Array(512);

for (let i = 0; i < 256; ++i) {
  const e = i - 127;

  // very small number (0, -0)
  if (e < -27) {
    baseTable[i]         = 0x0000;
    baseTable[i | 0x100] = 0x8000;
    shiftTable[i]         = 24;
    shiftTable[i | 0x100] = 24;

  // small number (denorm)
  } else if (e < -14) {
    baseTable[i]         =  0x0400 >> (-e - 14);
    baseTable[i | 0x100] = (0x0400 >> (-e - 14)) | 0x8000;
    shiftTable[i]         = -e - 1;
    shiftTable[i | 0x100] = -e - 1;

  // normal number
  } else if (e <= 15) {
    baseTable[i]         =  (e + 15) << 10;
    baseTable[i | 0x100] = ((e + 15) << 10) | 0x8000;
    shiftTable[i]         = 13;
    shiftTable[i | 0x100] = 13;

  // large number (Infinity, -Infinity)
  } else if (e < 128) {
    baseTable[i]         = 0x7c00;
    baseTable[i | 0x100] = 0xfc00;
    shiftTable[i]         = 24;
    shiftTable[i | 0x100] = 24;

  // stay (NaN, Infinity, -Infinity)
  } else {
    baseTable[i]         = 0x7c00;
    baseTable[i | 0x100] = 0xfc00;
    shiftTable[i]         = 13;
    shiftTable[i | 0x100] = 13;
  }
}

/**
 * round a number to a half float number bits
 * @param {unknown} num - double float
 * @returns {number} half float number bits
 */
function converter_roundToFloat16Bits(num) {
  floatView[0] = roundToFloat16(num);
  const f = uint32View[0];
  const e = (f >> 23) & 0x1ff;
  return baseTable[e] + ((f & 0x007fffff) >> shiftTable[e]);
}

const mantissaTable = new NativeUint32Array(2048);
for (let i = 1; i < 1024; ++i) {
  let m = i << 13; // zero pad mantissa bits
  let e = 0; // zero exponent

  // normalized
  while ((m & 0x00800000) === 0) {
    m <<= 1;
    e -= 0x00800000; // decrement exponent
  }

  m &= ~0x00800000; // clear leading 1 bit
  e += 0x38800000; // adjust bias

  mantissaTable[i] = m | e;
}
for (let i = 1024; i < 2048; ++i) {
  mantissaTable[i] = 0x38000000 + ((i - 1024) << 13);
}

const exponentTable = new NativeUint32Array(64);
for (let i = 1; i < 31; ++i) {
  exponentTable[i] = i << 23;
}
exponentTable[31] = 0x47800000;
exponentTable[32] = 0x80000000;
for (let i = 33; i < 63; ++i) {
  exponentTable[i] = 0x80000000 + ((i - 32) << 23);
}
exponentTable[63] = 0xc7800000;

const offsetTable = new NativeUint16Array(64);
for (let i = 1; i < 64; ++i) {
  if (i !== 32) {
    offsetTable[i] = 1024;
  }
}

/**
 * convert a half float number bits to a number
 * @param {number} float16bits - half float number bits
 * @returns {number} double float
 */
function convertToNumber(float16bits) {
  const i = float16bits >> 10;
  uint32View[0] = mantissaTable[offsetTable[i] + (float16bits & 0x3ff)] + exponentTable[i];
  return floatView[0];
}

;// CONCATENATED MODULE: ./node_modules/@petamoriken/float16/src/DataView.mjs




/**
 * returns an unsigned 16-bit float at the specified byte offset from the start of the DataView
 * @param {DataView} dataView
 * @param {number} byteOffset
 * @param {[boolean]} opts
 * @returns {number}
 */
function getFloat16(dataView, byteOffset, ...opts) {
  return convertToNumber(
    DataViewPrototypeGetUint16(dataView, byteOffset, ...arrayIterator_safeIfNeeded(opts))
  );
}

/**
 * stores an unsigned 16-bit float value at the specified byte offset from the start of the DataView
 * @param {DataView} dataView
 * @param {number} byteOffset
 * @param {number} value
 * @param {[boolean]} opts
 */
function setFloat16(dataView, byteOffset, value, ...opts) {
  return DataViewPrototypeSetUint16(
    dataView,
    byteOffset,
    roundToFloat16Bits(value),
    ...safeIfNeeded(opts)
  );
}

// EXTERNAL MODULE: ./node_modules/xml-utils/get-attribute.js
var get_attribute = __webpack_require__(7379);
var get_attribute_default = /*#__PURE__*/__webpack_require__.n(get_attribute);
// EXTERNAL MODULE: ./node_modules/xml-utils/find-tags-by-name.js
var find_tags_by_name = __webpack_require__(563);
var find_tags_by_name_default = /*#__PURE__*/__webpack_require__.n(find_tags_by_name);
// EXTERNAL MODULE: ./src_geotiff/globals.js
var globals = __webpack_require__(167);
;// CONCATENATED MODULE: ./src_geotiff/rgb.js
function fromWhiteIsZero(raster, max) {
  const {
    width,
    height
  } = raster;
  const rgbRaster = new Uint8Array(width * height * 3);
  let value;
  for (let i = 0, j = 0; i < raster.length; ++i, j += 3) {
    value = 256 - raster[i] / max * 256;
    rgbRaster[j] = value;
    rgbRaster[j + 1] = value;
    rgbRaster[j + 2] = value;
  }
  return rgbRaster;
}
function fromBlackIsZero(raster, max) {
  const {
    width,
    height
  } = raster;
  const rgbRaster = new Uint8Array(width * height * 3);
  let value;
  for (let i = 0, j = 0; i < raster.length; ++i, j += 3) {
    value = raster[i] / max * 256;
    rgbRaster[j] = value;
    rgbRaster[j + 1] = value;
    rgbRaster[j + 2] = value;
  }
  return rgbRaster;
}
function fromPalette(raster, colorMap) {
  const {
    width,
    height
  } = raster;
  const rgbRaster = new Uint8Array(width * height * 3);
  const greenOffset = colorMap.length / 3;
  const blueOffset = colorMap.length / 3 * 2;
  for (let i = 0, j = 0; i < raster.length; ++i, j += 3) {
    const mapIndex = raster[i];
    rgbRaster[j] = colorMap[mapIndex] / 65536 * 256;
    rgbRaster[j + 1] = colorMap[mapIndex + greenOffset] / 65536 * 256;
    rgbRaster[j + 2] = colorMap[mapIndex + blueOffset] / 65536 * 256;
  }
  return rgbRaster;
}
function fromCMYK(cmykRaster) {
  const {
    width,
    height
  } = cmykRaster;
  const rgbRaster = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < cmykRaster.length; i += 4, j += 3) {
    const c = cmykRaster[i];
    const m = cmykRaster[i + 1];
    const y = cmykRaster[i + 2];
    const k = cmykRaster[i + 3];
    rgbRaster[j] = 255 * ((255 - c) / 256) * ((255 - k) / 256);
    rgbRaster[j + 1] = 255 * ((255 - m) / 256) * ((255 - k) / 256);
    rgbRaster[j + 2] = 255 * ((255 - y) / 256) * ((255 - k) / 256);
  }
  return rgbRaster;
}
function fromYCbCr(yCbCrRaster) {
  const {
    width,
    height
  } = yCbCrRaster;
  const rgbRaster = new Uint8ClampedArray(width * height * 3);
  for (let i = 0, j = 0; i < yCbCrRaster.length; i += 3, j += 3) {
    const y = yCbCrRaster[i];
    const cb = yCbCrRaster[i + 1];
    const cr = yCbCrRaster[i + 2];
    rgbRaster[j] = y + 1.40200 * (cr - 0x80);
    rgbRaster[j + 1] = y - 0.34414 * (cb - 0x80) - 0.71414 * (cr - 0x80);
    rgbRaster[j + 2] = y + 1.77200 * (cb - 0x80);
  }
  return rgbRaster;
}
const Xn = 0.95047;
const Yn = 1.00000;
const Zn = 1.08883;

// from https://github.com/antimatter15/rgb-lab/blob/master/color.js

function fromCIELab(cieLabRaster) {
  const {
    width,
    height
  } = cieLabRaster;
  const rgbRaster = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < cieLabRaster.length; i += 3, j += 3) {
    const L = cieLabRaster[i + 0];
    const a_ = cieLabRaster[i + 1] << 24 >> 24; // conversion from uint8 to int8
    const b_ = cieLabRaster[i + 2] << 24 >> 24; // same

    let y = (L + 16) / 116;
    let x = a_ / 500 + y;
    let z = y - b_ / 200;
    let r;
    let g;
    let b;
    x = Xn * (x * x * x > 0.008856 ? x * x * x : (x - 16 / 116) / 7.787);
    y = Yn * (y * y * y > 0.008856 ? y * y * y : (y - 16 / 116) / 7.787);
    z = Zn * (z * z * z > 0.008856 ? z * z * z : (z - 16 / 116) / 7.787);
    r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    b = x * 0.0557 + y * -0.2040 + z * 1.0570;
    r = r > 0.0031308 ? 1.055 * r ** (1 / 2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * g ** (1 / 2.4) - 0.055 : 12.92 * g;
    b = b > 0.0031308 ? 1.055 * b ** (1 / 2.4) - 0.055 : 12.92 * b;
    rgbRaster[j] = Math.max(0, Math.min(1, r)) * 255;
    rgbRaster[j + 1] = Math.max(0, Math.min(1, g)) * 255;
    rgbRaster[j + 2] = Math.max(0, Math.min(1, b)) * 255;
  }
  return rgbRaster;
}
// EXTERNAL MODULE: ./src_geotiff/compression/index.js
var compression = __webpack_require__(9594);
;// CONCATENATED MODULE: ./src_geotiff/resample.js
/**
 * @module resample
 */

function copyNewSize(array, width, height) {
  let samplesPerPixel = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 1;
  return new (Object.getPrototypeOf(array).constructor)(width * height * samplesPerPixel);
}

/**
 * Resample the input arrays using nearest neighbor value selection.
 * @param {TypedArray[]} valueArrays The input arrays to resample
 * @param {number} inWidth The width of the input rasters
 * @param {number} inHeight The height of the input rasters
 * @param {number} outWidth The desired width of the output rasters
 * @param {number} outHeight The desired height of the output rasters
 * @returns {TypedArray[]} The resampled rasters
 */
function resampleNearest(valueArrays, inWidth, inHeight, outWidth, outHeight) {
  const relX = inWidth / outWidth;
  const relY = inHeight / outHeight;
  return valueArrays.map(array => {
    const newArray = copyNewSize(array, outWidth, outHeight);
    for (let y = 0; y < outHeight; ++y) {
      const cy = Math.min(Math.round(relY * y), inHeight - 1);
      for (let x = 0; x < outWidth; ++x) {
        const cx = Math.min(Math.round(relX * x), inWidth - 1);
        const value = array[cy * inWidth + cx];
        newArray[y * outWidth + x] = value;
      }
    }
    return newArray;
  });
}

// simple linear interpolation, code from:
// https://en.wikipedia.org/wiki/Linear_interpolation#Programming_language_support
function lerp(v0, v1, t) {
  return (1 - t) * v0 + t * v1;
}

/**
 * Resample the input arrays using bilinear interpolation.
 * @param {TypedArray[]} valueArrays The input arrays to resample
 * @param {number} inWidth The width of the input rasters
 * @param {number} inHeight The height of the input rasters
 * @param {number} outWidth The desired width of the output rasters
 * @param {number} outHeight The desired height of the output rasters
 * @returns {TypedArray[]} The resampled rasters
 */
function resampleBilinear(valueArrays, inWidth, inHeight, outWidth, outHeight) {
  const relX = inWidth / outWidth;
  const relY = inHeight / outHeight;
  return valueArrays.map(array => {
    const newArray = copyNewSize(array, outWidth, outHeight);
    for (let y = 0; y < outHeight; ++y) {
      const rawY = relY * y;
      const yl = Math.floor(rawY);
      const yh = Math.min(Math.ceil(rawY), inHeight - 1);
      for (let x = 0; x < outWidth; ++x) {
        const rawX = relX * x;
        const tx = rawX % 1;
        const xl = Math.floor(rawX);
        const xh = Math.min(Math.ceil(rawX), inWidth - 1);
        const ll = array[yl * inWidth + xl];
        const hl = array[yl * inWidth + xh];
        const lh = array[yh * inWidth + xl];
        const hh = array[yh * inWidth + xh];
        const value = lerp(lerp(ll, hl, tx), lerp(lh, hh, tx), rawY % 1);
        newArray[y * outWidth + x] = value;
      }
    }
    return newArray;
  });
}

/**
 * Resample the input arrays using bicubic interpolation.
 * @param {TypedArray[]} valueArrays The input arrays to resample
 * @param {number} inWidth The width of the input rasters
 * @param {number} inHeight The height of the input rasters
 * @param {number} outWidth The desired width of the output rasters
 * @param {number} outHeight The desired height of the output rasters
 * @returns {TypedArray[]} The resampled rasters
 */
function resampleBiCubic(valueArrays, inWidth, inHeight, outWidth, outHeight) {
  const relX = inWidth / outWidth;
  const relY = inHeight / outHeight;
  const newArrayLength = outWidth * outHeight;
  const newArray = new Array(valueArrays.length);

  // Function for bicubic interpolation
  function cubicInterpolate(p0, p1, p2, p3, x) {
    return 0.5 * (p0 * (-x + 2 * x * x - x * x * x) + p1 * (2 - 5 * x * x + 3 * x * x * x) + p2 * (x + 4 * x * x - 3 * x * x * x) + p3 * (-x * x + x * x * x));
  }
  for (let i = 0; i < valueArrays.length; i++) {
    const array = valueArrays[i];
    const resultArray = new array.constructor(newArrayLength);
    for (let y = 0; y < outHeight; ++y) {
      for (let x = 0; x < outWidth; ++x) {
        const targetX = relX * x;
        const targetY = relY * y;
        const xFloor = Math.floor(targetX);
        const yFloor = Math.floor(targetY);
        const p = new Array(16);

        // Collect 16 neighboring pixels for bicubic interpolation
        for (let j = 0; j < 4; ++j) {
          for (let k = 0; k < 4; ++k) {
            const xIndex = xFloor - 1 + k;
            const yIndex = yFloor - 1 + j;
            let pixelValue;
            if (xIndex >= 0 && xIndex < inWidth && yIndex >= 0 && yIndex < inHeight) {
              pixelValue = array[yIndex * inWidth + xIndex];
            } else {
              pixelValue = 0; // If out of bounds, consider it as 0
            }
            p[j * 4 + k] = pixelValue;
          }
        }

        // Perform bicubic interpolation
        const xFraction = targetX - xFloor;
        const yFraction = targetY - yFloor;
        const interpolatedValue = cubicInterpolate(cubicInterpolate(p[0], p[1], p[2], p[3], xFraction), cubicInterpolate(p[4], p[5], p[6], p[7], xFraction), cubicInterpolate(p[8], p[9], p[10], p[11], xFraction), cubicInterpolate(p[12], p[13], p[14], p[15], xFraction), yFraction);
        resultArray[y * outWidth + x] = interpolatedValue;
      }
    }
    newArray[i] = resultArray;
  }
  return newArray;
}

/**
 * Resample the input arrays using the selected resampling method.
 * @param {TypedArray[]} valueArrays The input arrays to resample
 * @param {number} inWidth The width of the input rasters
 * @param {number} inHeight The height of the input rasters
 * @param {number} outWidth The desired width of the output rasters
 * @param {number} outHeight The desired height of the output rasters
 * @param {string} [method = 'nearest'] The desired resampling method
 * @returns {TypedArray[]} The resampled rasters
 */
function resample(valueArrays, inWidth, inHeight, outWidth, outHeight) {
  let method = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 'nearest';
  switch (method.toLowerCase()) {
    case 'nearest':
      return resampleNearest(valueArrays, inWidth, inHeight, outWidth, outHeight);
    case 'bilinear':
    case 'linear':
      return resampleBilinear(valueArrays, inWidth, inHeight, outWidth, outHeight);
    case 'bicubic':
    case 'cubic':
      return resampleBiCubic(valueArrays, inWidth, inHeight, outWidth, outHeight);
    default:
      throw new Error(`Unsupported resampling method: '${method}'`);
  }
}

/**
 * Resample the pixel interleaved input array using nearest neighbor value selection.
 * @param {TypedArray} valueArrays The input arrays to resample
 * @param {number} inWidth The width of the input rasters
 * @param {number} inHeight The height of the input rasters
 * @param {number} outWidth The desired width of the output rasters
 * @param {number} outHeight The desired height of the output rasters
 * @param {number} samples The number of samples per pixel for pixel
 *                         interleaved data
 * @returns {TypedArray} The resampled raster
 */
function resampleNearestInterleaved(valueArray, inWidth, inHeight, outWidth, outHeight, samples) {
  const relX = inWidth / outWidth;
  const relY = inHeight / outHeight;
  const newArray = copyNewSize(valueArray, outWidth, outHeight, samples);
  for (let y = 0; y < outHeight; ++y) {
    const cy = Math.min(Math.round(relY * y), inHeight - 1);
    for (let x = 0; x < outWidth; ++x) {
      const cx = Math.min(Math.round(relX * x), inWidth - 1);
      for (let i = 0; i < samples; ++i) {
        const value = valueArray[cy * inWidth * samples + cx * samples + i];
        newArray[y * outWidth * samples + x * samples + i] = value;
      }
    }
  }
  return newArray;
}

/**
 * Resample the pixel interleaved input array using bilinear interpolation.
 * @param {TypedArray} valueArrays The input arrays to resample
 * @param {number} inWidth The width of the input rasters
 * @param {number} inHeight The height of the input rasters
 * @param {number} outWidth The desired width of the output rasters
 * @param {number} outHeight The desired height of the output rasters
 * @param {number} samples The number of samples per pixel for pixel
 *                         interleaved data
 * @returns {TypedArray} The resampled raster
 */
function resampleBilinearInterleaved(valueArray, inWidth, inHeight, outWidth, outHeight, samples) {
  const relX = inWidth / outWidth;
  const relY = inHeight / outHeight;
  const newArray = copyNewSize(valueArray, outWidth, outHeight, samples);
  for (let y = 0; y < outHeight; ++y) {
    const rawY = relY * y;
    const yl = Math.floor(rawY);
    const yh = Math.min(Math.ceil(rawY), inHeight - 1);
    for (let x = 0; x < outWidth; ++x) {
      const rawX = relX * x;
      const tx = rawX % 1;
      const xl = Math.floor(rawX);
      const xh = Math.min(Math.ceil(rawX), inWidth - 1);
      for (let i = 0; i < samples; ++i) {
        const ll = valueArray[yl * inWidth * samples + xl * samples + i];
        const hl = valueArray[yl * inWidth * samples + xh * samples + i];
        const lh = valueArray[yh * inWidth * samples + xl * samples + i];
        const hh = valueArray[yh * inWidth * samples + xh * samples + i];
        const value = lerp(lerp(ll, hl, tx), lerp(lh, hh, tx), rawY % 1);
        newArray[y * outWidth * samples + x * samples + i] = value;
      }
    }
  }
  return newArray;
}
/**
 * Resample the pixel interleaved input array using bicubic interpolation.
 * @param {TypedArray} valueArray The input array to resample
 * @param {number} inWidth The width of the input raster
 * @param {number} inHeight The height of the input raster
 * @param {number} outWidth The desired width of the output raster
 * @param {number} outHeight The desired height of the output raster
 * @param {number} samples The number of samples per pixel for pixel interleaved data
 * @returns {TypedArray} The resampled raster
 */
function resampleBiCubicInterleaved(valueArray, inWidth, inHeight, outWidth, outHeight, samples) {
  const relX = inWidth / outWidth;
  const relY = inHeight / outHeight;
  const newArrayLength = outWidth * outHeight * samples;
  const newArray = new valueArray.constructor(newArrayLength);

  // Function for bicubic interpolation
  function cubicInterpolate(p0, p1, p2, p3, x) {
    return 0.5 * (p0 * (-x + 2 * x * x - x * x * x) + p1 * (2 - 5 * x * x + 3 * x * x * x) + p2 * (x + 4 * x * x - 3 * x * x * x) + p3 * (-x * x + x * x * x));
  }
  for (let y = 0; y < outHeight; ++y) {
    for (let x = 0; x < outWidth; ++x) {
      const targetX = relX * x;
      const targetY = relY * y;
      const xFloor = Math.floor(targetX);
      const yFloor = Math.floor(targetY);
      const p = new Array(16);

      // Collect 16 neighboring pixels for bicubic interpolation
      for (let j = 0; j < 4; ++j) {
        for (let k = 0; k < 4; ++k) {
          const xIndex = xFloor - 1 + k;
          const yIndex = yFloor - 1 + j;
          for (let i = 0; i < samples; ++i) {
            let pixelValue;
            if (xIndex >= 0 && xIndex < inWidth && yIndex >= 0 && yIndex < inHeight) {
              pixelValue = valueArray[(yIndex * inWidth + xIndex) * samples + i];
            } else {
              pixelValue = 0; // If out of bounds, consider it as 0
            }
            p[j * 4 + k] = pixelValue;
          }
        }
      }

      // Perform bicubic interpolation
      const xFraction = targetX - xFloor;
      const yFraction = targetY - yFloor;
      for (let i = 0; i < samples; ++i) {
        const interpolatedValue = cubicInterpolate(cubicInterpolate(p[0 * samples + i], p[1 * samples + i], p[2 * samples + i], p[3 * samples + i], xFraction), cubicInterpolate(p[4 * samples + i], p[5 * samples + i], p[6 * samples + i], p[7 * samples + i], xFraction), cubicInterpolate(p[8 * samples + i], p[9 * samples + i], p[10 * samples + i], p[11 * samples + i], xFraction), cubicInterpolate(p[12 * samples + i], p[13 * samples + i], p[14 * samples + i], p[15 * samples + i], xFraction), yFraction);
        newArray[y * outWidth * samples + x * samples + i] = interpolatedValue;
      }
    }
  }
  return newArray;
}

/**
 * Resample the pixel interleaved input array using the selected resampling method.
 * @param {TypedArray} valueArray The input array to resample
 * @param {number} inWidth The width of the input rasters
 * @param {number} inHeight The height of the input rasters
 * @param {number} outWidth The desired width of the output rasters
 * @param {number} outHeight The desired height of the output rasters
 * @param {number} samples The number of samples per pixel for pixel
 *                                 interleaved data
 * @param {string} [method = 'nearest'] The desired resampling method
 * @returns {TypedArray} The resampled rasters
 */
function resampleInterleaved(valueArray, inWidth, inHeight, outWidth, outHeight, samples) {
  let method = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : 'nearest';
  switch (method.toLowerCase()) {
    case 'nearest':
      return resampleNearestInterleaved(valueArray, inWidth, inHeight, outWidth, outHeight, samples);
    case 'bilinear':
    case 'linear':
      return resampleBilinearInterleaved(valueArray, inWidth, inHeight, outWidth, outHeight, samples);
    case 'bicubic':
    case 'cubic':
      return resampleBiCubicInterleaved(valueArray, inWidth, inHeight, outWidth, outHeight, samples);
    default:
      throw new Error(`Unsupported resampling method: '${method}'`);
  }
}
;// CONCATENATED MODULE: ./src_geotiff/geotiffimage.js
/** @module geotiffimage */








/**
 * @typedef {Object} ReadRasterOptions
 * @property {Array<number>} [window=whole window] the subset to read data from in pixels.
 * @property {Array<number>} [bbox=whole image] the subset to read data from in
 *                                           geographical coordinates.
 * @property {Array<number>} [samples=all samples] the selection of samples to read from. Default is all samples.
 * @property {boolean} [interleave=false] whether the data shall be read
 *                                             in one single array or separate
 *                                             arrays.
 * @property {Pool} [pool=null] The optional decoder pool to use.
 * @property {number} [width] The desired width of the output. When the width is not the
 *                                 same as the images, resampling will be performed.
 * @property {number} [height] The desired height of the output. When the width is not the
 *                                  same as the images, resampling will be performed.
 * @property {string} [resampleMethod='nearest'] The desired resampling method.
 * @property {AbortSignal} [signal] An AbortSignal that may be signalled if the request is
 *                                       to be aborted
 * @property {number|number[]} [fillValue] The value to use for parts of the image
 *                                              outside of the images extent. When multiple
 *                                              samples are requested, an array of fill values
 *                                              can be passed.
 */

/** @typedef {import("./geotiff.js").TypedArray} TypedArray */
/** @typedef {import("./geotiff.js").ReadRasterResult} ReadRasterResult */

function sum(array, start, end) {
  let s = 0;
  for (let i = start; i < end; ++i) {
    s += array[i];
  }
  return s;
}
function arrayForType(format, bitsPerSample, size) {
  switch (format) {
    case 1:
      // unsigned integer data
      if (bitsPerSample <= 8) {
        return new Uint8Array(size);
      } else if (bitsPerSample <= 16) {
        return new Uint16Array(size);
      } else if (bitsPerSample <= 32) {
        return new Uint32Array(size);
      }
      break;
    case 2:
      // twos complement signed integer data
      if (bitsPerSample === 8) {
        return new Int8Array(size);
      } else if (bitsPerSample === 16) {
        return new Int16Array(size);
      } else if (bitsPerSample === 32) {
        return new Int32Array(size);
      }
      break;
    case 3:
      // floating point data
      switch (bitsPerSample) {
        case 16:
        case 32:
          return new Float32Array(size);
        case 64:
          return new Float64Array(size);
        default:
          break;
      }
      break;
    default:
      break;
  }
  throw Error('Unsupported data format/bitsPerSample');
}
function needsNormalization(format, bitsPerSample) {
  if ((format === 1 || format === 2) && bitsPerSample <= 32 && bitsPerSample % 8 === 0) {
    return false;
  } else if (format === 3 && (bitsPerSample === 16 || bitsPerSample === 32 || bitsPerSample === 64)) {
    return false;
  }
  return true;
}
function normalizeArray(inBuffer, format, planarConfiguration, samplesPerPixel, bitsPerSample, tileWidth, tileHeight) {
  // const inByteArray = new Uint8Array(inBuffer);
  const view = new DataView(inBuffer);
  const outSize = planarConfiguration === 2 ? tileHeight * tileWidth : tileHeight * tileWidth * samplesPerPixel;
  const samplesToTransfer = planarConfiguration === 2 ? 1 : samplesPerPixel;
  const outArray = arrayForType(format, bitsPerSample, outSize);
  // let pixel = 0;

  const bitMask = parseInt('1'.repeat(bitsPerSample), 2);
  if (format === 1) {
    // unsigned integer
    // translation of https://github.com/OSGeo/gdal/blob/master/gdal/frmts/gtiff/geotiff.cpp#L7337
    let pixelBitSkip;
    // let sampleBitOffset = 0;
    if (planarConfiguration === 1) {
      pixelBitSkip = samplesPerPixel * bitsPerSample;
      // sampleBitOffset = (samplesPerPixel - 1) * bitsPerSample;
    } else {
      pixelBitSkip = bitsPerSample;
    }

    // Bits per line rounds up to next byte boundary.
    let bitsPerLine = tileWidth * pixelBitSkip;
    if ((bitsPerLine & 7) !== 0) {
      bitsPerLine = bitsPerLine + 7 & ~7;
    }
    for (let y = 0; y < tileHeight; ++y) {
      const lineBitOffset = y * bitsPerLine;
      for (let x = 0; x < tileWidth; ++x) {
        const pixelBitOffset = lineBitOffset + x * samplesToTransfer * bitsPerSample;
        for (let i = 0; i < samplesToTransfer; ++i) {
          const bitOffset = pixelBitOffset + i * bitsPerSample;
          const outIndex = (y * tileWidth + x) * samplesToTransfer + i;
          const byteOffset = Math.floor(bitOffset / 8);
          const innerBitOffset = bitOffset % 8;
          if (innerBitOffset + bitsPerSample <= 8) {
            outArray[outIndex] = view.getUint8(byteOffset) >> 8 - bitsPerSample - innerBitOffset & bitMask;
          } else if (innerBitOffset + bitsPerSample <= 16) {
            outArray[outIndex] = view.getUint16(byteOffset) >> 16 - bitsPerSample - innerBitOffset & bitMask;
          } else if (innerBitOffset + bitsPerSample <= 24) {
            const raw = view.getUint16(byteOffset) << 8 | view.getUint8(byteOffset + 2);
            outArray[outIndex] = raw >> 24 - bitsPerSample - innerBitOffset & bitMask;
          } else {
            outArray[outIndex] = view.getUint32(byteOffset) >> 32 - bitsPerSample - innerBitOffset & bitMask;
          }

          // let outWord = 0;
          // for (let bit = 0; bit < bitsPerSample; ++bit) {
          //   if (inByteArray[bitOffset >> 3]
          //     & (0x80 >> (bitOffset & 7))) {
          //     outWord |= (1 << (bitsPerSample - 1 - bit));
          //   }
          //   ++bitOffset;
          // }

          // outArray[outIndex] = outWord;
          // outArray[pixel] = outWord;
          // pixel += 1;
        }
        // bitOffset = bitOffset + pixelBitSkip - bitsPerSample;
      }
    }
  } else if (format === 3) {// floating point
    // Float16 is handled elsewhere
    // normalize 16/24 bit floats to 32 bit floats in the array
    // console.time();
    // if (bitsPerSample === 16) {
    //   for (let byte = 0, outIndex = 0; byte < inBuffer.byteLength; byte += 2, ++outIndex) {
    //     outArray[outIndex] = getFloat16(view, byte);
    //   }
    // }
    // console.timeEnd()
  }
  return outArray.buffer;
}

/**
 * GeoTIFF sub-file image.
 */
class GeoTIFFImage {
  /**
   * @constructor
   * @param {Object} fileDirectory The parsed file directory
   * @param {Object} geoKeys The parsed geo-keys
   * @param {DataView} dataView The DataView for the underlying file.
   * @param {Boolean} littleEndian Whether the file is encoded in little or big endian
   * @param {Boolean} cache Whether or not decoded tiles shall be cached
   * @param {import('./source/basesource').BaseSource} source The datasource to read from
   */
  constructor(fileDirectory, geoKeys, dataView, littleEndian, cache, source) {
    this.fileDirectory = fileDirectory;
    this.geoKeys = geoKeys;
    this.dataView = dataView;
    this.littleEndian = littleEndian;
    this.tiles = cache ? {} : null;
    this.isTiled = !fileDirectory.StripOffsets;
    const planarConfiguration = fileDirectory.PlanarConfiguration;
    this.planarConfiguration = typeof planarConfiguration === 'undefined' ? 1 : planarConfiguration;
    if (this.planarConfiguration !== 1 && this.planarConfiguration !== 2) {
      throw new Error('Invalid planar configuration.');
    }
    this.source = source;
  }

  /**
   * Returns the associated parsed file directory.
   * @returns {Object} the parsed file directory
   */
  getFileDirectory() {
    return this.fileDirectory;
  }

  /**
   * Returns the associated parsed geo keys.
   * @returns {Object} the parsed geo keys
   */
  getGeoKeys() {
    return this.geoKeys;
  }

  /**
   * Returns the width of the image.
   * @returns {Number} the width of the image
   */
  getWidth() {
    return this.fileDirectory.ImageWidth;
  }

  /**
   * Returns the height of the image.
   * @returns {Number} the height of the image
   */
  getHeight() {
    return this.fileDirectory.ImageLength;
  }

  /**
   * Returns the number of samples per pixel.
   * @returns {Number} the number of samples per pixel
   */
  getSamplesPerPixel() {
    return typeof this.fileDirectory.SamplesPerPixel !== 'undefined' ? this.fileDirectory.SamplesPerPixel : 1;
  }

  /**
   * Returns the width of each tile.
   * @returns {Number} the width of each tile
   */
  getTileWidth() {
    return this.isTiled ? this.fileDirectory.TileWidth : this.getWidth();
  }

  /**
   * Returns the height of each tile.
   * @returns {Number} the height of each tile
   */
  getTileHeight() {
    if (this.isTiled) {
      return this.fileDirectory.TileLength;
    }
    if (typeof this.fileDirectory.RowsPerStrip !== 'undefined') {
      return Math.min(this.fileDirectory.RowsPerStrip, this.getHeight());
    }
    return this.getHeight();
  }
  getBlockWidth() {
    return this.getTileWidth();
  }
  getBlockHeight(y) {
    if (this.isTiled || (y + 1) * this.getTileHeight() <= this.getHeight()) {
      return this.getTileHeight();
    } else {
      return this.getHeight() - y * this.getTileHeight();
    }
  }

  /**
   * Calculates the number of bytes for each pixel across all samples. Only full
   * bytes are supported, an exception is thrown when this is not the case.
   * @returns {Number} the bytes per pixel
   */
  getBytesPerPixel() {
    let bytes = 0;
    for (let i = 0; i < this.fileDirectory.BitsPerSample.length; ++i) {
      bytes += this.getSampleByteSize(i);
    }
    return bytes;
  }
  getSampleByteSize(i) {
    if (i >= this.fileDirectory.BitsPerSample.length) {
      throw new RangeError(`Sample index ${i} is out of range.`);
    }
    return Math.ceil(this.fileDirectory.BitsPerSample[i] / 8);
  }
  getReaderForSample(sampleIndex) {
    const format = this.fileDirectory.SampleFormat ? this.fileDirectory.SampleFormat[sampleIndex] : 1;
    const bitsPerSample = this.fileDirectory.BitsPerSample[sampleIndex];
    switch (format) {
      case 1:
        // unsigned integer data
        if (bitsPerSample <= 8) {
          return DataView.prototype.getUint8;
        } else if (bitsPerSample <= 16) {
          return DataView.prototype.getUint16;
        } else if (bitsPerSample <= 32) {
          return DataView.prototype.getUint32;
        }
        break;
      case 2:
        // twos complement signed integer data
        if (bitsPerSample <= 8) {
          return DataView.prototype.getInt8;
        } else if (bitsPerSample <= 16) {
          return DataView.prototype.getInt16;
        } else if (bitsPerSample <= 32) {
          return DataView.prototype.getInt32;
        }
        break;
      case 3:
        switch (bitsPerSample) {
          case 16:
            return function (offset, littleEndian) {
              return getFloat16(this, offset, littleEndian);
            };
          case 32:
            return DataView.prototype.getFloat32;
          case 64:
            return DataView.prototype.getFloat64;
          default:
            break;
        }
        break;
      default:
        break;
    }
    throw Error('Unsupported data format/bitsPerSample');
  }
  getSampleFormat() {
    let sampleIndex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    return this.fileDirectory.SampleFormat ? this.fileDirectory.SampleFormat[sampleIndex] : 1;
  }
  getBitsPerSample() {
    let sampleIndex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    return this.fileDirectory.BitsPerSample[sampleIndex];
  }
  getArrayForSample(sampleIndex, size) {
    const format = this.getSampleFormat(sampleIndex);
    const bitsPerSample = this.getBitsPerSample(sampleIndex);
    return arrayForType(format, bitsPerSample, size);
  }

  /**
   * Returns the decoded strip or tile.
   * @param {Number} x the strip or tile x-offset
   * @param {Number} y the tile y-offset (0 for stripped images)
   * @param {Number} sample the sample to get for separated samples
   * @param {import("./geotiff").Pool|import("./geotiff").BaseDecoder} poolOrDecoder the decoder or decoder pool
   * @param {AbortSignal} [signal] An AbortSignal that may be signalled if the request is
   *                               to be aborted
   * @returns {Promise.<ArrayBuffer>}
   */
  async getTileOrStrip(x, y, sample, poolOrDecoder, signal) {
    const numTilesPerRow = Math.ceil(this.getWidth() / this.getTileWidth());
    const numTilesPerCol = Math.ceil(this.getHeight() / this.getTileHeight());
    let index;
    const {
      tiles
    } = this;
    if (this.planarConfiguration === 1) {
      index = y * numTilesPerRow + x;
    } else if (this.planarConfiguration === 2) {
      index = sample * numTilesPerRow * numTilesPerCol + y * numTilesPerRow + x;
    }
    let offset;
    let byteCount;
    if (this.isTiled) {
      offset = this.fileDirectory.TileOffsets[index];
      byteCount = this.fileDirectory.TileByteCounts[index];
    } else {
      offset = this.fileDirectory.StripOffsets[index];
      byteCount = this.fileDirectory.StripByteCounts[index];
    }
    const slice = (await this.source.fetch([{
      offset,
      length: byteCount
    }], signal))[0];
    let request;
    if (tiles === null || !tiles[index]) {
      // resolve each request by potentially applying array normalization
      request = (async () => {
        let data = await poolOrDecoder.decode(this.fileDirectory, slice);
        const sampleFormat = this.getSampleFormat();
        const bitsPerSample = this.getBitsPerSample();
        if (needsNormalization(sampleFormat, bitsPerSample)) {
          data = normalizeArray(data, sampleFormat, this.planarConfiguration, this.getSamplesPerPixel(), bitsPerSample, this.getTileWidth(), this.getBlockHeight(y));
        }
        return data;
      })();

      // set the cache
      if (tiles !== null) {
        tiles[index] = request;
      }
    } else {
      // get from the cache
      request = tiles[index];
    }

    // cache the tile request
    return {
      x,
      y,
      sample,
      data: await request
    };
  }

  /**
   * Internal read function.
   * @private
   * @param {Array} imageWindow The image window in pixel coordinates
   * @param {Array} samples The selected samples (0-based indices)
   * @param {TypedArray|TypedArray[]} valueArrays The array(s) to write into
   * @param {Boolean} interleave Whether or not to write in an interleaved manner
   * @param {import("./geotiff").Pool|AbstractDecoder} poolOrDecoder the decoder or decoder pool
   * @param {number} width the width of window to be read into
   * @param {number} height the height of window to be read into
   * @param {number} resampleMethod the resampling method to be used when interpolating
   * @param {AbortSignal} [signal] An AbortSignal that may be signalled if the request is
   *                               to be aborted
   * @returns {Promise<ReadRasterResult>}
   */
  async _readRaster(imageWindow, samples, valueArrays, interleave, poolOrDecoder, width, height, resampleMethod, signal) {
    const tileWidth = this.getTileWidth();
    const tileHeight = this.getTileHeight();
    const imageWidth = this.getWidth();
    const imageHeight = this.getHeight();
    const minXTile = Math.max(Math.floor(imageWindow[0] / tileWidth), 0);
    const maxXTile = Math.min(Math.ceil(imageWindow[2] / tileWidth), Math.ceil(imageWidth / tileWidth));
    const minYTile = Math.max(Math.floor(imageWindow[1] / tileHeight), 0);
    const maxYTile = Math.min(Math.ceil(imageWindow[3] / tileHeight), Math.ceil(imageHeight / tileHeight));
    const windowWidth = imageWindow[2] - imageWindow[0];
    let bytesPerPixel = this.getBytesPerPixel();
    const srcSampleOffsets = [];
    const sampleReaders = [];
    for (let i = 0; i < samples.length; ++i) {
      if (this.planarConfiguration === 1) {
        srcSampleOffsets.push(sum(this.fileDirectory.BitsPerSample, 0, samples[i]) / 8);
      } else {
        srcSampleOffsets.push(0);
      }
      sampleReaders.push(this.getReaderForSample(samples[i]));
    }
    const promises = [];
    const {
      littleEndian
    } = this;
    for (let yTile = minYTile; yTile < maxYTile; ++yTile) {
      for (let xTile = minXTile; xTile < maxXTile; ++xTile) {
        let getPromise;
        if (this.planarConfiguration === 1) {
          getPromise = this.getTileOrStrip(xTile, yTile, 0, poolOrDecoder, signal);
        }
        for (let sampleIndex = 0; sampleIndex < samples.length; ++sampleIndex) {
          const si = sampleIndex;
          const sample = samples[sampleIndex];
          if (this.planarConfiguration === 2) {
            bytesPerPixel = this.getSampleByteSize(sample);
            getPromise = this.getTileOrStrip(xTile, yTile, sample, poolOrDecoder, signal);
          }
          const promise = getPromise.then(tile => {
            const buffer = tile.data;
            const dataView = new DataView(buffer);
            const blockHeight = this.getBlockHeight(tile.y);
            const firstLine = tile.y * tileHeight;
            const firstCol = tile.x * tileWidth;
            const lastLine = firstLine + blockHeight;
            const lastCol = (tile.x + 1) * tileWidth;
            const reader = sampleReaders[si];
            const ymax = Math.min(blockHeight, blockHeight - (lastLine - imageWindow[3]), imageHeight - firstLine);
            const xmax = Math.min(tileWidth, tileWidth - (lastCol - imageWindow[2]), imageWidth - firstCol);
            for (let y = Math.max(0, imageWindow[1] - firstLine); y < ymax; ++y) {
              for (let x = Math.max(0, imageWindow[0] - firstCol); x < xmax; ++x) {
                const pixelOffset = (y * tileWidth + x) * bytesPerPixel;
                const value = reader.call(dataView, pixelOffset + srcSampleOffsets[si], littleEndian);
                let windowCoordinate;
                if (interleave) {
                  windowCoordinate = (y + firstLine - imageWindow[1]) * windowWidth * samples.length + (x + firstCol - imageWindow[0]) * samples.length + si;
                  valueArrays[windowCoordinate] = value;
                } else {
                  windowCoordinate = (y + firstLine - imageWindow[1]) * windowWidth + x + firstCol - imageWindow[0];
                  valueArrays[si][windowCoordinate] = value;
                }
              }
            }
          });
          promises.push(promise);
        }
      }
    }
    await Promise.all(promises);
    if (width && imageWindow[2] - imageWindow[0] !== width || height && imageWindow[3] - imageWindow[1] !== height) {
      let resampled;
      if (interleave) {
        resampled = resampleInterleaved(valueArrays, imageWindow[2] - imageWindow[0], imageWindow[3] - imageWindow[1], width, height, samples.length, resampleMethod);
      } else {
        resampled = resample(valueArrays, imageWindow[2] - imageWindow[0], imageWindow[3] - imageWindow[1], width, height, resampleMethod);
      }
      resampled.width = width;
      resampled.height = height;
      return resampled;
    }
    valueArrays.width = width || imageWindow[2] - imageWindow[0];
    valueArrays.height = height || imageWindow[3] - imageWindow[1];
    return valueArrays;
  }

  /**
   * Reads raster data from the image. This function reads all selected samples
   * into separate arrays of the correct type for that sample or into a single
   * combined array when `interleave` is set. When provided, only a subset
   * of the raster is read for each sample.
   *
   * @param {ReadRasterOptions} [options={}] optional parameters
   * @returns {Promise<ReadRasterResult>} the decoded arrays as a promise
   */
  async readRasters() {
    let {
      window: wnd,
      samples = [],
      interleave,
      pool = null,
      width,
      height,
      resampleMethod,
      fillValue,
      signal
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    const imageWindow = wnd || [0, 0, this.getWidth(), this.getHeight()];

    // check parameters
    if (imageWindow[0] > imageWindow[2] || imageWindow[1] > imageWindow[3]) {
      throw new Error('Invalid subsets');
    }
    const imageWindowWidth = imageWindow[2] - imageWindow[0];
    const imageWindowHeight = imageWindow[3] - imageWindow[1];
    const samplesPerPixel = this.getSamplesPerPixel();
    if (!samples || !samples.length) {
      for (let i = 0; i < samplesPerPixel; ++i) {
        samples.push(i);
      }
    } else {
      for (let i = 0; i < samples.length; ++i) {
        if (samples[i] >= samplesPerPixel) {
          return Promise.reject(new RangeError(`Invalid sample index '${samples[i]}'.`));
        }
      }
    }
    let valueArrays;
    if (interleave) {
      const format = this.fileDirectory.SampleFormat ? Math.max.apply(null, this.fileDirectory.SampleFormat) : 1;
      const bitsPerSample = Math.max.apply(null, this.fileDirectory.BitsPerSample);
      valueArrays = arrayForType(format, bitsPerSample, numPixels * samples.length);
      if (fillValue) {
        valueArrays.fill(fillValue);
      }
    } else {
      valueArrays = [];
      for (let i = 0; i < samples.length; ++i) {
        const valueArray = this.getArrayForSample(samples[i], numPixels);
        if (Array.isArray(fillValue) && i < fillValue.length) {
          valueArray.fill(fillValue[i]);
        } else if (fillValue && !Array.isArray(fillValue)) {
          valueArray.fill(fillValue);
        }
        valueArrays.push(valueArray);
      }
    }
    const poolOrDecoder = pool || (await (0,compression/* getDecoder */.f)(this.fileDirectory));
    const result = await this._readRaster(imageWindow, samples, valueArrays, interleave, poolOrDecoder, width, height, resampleMethod, signal);
    return result;
  }

  /**
   * Reads raster data from the image as RGB. The result is always an
   * interleaved typed array.
   * Colorspaces other than RGB will be transformed to RGB, color maps expanded.
   * When no other method is applicable, the first sample is used to produce a
   * grayscale image.
   * When provided, only a subset of the raster is read for each sample.
   *
   * @param {Object} [options] optional parameters
   * @param {Array<number>} [options.window] the subset to read data from in pixels.
   * @param {boolean} [options.interleave=true] whether the data shall be read
   *                                             in one single array or separate
   *                                             arrays.
   * @param {import("./geotiff").Pool} [options.pool=null] The optional decoder pool to use.
   * @param {number} [options.width] The desired width of the output. When the width is no the
   *                                 same as the images, resampling will be performed.
   * @param {number} [options.height] The desired height of the output. When the width is no the
   *                                  same as the images, resampling will be performed.
   * @param {string} [options.resampleMethod='nearest'] The desired resampling method.
   * @param {boolean} [options.enableAlpha=false] Enable reading alpha channel if present.
   * @param {AbortSignal} [options.signal] An AbortSignal that may be signalled if the request is
   *                                       to be aborted
   * @returns {Promise<ReadRasterResult>} the RGB array as a Promise
   */
  async readRGB() {
    let {
      window,
      interleave = true,
      pool = null,
      width,
      height,
      resampleMethod,
      enableAlpha = false,
      signal
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    const imageWindow = window || [0, 0, this.getWidth(), this.getHeight()];

    // check parameters
    if (imageWindow[0] > imageWindow[2] || imageWindow[1] > imageWindow[3]) {
      throw new Error('Invalid subsets');
    }
    const pi = this.fileDirectory.PhotometricInterpretation;
    if (pi === globals.photometricInterpretations.RGB) {
      let s = [0, 1, 2];
      if (!(this.fileDirectory.ExtraSamples === globals.ExtraSamplesValues.Unspecified) && enableAlpha) {
        s = [];
        for (let i = 0; i < this.fileDirectory.BitsPerSample.length; i += 1) {
          s.push(i);
        }
      }
      return this.readRasters({
        window,
        interleave,
        samples: s,
        pool,
        width,
        height,
        resampleMethod,
        signal
      });
    }
    let samples;
    switch (pi) {
      case globals.photometricInterpretations.WhiteIsZero:
      case globals.photometricInterpretations.BlackIsZero:
      case globals.photometricInterpretations.Palette:
        samples = [0];
        break;
      case globals.photometricInterpretations.CMYK:
        samples = [0, 1, 2, 3];
        break;
      case globals.photometricInterpretations.YCbCr:
      case globals.photometricInterpretations.CIELab:
        samples = [0, 1, 2];
        break;
      default:
        throw new Error('Invalid or unsupported photometric interpretation.');
    }
    const subOptions = {
      window: imageWindow,
      interleave: true,
      samples,
      pool,
      width,
      height,
      resampleMethod,
      signal
    };
    const {
      fileDirectory
    } = this;
    const raster = await this.readRasters(subOptions);
    const max = 2 ** this.fileDirectory.BitsPerSample[0];
    let data;
    switch (pi) {
      case globals.photometricInterpretations.WhiteIsZero:
        data = fromWhiteIsZero(raster, max);
        break;
      case globals.photometricInterpretations.BlackIsZero:
        data = fromBlackIsZero(raster, max);
        break;
      case globals.photometricInterpretations.Palette:
        data = fromPalette(raster, fileDirectory.ColorMap);
        break;
      case globals.photometricInterpretations.CMYK:
        data = fromCMYK(raster);
        break;
      case globals.photometricInterpretations.YCbCr:
        data = fromYCbCr(raster);
        break;
      case globals.photometricInterpretations.CIELab:
        data = fromCIELab(raster);
        break;
      default:
        throw new Error('Unsupported photometric interpretation.');
    }

    // if non-interleaved data is requested, we must split the channels
    // into their respective arrays
    if (!interleave) {
      const red = new Uint8Array(data.length / 3);
      const green = new Uint8Array(data.length / 3);
      const blue = new Uint8Array(data.length / 3);
      for (let i = 0, j = 0; i < data.length; i += 3, ++j) {
        red[j] = data[i];
        green[j] = data[i + 1];
        blue[j] = data[i + 2];
      }
      data = [red, green, blue];
    }
    data.width = raster.width;
    data.height = raster.height;
    return data;
  }

  /**
   * Returns an array of tiepoints.
   * @returns {Object[]}
   */
  getTiePoints() {
    if (!this.fileDirectory.ModelTiepoint) {
      return [];
    }
    const tiePoints = [];
    for (let i = 0; i < this.fileDirectory.ModelTiepoint.length; i += 6) {
      tiePoints.push({
        i: this.fileDirectory.ModelTiepoint[i],
        j: this.fileDirectory.ModelTiepoint[i + 1],
        k: this.fileDirectory.ModelTiepoint[i + 2],
        x: this.fileDirectory.ModelTiepoint[i + 3],
        y: this.fileDirectory.ModelTiepoint[i + 4],
        z: this.fileDirectory.ModelTiepoint[i + 5]
      });
    }
    return tiePoints;
  }

  /**
   * Returns the parsed GDAL metadata items.
   *
   * If sample is passed to null, dataset-level metadata will be returned.
   * Otherwise only metadata specific to the provided sample will be returned.
   *
   * @param {number} [sample=null] The sample index.
   * @returns {Object}
   */
  getGDALMetadata() {
    let sample = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    const metadata = {};
    if (!this.fileDirectory.GDAL_METADATA) {
      return null;
    }
    const string = this.fileDirectory.GDAL_METADATA;
    let items = find_tags_by_name_default()(string, 'Item');
    if (sample === null) {
      items = items.filter(item => get_attribute_default()(item, 'sample') === undefined);
    } else {
      items = items.filter(item => Number(get_attribute_default()(item, 'sample')) === sample);
    }
    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      metadata[get_attribute_default()(item, 'name')] = item.inner;
    }
    return metadata;
  }

  /**
   * Returns the GDAL nodata value
   * @returns {number|null}
   */
  getGDALNoData() {
    if (!this.fileDirectory.GDAL_NODATA) {
      return null;
    }
    const string = this.fileDirectory.GDAL_NODATA;
    return Number(string.substring(0, string.length - 1));
  }

  /**
   * Returns the image origin as a XYZ-vector. When the image has no affine
   * transformation, then an exception is thrown.
   * @returns {Array<number>} The origin as a vector
   */
  getOrigin() {
    const tiePoints = this.fileDirectory.ModelTiepoint;
    const modelTransformation = this.fileDirectory.ModelTransformation;
    if (tiePoints && tiePoints.length === 6) {
      return [tiePoints[3], tiePoints[4], tiePoints[5]];
    }
    if (modelTransformation) {
      return [modelTransformation[3], modelTransformation[7], modelTransformation[11]];
    }
    throw new Error('The image does not have an affine transformation.');
  }

  /**
   * Returns the image resolution as a XYZ-vector. When the image has no affine
   * transformation, then an exception is thrown.
   * @param {GeoTIFFImage} [referenceImage=null] A reference image to calculate the resolution from
   *                                             in cases when the current image does not have the
   *                                             required tags on its own.
   * @returns {Array<number>} The resolution as a vector
   */
  getResolution() {
    let referenceImage = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    const modelPixelScale = this.fileDirectory.ModelPixelScale;
    const modelTransformation = this.fileDirectory.ModelTransformation;
    if (modelPixelScale) {
      return [modelPixelScale[0], -modelPixelScale[1], modelPixelScale[2]];
    }
    if (modelTransformation) {
      if (modelTransformation[1] === 0 && modelTransformation[4] === 0) {
        return [modelTransformation[0], -modelTransformation[5], modelTransformation[10]];
      }
      return [Math.sqrt(modelTransformation[0] * modelTransformation[0] + modelTransformation[4] * modelTransformation[4]), -Math.sqrt(modelTransformation[1] * modelTransformation[1] + modelTransformation[5] * modelTransformation[5]), modelTransformation[10]];
    }
    if (referenceImage) {
      const [refResX, refResY, refResZ] = referenceImage.getResolution();
      return [refResX * referenceImage.getWidth() / this.getWidth(), refResY * referenceImage.getHeight() / this.getHeight(), refResZ * referenceImage.getWidth() / this.getWidth()];
    }
    throw new Error('The image does not have an affine transformation.');
  }

  /**
   * Returns whether or not the pixels of the image depict an area (or point).
   * @returns {Boolean} Whether the pixels are a point
   */
  pixelIsArea() {
    return this.geoKeys.GTRasterTypeGeoKey === 1;
  }

  /**
   * Returns the image bounding box as an array of 4 values: min-x, min-y,
   * max-x and max-y. When the image has no affine transformation, then an
   * exception is thrown.
   * @param {boolean} [tilegrid=false] If true return extent for a tilegrid
   *                                   without adjustment for ModelTransformation.
   * @returns {Array<number>} The bounding box
   */
  getBoundingBox() {
    let tilegrid = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    const height = this.getHeight();
    const width = this.getWidth();
    if (this.fileDirectory.ModelTransformation && !tilegrid) {
      // eslint-disable-next-line no-unused-vars
      const [a, b, c, d, e, f, g, h] = this.fileDirectory.ModelTransformation;
      const corners = [[0, 0], [0, height], [width, 0], [width, height]];
      const projected = corners.map(_ref => {
        let [I, J] = _ref;
        return [d + a * I + b * J, h + e * I + f * J];
      });
      const xs = projected.map(pt => pt[0]);
      const ys = projected.map(pt => pt[1]);
      return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    } else {
      const origin = this.getOrigin();
      const resolution = this.getResolution();
      const x1 = origin[0];
      const y1 = origin[1];
      const x2 = x1 + resolution[0] * width;
      const y2 = y1 + resolution[1] * height;
      return [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)];
    }
  }
}
/* harmony default export */ const geotiffimage = (GeoTIFFImage);
;// CONCATENATED MODULE: ./src_geotiff/dataview64.js

class DataView64 {
  constructor(arrayBuffer) {
    this._dataView = new DataView(arrayBuffer);
  }
  get buffer() {
    return this._dataView.buffer;
  }
  getUint64(offset, littleEndian) {
    const left = this.getUint32(offset, littleEndian);
    const right = this.getUint32(offset + 4, littleEndian);
    let combined;
    if (littleEndian) {
      combined = left + 2 ** 32 * right;
      if (!Number.isSafeInteger(combined)) {
        throw new Error(`${combined} exceeds MAX_SAFE_INTEGER. ` + 'Precision may be lost. Please report if you get this message to https://github.com/geotiffjs/geotiff.js/issues');
      }
      return combined;
    }
    combined = 2 ** 32 * left + right;
    if (!Number.isSafeInteger(combined)) {
      throw new Error(`${combined} exceeds MAX_SAFE_INTEGER. ` + 'Precision may be lost. Please report if you get this message to https://github.com/geotiffjs/geotiff.js/issues');
    }
    return combined;
  }

  // adapted from https://stackoverflow.com/a/55338384/8060591
  getInt64(offset, littleEndian) {
    let value = 0;
    const isNegative = (this._dataView.getUint8(offset + (littleEndian ? 7 : 0)) & 0x80) > 0;
    let carrying = true;
    for (let i = 0; i < 8; i++) {
      let byte = this._dataView.getUint8(offset + (littleEndian ? i : 7 - i));
      if (isNegative) {
        if (carrying) {
          if (byte !== 0x00) {
            byte = ~(byte - 1) & 0xff;
            carrying = false;
          }
        } else {
          byte = ~byte & 0xff;
        }
      }
      value += byte * 256 ** i;
    }
    if (isNegative) {
      value = -value;
    }
    return value;
  }
  getUint8(offset, littleEndian) {
    return this._dataView.getUint8(offset, littleEndian);
  }
  getInt8(offset, littleEndian) {
    return this._dataView.getInt8(offset, littleEndian);
  }
  getUint16(offset, littleEndian) {
    return this._dataView.getUint16(offset, littleEndian);
  }
  getInt16(offset, littleEndian) {
    return this._dataView.getInt16(offset, littleEndian);
  }
  getUint32(offset, littleEndian) {
    return this._dataView.getUint32(offset, littleEndian);
  }
  getInt32(offset, littleEndian) {
    return this._dataView.getInt32(offset, littleEndian);
  }
  getFloat16(offset, littleEndian) {
    return getFloat16(this._dataView, offset, littleEndian);
  }
  getFloat32(offset, littleEndian) {
    return this._dataView.getFloat32(offset, littleEndian);
  }
  getFloat64(offset, littleEndian) {
    return this._dataView.getFloat64(offset, littleEndian);
  }
}
;// CONCATENATED MODULE: ./src_geotiff/dataslice.js
class DataSlice {
  constructor(arrayBuffer, sliceOffset, littleEndian, bigTiff) {
    this._dataView = new DataView(arrayBuffer);
    this._sliceOffset = sliceOffset;
    this._littleEndian = littleEndian;
    this._bigTiff = bigTiff;
  }
  get sliceOffset() {
    return this._sliceOffset;
  }
  get sliceTop() {
    return this._sliceOffset + this.buffer.byteLength;
  }
  get littleEndian() {
    return this._littleEndian;
  }
  get bigTiff() {
    return this._bigTiff;
  }
  get buffer() {
    return this._dataView.buffer;
  }
  covers(offset, length) {
    return this.sliceOffset <= offset && this.sliceTop >= offset + length;
  }
  readUint8(offset) {
    return this._dataView.getUint8(offset - this._sliceOffset, this._littleEndian);
  }
  readInt8(offset) {
    return this._dataView.getInt8(offset - this._sliceOffset, this._littleEndian);
  }
  readUint16(offset) {
    return this._dataView.getUint16(offset - this._sliceOffset, this._littleEndian);
  }
  readInt16(offset) {
    return this._dataView.getInt16(offset - this._sliceOffset, this._littleEndian);
  }
  readUint32(offset) {
    return this._dataView.getUint32(offset - this._sliceOffset, this._littleEndian);
  }
  readInt32(offset) {
    return this._dataView.getInt32(offset - this._sliceOffset, this._littleEndian);
  }
  readFloat32(offset) {
    return this._dataView.getFloat32(offset - this._sliceOffset, this._littleEndian);
  }
  readFloat64(offset) {
    return this._dataView.getFloat64(offset - this._sliceOffset, this._littleEndian);
  }
  readUint64(offset) {
    const left = this.readUint32(offset);
    const right = this.readUint32(offset + 4);
    let combined;
    if (this._littleEndian) {
      combined = left + 2 ** 32 * right;
      if (!Number.isSafeInteger(combined)) {
        throw new Error(`${combined} exceeds MAX_SAFE_INTEGER. ` + 'Precision may be lost. Please report if you get this message to https://github.com/geotiffjs/geotiff.js/issues');
      }
      return combined;
    }
    combined = 2 ** 32 * left + right;
    if (!Number.isSafeInteger(combined)) {
      throw new Error(`${combined} exceeds MAX_SAFE_INTEGER. ` + 'Precision may be lost. Please report if you get this message to https://github.com/geotiffjs/geotiff.js/issues');
    }
    return combined;
  }

  // adapted from https://stackoverflow.com/a/55338384/8060591
  readInt64(offset) {
    let value = 0;
    const isNegative = (this._dataView.getUint8(offset + (this._littleEndian ? 7 : 0)) & 0x80) > 0;
    let carrying = true;
    for (let i = 0; i < 8; i++) {
      let byte = this._dataView.getUint8(offset + (this._littleEndian ? i : 7 - i));
      if (isNegative) {
        if (carrying) {
          if (byte !== 0x00) {
            byte = ~(byte - 1) & 0xff;
            carrying = false;
          }
        } else {
          byte = ~byte & 0xff;
        }
      }
      value += byte * 256 ** i;
    }
    if (isNegative) {
      value = -value;
    }
    return value;
  }
  readOffset(offset) {
    if (this._bigTiff) {
      return this.readUint64(offset);
    }
    return this.readUint32(offset);
  }
}
;// CONCATENATED MODULE: ./src_geotiff/pool.js

const defaultPoolSize = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2;

/**
 * @module pool
 */

/**
 * Pool for workers to decode chunks of the images.
 */
class Pool {
  /**
   * @constructor
   * @param {Number} [size] The size of the pool. Defaults to the number of CPUs
   *                      available. When this parameter is `null` or 0, then the
   *                      decoding will be done in the main thread.
   * @param {function(): Worker} [createWorker] A function that creates the decoder worker.
   * Defaults to a worker with all decoders that ship with geotiff.js. The `createWorker()`
   * function is expected to return a `Worker` compatible with Web Workers. For code that
   * runs in Node, [web-worker](https://www.npmjs.com/package/web-worker) is a good choice.
   *
   * A worker that uses a custom lzw decoder would look like this `my-custom-worker.js` file:
   * ```js
   * import { addDecoder, getDecoder } from 'geotiff';
   * addDecoder(5, () => import ('./my-custom-lzw').then((m) => m.default));
   * self.addEventListener('message', async (e) => {
   *   const { id, fileDirectory, buffer } = e.data;
   *   const decoder = await getDecoder(fileDirectory);
   *   const decoded = await decoder.decode(fileDirectory, buffer);
   *   self.postMessage({ decoded, id }, [decoded]);
   * });
   * ```
   * The way the above code is built into a worker by the `createWorker()` function
   * depends on the used bundler. For most bundlers, something like this will work:
   * ```js
   * function createWorker() {
   *   return new Worker(new URL('./my-custom-worker.js', import.meta.url));
   * }
   * ```
   */
  constructor() {
    let size = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : defaultPoolSize;
    let createWorker = arguments.length > 1 ? arguments[1] : undefined;
    this.workers = null;
    this._awaitingDecoder = null;
    this.size = size;
    this.messageId = 0;
    if (size) {
      this._awaitingDecoder = createWorker ? Promise.resolve(createWorker) : new Promise(resolve => {
        __webpack_require__.e(/* import() */ 578).then(__webpack_require__.bind(__webpack_require__, 9578)).then(module => {
          resolve(module.create);
        });
      });
      this._awaitingDecoder.then(create => {
        this._awaitingDecoder = null;
        this.workers = [];
        for (let i = 0; i < size; i++) {
          this.workers.push({
            worker: create(),
            idle: true
          });
        }
      });
    }
  }

  /**
   * Decode the given block of bytes with the set compression method.
   * @param {ArrayBuffer} buffer the array buffer of bytes to decode.
   * @returns {Promise<ArrayBuffer>} the decoded result as a `Promise`
   */
  async decode(fileDirectory, buffer) {
    if (this._awaitingDecoder) {
      await this._awaitingDecoder;
    }
    return this.size === 0 ? (0,compression/* getDecoder */.f)(fileDirectory).then(decoder => decoder.decode(fileDirectory, buffer)) : new Promise(resolve => {
      const worker = this.workers.find(candidate => candidate.idle) || this.workers[Math.floor(Math.random() * this.size)];
      worker.idle = false;
      const id = this.messageId++;
      const onMessage = e => {
        if (e.data.id === id) {
          worker.idle = true;
          resolve(e.data.decoded);
          worker.worker.removeEventListener('message', onMessage);
        }
      };
      worker.worker.addEventListener('message', onMessage);
      worker.worker.postMessage({
        fileDirectory,
        buffer,
        id
      }, [buffer]);
    });
  }
  destroy() {
    if (this.workers) {
      this.workers.forEach(worker => {
        worker.worker.terminate();
      });
      this.workers = null;
    }
  }
}
/* harmony default export */ const pool = (Pool);
;// CONCATENATED MODULE: ./src_geotiff/source/httputils.js
const CRLFCRLF = '\r\n\r\n';

/*
 * Shim for 'Object.fromEntries'
 */
function itemsToObject(items) {
  if (typeof Object.fromEntries !== 'undefined') {
    return Object.fromEntries(items);
  }
  const obj = {};
  for (const [key, value] of items) {
    obj[key.toLowerCase()] = value;
  }
  return obj;
}

/**
 * Parse HTTP headers from a given string.
 * @param {String} text the text to parse the headers from
 * @returns {Object} the parsed headers with lowercase keys
 */
function parseHeaders(text) {
  const items = text.split('\r\n').map(line => {
    const kv = line.split(':').map(str => str.trim());
    kv[0] = kv[0].toLowerCase();
    return kv;
  });
  return itemsToObject(items);
}

/**
 * Parse a 'Content-Type' header value to the content-type and parameters
 * @param {String} rawContentType the raw string to parse from
 * @returns {Object} the parsed content type with the fields: type and params
 */
function parseContentType(rawContentType) {
  const [type, ...rawParams] = rawContentType.split(';').map(s => s.trim());
  const paramsItems = rawParams.map(param => param.split('='));
  return {
    type,
    params: itemsToObject(paramsItems)
  };
}

/**
 * Parse a 'Content-Range' header value to its start, end, and total parts
 * @param {String} rawContentRange the raw string to parse from
 * @returns {Object} the parsed parts
 */
function parseContentRange(rawContentRange) {
  let start;
  let end;
  let total;
  if (rawContentRange) {
    [, start, end, total] = rawContentRange.match(/bytes (\d+)-(\d+)\/(\d+)/);
    start = parseInt(start, 10);
    end = parseInt(end, 10);
    total = parseInt(total, 10);
  }
  return {
    start,
    end,
    total
  };
}

/**
 * Parses a list of byteranges from the given 'multipart/byteranges' HTTP response.
 * Each item in the list has the following properties:
 * - headers: the HTTP headers
 * - data: the sliced ArrayBuffer for that specific part
 * - offset: the offset of the byterange within its originating file
 * - length: the length of the byterange
 * @param {ArrayBuffer} responseArrayBuffer the response to be parsed and split
 * @param {String} boundary the boundary string used to split the sections
 * @returns {Object[]} the parsed byteranges
 */
function parseByteRanges(responseArrayBuffer, boundary) {
  let offset = null;
  const decoder = new TextDecoder('ascii');
  const out = [];
  const startBoundary = `--${boundary}`;
  const endBoundary = `${startBoundary}--`;

  // search for the initial boundary, may be offset by some bytes
  // TODO: more efficient to check for `--` in bytes directly
  for (let i = 0; i < 10; ++i) {
    const text = decoder.decode(new Uint8Array(responseArrayBuffer, i, startBoundary.length));
    if (text === startBoundary) {
      offset = i;
    }
  }
  if (offset === null) {
    throw new Error('Could not find initial boundary');
  }
  while (offset < responseArrayBuffer.byteLength) {
    const text = decoder.decode(new Uint8Array(responseArrayBuffer, offset, Math.min(startBoundary.length + 1024, responseArrayBuffer.byteLength - offset)));

    // break if we arrived at the end
    if (text.length === 0 || text.startsWith(endBoundary)) {
      break;
    }

    // assert that we are actually dealing with a byterange and are at the correct offset
    if (!text.startsWith(startBoundary)) {
      throw new Error('Part does not start with boundary');
    }

    // get a substring from where we read the headers
    const innerText = text.substr(startBoundary.length + 2);
    if (innerText.length === 0) {
      break;
    }

    // find the double linebreak that denotes the end of the headers
    const endOfHeaders = innerText.indexOf(CRLFCRLF);

    // parse the headers to get the content range size
    const headers = parseHeaders(innerText.substr(0, endOfHeaders));
    const {
      start,
      end,
      total
    } = parseContentRange(headers['content-range']);

    // calculate the length of the slice and the next offset
    const startOfData = offset + startBoundary.length + endOfHeaders + CRLFCRLF.length;
    const length = parseInt(end, 10) + 1 - parseInt(start, 10);
    out.push({
      headers,
      data: responseArrayBuffer.slice(startOfData, startOfData + length),
      offset: start,
      length,
      fileSize: total
    });
    offset = startOfData + length + 4;
  }
  return out;
}
;// CONCATENATED MODULE: ./src_geotiff/source/basesource.js
/**
 * @typedef Slice
 * @property {number} offset
 * @property {number} length
 */

class BaseSource {
  /**
   *
   * @param {Slice[]} slices
   * @returns {ArrayBuffer[]}
   */
  async fetch(slices) {
    let signal = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
    return Promise.all(slices.map(slice => this.fetchSlice(slice, signal)));
  }

  /**
   *
   * @param {Slice} slice
   * @returns {ArrayBuffer}
   */
  async fetchSlice(slice) {
    throw new Error(`fetching of slice ${slice} not possible, not implemented`);
  }

  /**
   * Returns the filesize if already determined and null otherwise
   */
  get fileSize() {
    return null;
  }
  async close() {
    // no-op by default
  }
}
;// CONCATENATED MODULE: ./node_modules/quick-lru/index.js
class QuickLRU extends Map {
	#size = 0;
	#cache = new Map();
	#oldCache = new Map();
	#maxSize;
	#maxAge;
	#onEviction;

	constructor(options = {}) {
		super();

		if (!(options.maxSize && options.maxSize > 0)) {
			throw new TypeError('`maxSize` must be a number greater than 0');
		}

		if (typeof options.maxAge === 'number' && options.maxAge === 0) {
			throw new TypeError('`maxAge` must be a number greater than 0');
		}

		this.#maxSize = options.maxSize;
		this.#maxAge = options.maxAge || Number.POSITIVE_INFINITY;
		this.#onEviction = options.onEviction;
	}

	// For tests.
	get __oldCache() {
		return this.#oldCache;
	}

	#emitEvictions(cache) {
		if (typeof this.#onEviction !== 'function') {
			return;
		}

		for (const [key, item] of cache) {
			this.#onEviction(key, item.value);
		}
	}

	#deleteIfExpired(key, item) {
		if (typeof item.expiry === 'number' && item.expiry <= Date.now()) {
			if (typeof this.#onEviction === 'function') {
				this.#onEviction(key, item.value);
			}

			return this.delete(key);
		}

		return false;
	}

	#getOrDeleteIfExpired(key, item) {
		const deleted = this.#deleteIfExpired(key, item);
		if (deleted === false) {
			return item.value;
		}
	}

	#getItemValue(key, item) {
		return item.expiry ? this.#getOrDeleteIfExpired(key, item) : item.value;
	}

	#peek(key, cache) {
		const item = cache.get(key);

		return this.#getItemValue(key, item);
	}

	#set(key, value) {
		this.#cache.set(key, value);
		this.#size++;

		if (this.#size >= this.#maxSize) {
			this.#size = 0;
			this.#emitEvictions(this.#oldCache);
			this.#oldCache = this.#cache;
			this.#cache = new Map();
		}
	}

	#moveToRecent(key, item) {
		this.#oldCache.delete(key);
		this.#set(key, item);
	}

	* #entriesAscending() {
		for (const item of this.#oldCache) {
			const [key, value] = item;
			if (!this.#cache.has(key)) {
				const deleted = this.#deleteIfExpired(key, value);
				if (deleted === false) {
					yield item;
				}
			}
		}

		for (const item of this.#cache) {
			const [key, value] = item;
			const deleted = this.#deleteIfExpired(key, value);
			if (deleted === false) {
				yield item;
			}
		}
	}

	get(key) {
		if (this.#cache.has(key)) {
			const item = this.#cache.get(key);
			return this.#getItemValue(key, item);
		}

		if (this.#oldCache.has(key)) {
			const item = this.#oldCache.get(key);
			if (this.#deleteIfExpired(key, item) === false) {
				this.#moveToRecent(key, item);
				return item.value;
			}
		}
	}

	set(key, value, {maxAge = this.#maxAge} = {}) {
		const expiry = typeof maxAge === 'number' && maxAge !== Number.POSITIVE_INFINITY
			? (Date.now() + maxAge)
			: undefined;

		if (this.#cache.has(key)) {
			this.#cache.set(key, {
				value,
				expiry,
			});
		} else {
			this.#set(key, {value, expiry});
		}

		return this;
	}

	has(key) {
		if (this.#cache.has(key)) {
			return !this.#deleteIfExpired(key, this.#cache.get(key));
		}

		if (this.#oldCache.has(key)) {
			return !this.#deleteIfExpired(key, this.#oldCache.get(key));
		}

		return false;
	}

	peek(key) {
		if (this.#cache.has(key)) {
			return this.#peek(key, this.#cache);
		}

		if (this.#oldCache.has(key)) {
			return this.#peek(key, this.#oldCache);
		}
	}

	delete(key) {
		const deleted = this.#cache.delete(key);
		if (deleted) {
			this.#size--;
		}

		return this.#oldCache.delete(key) || deleted;
	}

	clear() {
		this.#cache.clear();
		this.#oldCache.clear();
		this.#size = 0;
	}

	resize(newSize) {
		if (!(newSize && newSize > 0)) {
			throw new TypeError('`maxSize` must be a number greater than 0');
		}

		const items = [...this.#entriesAscending()];
		const removeCount = items.length - newSize;
		if (removeCount < 0) {
			this.#cache = new Map(items);
			this.#oldCache = new Map();
			this.#size = items.length;
		} else {
			if (removeCount > 0) {
				this.#emitEvictions(items.slice(0, removeCount));
			}

			this.#oldCache = new Map(items.slice(removeCount));
			this.#cache = new Map();
			this.#size = 0;
		}

		this.#maxSize = newSize;
	}

	* keys() {
		for (const [key] of this) {
			yield key;
		}
	}

	* values() {
		for (const [, value] of this) {
			yield value;
		}
	}

	* [Symbol.iterator]() {
		for (const item of this.#cache) {
			const [key, value] = item;
			const deleted = this.#deleteIfExpired(key, value);
			if (deleted === false) {
				yield [key, value.value];
			}
		}

		for (const item of this.#oldCache) {
			const [key, value] = item;
			if (!this.#cache.has(key)) {
				const deleted = this.#deleteIfExpired(key, value);
				if (deleted === false) {
					yield [key, value.value];
				}
			}
		}
	}

	* entriesDescending() {
		let items = [...this.#cache];
		for (let i = items.length - 1; i >= 0; --i) {
			const item = items[i];
			const [key, value] = item;
			const deleted = this.#deleteIfExpired(key, value);
			if (deleted === false) {
				yield [key, value.value];
			}
		}

		items = [...this.#oldCache];
		for (let i = items.length - 1; i >= 0; --i) {
			const item = items[i];
			const [key, value] = item;
			if (!this.#cache.has(key)) {
				const deleted = this.#deleteIfExpired(key, value);
				if (deleted === false) {
					yield [key, value.value];
				}
			}
		}
	}

	* entriesAscending() {
		for (const [key, value] of this.#entriesAscending()) {
			yield [key, value.value];
		}
	}

	get size() {
		if (!this.#size) {
			return this.#oldCache.size;
		}

		let oldCacheSize = 0;
		for (const key of this.#oldCache.keys()) {
			if (!this.#cache.has(key)) {
				oldCacheSize++;
			}
		}

		return Math.min(this.#size + oldCacheSize, this.#maxSize);
	}

	get maxSize() {
		return this.#maxSize;
	}

	entries() {
		return this.entriesAscending();
	}

	forEach(callbackFunction, thisArgument = this) {
		for (const [key, value] of this.entriesAscending()) {
			callbackFunction.call(thisArgument, value, key, this);
		}
	}

	get [Symbol.toStringTag]() {
		return JSON.stringify([...this.entriesAscending()]);
	}
}

;// CONCATENATED MODULE: ./src_geotiff/utils.js
function utils_assign(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      target[key] = source[key];
    }
  }
}
function chunk(iterable, length) {
  const results = [];
  const lengthOfIterable = iterable.length;
  for (let i = 0; i < lengthOfIterable; i += length) {
    const chunked = [];
    for (let ci = i; ci < i + length; ci++) {
      chunked.push(iterable[ci]);
    }
    results.push(chunked);
  }
  return results;
}
function endsWith(string, expectedEnding) {
  if (string.length < expectedEnding.length) {
    return false;
  }
  const actualEnding = string.substr(string.length - expectedEnding.length);
  return actualEnding === expectedEnding;
}
function forEach(iterable, func) {
  const {
    length
  } = iterable;
  for (let i = 0; i < length; i++) {
    func(iterable[i], i);
  }
}
function invert(oldObj) {
  const newObj = {};
  for (const key in oldObj) {
    if (oldObj.hasOwnProperty(key)) {
      const value = oldObj[key];
      newObj[value] = key;
    }
  }
  return newObj;
}
function range(n) {
  const results = [];
  for (let i = 0; i < n; i++) {
    results.push(i);
  }
  return results;
}
function times(numTimes, func) {
  const results = [];
  for (let i = 0; i < numTimes; i++) {
    results.push(func(i));
  }
  return results;
}
function toArray(iterable) {
  const results = [];
  const {
    length
  } = iterable;
  for (let i = 0; i < length; i++) {
    results.push(iterable[i]);
  }
  return results;
}
function toArrayRecursively(input) {
  if (input.length) {
    return toArray(input).map(toArrayRecursively);
  }
  return input;
}

// copied from https://github.com/academia-de-codigo/parse-content-range-header/blob/master/index.js
function utils_parseContentRange(headerValue) {
  if (!headerValue) {
    return null;
  }
  if (typeof headerValue !== 'string') {
    throw new Error('invalid argument');
  }
  const parseInt = number => Number.parseInt(number, 10);

  // Check for presence of unit
  let matches = headerValue.match(/^(\w*) /);
  const unit = matches && matches[1];

  // check for start-end/size header format
  matches = headerValue.match(/(\d+)-(\d+)\/(\d+|\*)/);
  if (matches) {
    return {
      unit,
      first: parseInt(matches[1]),
      last: parseInt(matches[2]),
      length: matches[3] === '*' ? null : parseInt(matches[3])
    };
  }

  // check for size header format
  matches = headerValue.match(/(\d+|\*)/);
  if (matches) {
    return {
      unit,
      first: null,
      last: null,
      length: matches[1] === '*' ? null : parseInt(matches[1])
    };
  }
  return null;
}

/*
 * Promisified wrapper around 'setTimeout' to allow 'await'
 */
async function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
function zip(a, b) {
  const A = Array.isArray(a) ? a : Array.from(a);
  const B = Array.isArray(b) ? b : Array.from(b);
  return A.map((k, i) => [k, B[i]]);
}

// Based on https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
class AbortError extends Error {
  constructor(params) {
    // Pass remaining arguments (including vendor specific ones) to parent constructor
    super(params);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AbortError);
    }
    this.name = 'AbortError';
  }
}
class CustomAggregateError extends Error {
  constructor(errors, message) {
    super(message);
    this.errors = errors;
    this.message = message;
    this.name = 'AggregateError';
  }
}
const AggregateError = CustomAggregateError;
;// CONCATENATED MODULE: ./src_geotiff/source/blockedsource.js



class Block {
  /**
   *
   * @param {number} offset
   * @param {number} length
   * @param {ArrayBuffer} [data]
   */
  constructor(offset, length) {
    let data = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    this.offset = offset;
    this.length = length;
    this.data = data;
  }

  /**
   * @returns {number} the top byte border
   */
  get top() {
    return this.offset + this.length;
  }
}
class BlockGroup {
  /**
   *
   * @param {number} offset
   * @param {number} length
   * @param {number[]} blockIds
   */
  constructor(offset, length, blockIds) {
    this.offset = offset;
    this.length = length;
    this.blockIds = blockIds;
  }
}
class BlockedSource extends BaseSource {
  /**
   *
   * @param {BaseSource} source The underlying source that shall be blocked and cached
   * @param {object} options
   * @param {number} [options.blockSize]
   * @param {number} [options.cacheSize]
   */
  constructor(source) {
    let {
      blockSize = 65536,
      cacheSize = 100
    } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    super();
    this.source = source;
    this.blockSize = blockSize;
    this.blockCache = new QuickLRU({
      maxSize: cacheSize,
      onEviction: (blockId, block) => {
        this.evictedBlocks.set(blockId, block);
      }
    });

    /** @type {Map<number, Block>} */
    this.evictedBlocks = new Map();

    // mapping blockId -> Block instance
    this.blockRequests = new Map();

    // set of blockIds missing for the current requests
    this.blockIdsToFetch = new Set();
    this.abortedBlockIds = new Set();
  }
  get fileSize() {
    return this.source.fileSize;
  }

  /**
   *
   * @param {import("./basesource").Slice[]} slices
   */
  async fetch(slices, signal) {
    const blockRequests = [];
    const missingBlockIds = [];
    const allBlockIds = [];
    this.evictedBlocks.clear();
    for (const {
      offset,
      length
    } of slices) {
      let top = offset + length;
      const {
        fileSize
      } = this;
      if (fileSize !== null) {
        top = Math.min(top, fileSize);
      }
      const firstBlockOffset = Math.floor(offset / this.blockSize) * this.blockSize;
      for (let current = firstBlockOffset; current < top; current += this.blockSize) {
        const blockId = Math.floor(current / this.blockSize);
        if (!this.blockCache.has(blockId) && !this.blockRequests.has(blockId)) {
          this.blockIdsToFetch.add(blockId);
          missingBlockIds.push(blockId);
        }
        if (this.blockRequests.has(blockId)) {
          blockRequests.push(this.blockRequests.get(blockId));
        }
        allBlockIds.push(blockId);
      }
    }

    // allow additional block requests to accumulate
    await wait();
    this.fetchBlocks(signal);

    // Gather all of the new requests that this fetch call is contributing to `fetch`.
    const missingRequests = [];
    for (const blockId of missingBlockIds) {
      // The requested missing block could already be in the cache
      // instead of having its request still be outstanding.
      if (this.blockRequests.has(blockId)) {
        missingRequests.push(this.blockRequests.get(blockId));
      }
    }

    // Actually await all pending requests that are needed for this `fetch`.
    await Promise.allSettled(blockRequests);
    await Promise.allSettled(missingRequests);

    // Perform retries if a block was interrupted by a previous signal
    const abortedBlockRequests = [];
    const abortedBlockIds = allBlockIds.filter(id => this.abortedBlockIds.has(id) || !this.blockCache.has(id));
    abortedBlockIds.forEach(id => this.blockIdsToFetch.add(id));
    // start the retry of some blocks if required
    if (abortedBlockIds.length > 0 && signal && !signal.aborted) {
      this.fetchBlocks(null);
      for (const blockId of abortedBlockIds) {
        const block = this.blockRequests.get(blockId);
        if (!block) {
          throw new Error(`Block ${blockId} is not in the block requests`);
        }
        abortedBlockRequests.push(block);
      }
      await Promise.allSettled(abortedBlockRequests);
    }

    // throw an  abort error
    if (signal && signal.aborted) {
      throw new AbortError('Request was aborted');
    }
    const blocks = allBlockIds.map(id => this.blockCache.get(id) || this.evictedBlocks.get(id));
    const failedBlocks = blocks.filter(i => !i);
    if (failedBlocks.length) {
      throw new AggregateError(failedBlocks, 'Request failed');
    }

    // create a final Map, with all required blocks for this request to satisfy
    const requiredBlocks = new Map(zip(allBlockIds, blocks));

    // TODO: satisfy each slice
    return this.readSliceData(slices, requiredBlocks);
  }

  /**
   *
   * @param {AbortSignal} signal
   */
  fetchBlocks(signal) {
    // check if we still need to
    if (this.blockIdsToFetch.size > 0) {
      const groups = this.groupBlocks(this.blockIdsToFetch);

      // start requesting slices of data
      const groupRequests = this.source.fetch(groups, signal);
      for (let groupIndex = 0; groupIndex < groups.length; ++groupIndex) {
        const group = groups[groupIndex];
        for (const blockId of group.blockIds) {
          // make an async IIFE for each block
          this.blockRequests.set(blockId, (async () => {
            try {
              const response = (await groupRequests)[groupIndex];
              const blockOffset = blockId * this.blockSize;
              const o = blockOffset - response.offset;
              const t = Math.min(o + this.blockSize, response.data.byteLength);
              const data = response.data.slice(o, t);
              const block = new Block(blockOffset, data.byteLength, data, blockId);
              this.blockCache.set(blockId, block);
              this.abortedBlockIds.delete(blockId);
            } catch (err) {
              if (err.name === 'AbortError') {
                // store the signal here, we need it to determine later if an
                // error was caused by this signal
                err.signal = signal;
                this.blockCache.delete(blockId);
                this.abortedBlockIds.add(blockId);
              } else {
                throw err;
              }
            } finally {
              this.blockRequests.delete(blockId);
            }
          })());
        }
      }
      this.blockIdsToFetch.clear();
    }
  }

  /**
   *
   * @param {Set} blockIds
   * @returns {BlockGroup[]}
   */
  groupBlocks(blockIds) {
    const sortedBlockIds = Array.from(blockIds).sort((a, b) => a - b);
    if (sortedBlockIds.length === 0) {
      return [];
    }
    let current = [];
    let lastBlockId = null;
    const groups = [];
    for (const blockId of sortedBlockIds) {
      if (lastBlockId === null || lastBlockId + 1 === blockId) {
        current.push(blockId);
        lastBlockId = blockId;
      } else {
        groups.push(new BlockGroup(current[0] * this.blockSize, current.length * this.blockSize, current));
        current = [blockId];
        lastBlockId = blockId;
      }
    }
    groups.push(new BlockGroup(current[0] * this.blockSize, current.length * this.blockSize, current));
    return groups;
  }

  /**
   *
   * @param {import("./basesource").Slice[]} slices
   * @param {Map} blocks
   */
  readSliceData(slices, blocks) {
    return slices.map(slice => {
      let top = slice.offset + slice.length;
      if (this.fileSize !== null) {
        top = Math.min(this.fileSize, top);
      }
      const blockIdLow = Math.floor(slice.offset / this.blockSize);
      const blockIdHigh = Math.floor(top / this.blockSize);
      const sliceData = new ArrayBuffer(slice.length);
      const sliceView = new Uint8Array(sliceData);
      for (let blockId = blockIdLow; blockId <= blockIdHigh; ++blockId) {
        const block = blocks.get(blockId);
        const delta = block.offset - slice.offset;
        const topDelta = block.top - top;
        let blockInnerOffset = 0;
        let rangeInnerOffset = 0;
        let usedBlockLength;
        if (delta < 0) {
          blockInnerOffset = -delta;
        } else if (delta > 0) {
          rangeInnerOffset = delta;
        }
        if (topDelta < 0) {
          usedBlockLength = block.length - blockInnerOffset;
        } else {
          usedBlockLength = top - block.offset - blockInnerOffset;
        }
        const blockView = new Uint8Array(block.data, blockInnerOffset, usedBlockLength);
        sliceView.set(blockView, rangeInnerOffset);
      }
      return sliceData;
    });
  }
}
;// CONCATENATED MODULE: ./src_geotiff/source/client/base.js
class BaseResponse {
  /**
   * Returns whether the response has an ok'ish status code
   */
  get ok() {
    return this.status >= 200 && this.status <= 299;
  }

  /**
   * Returns the status code of the response
   */
  get status() {
    throw new Error('not implemented');
  }

  /**
   * Returns the value of the specified header
   * @param {string} headerName the header name
   * @returns {string} the header value
   */
  getHeader(headerName) {
    // eslint-disable-line no-unused-vars
    throw new Error('not implemented');
  }

  /**
   * @returns {ArrayBuffer} the response data of the request
   */
  async getData() {
    throw new Error('not implemented');
  }
}
class BaseClient {
  constructor(url) {
    this.url = url;
  }

  /**
   * Send a request with the options
   * @param {{headers: HeadersInit, signal: AbortSignal}} [options={}]
   * @returns {Promise<BaseResponse>}
   */
  async request() {
    let {
      headers,
      signal
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    // eslint-disable-line no-unused-vars
    throw new Error('request is not implemented');
  }
}
;// CONCATENATED MODULE: ./src_geotiff/source/client/fetch.js

class FetchResponse extends BaseResponse {
  /**
   * BaseResponse facade for fetch API Response
   * @param {Response} response
   */
  constructor(response) {
    super();
    this.response = response;
  }
  get status() {
    return this.response.status;
  }
  getHeader(name) {
    return this.response.headers.get(name);
  }
  async getData() {
    const data = this.response.arrayBuffer ? await this.response.arrayBuffer() : (await this.response.buffer()).buffer;
    return data;
  }
}
class FetchClient extends BaseClient {
  constructor(url, credentials) {
    super(url);
    this.credentials = credentials;
  }

  /**
   * @param {{headers: HeadersInit, signal: AbortSignal}} [options={}]
   * @returns {Promise<FetchResponse>}
   */
  async request() {
    let {
      headers,
      signal
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    const response = await fetch(this.url, {
      headers,
      credentials: this.credentials,
      signal
    });
    return new FetchResponse(response);
  }
}
;// CONCATENATED MODULE: ./src_geotiff/source/client/xhr.js


class XHRResponse extends BaseResponse {
  /**
   * BaseResponse facade for XMLHttpRequest
   * @param {XMLHttpRequest} xhr
   * @param {ArrayBuffer} data
   */
  constructor(xhr, data) {
    super();
    this.xhr = xhr;
    this.data = data;
  }
  get status() {
    return this.xhr.status;
  }
  getHeader(name) {
    return this.xhr.getResponseHeader(name);
  }
  async getData() {
    return this.data;
  }
}
class XHRClient extends BaseClient {
  constructRequest(headers, signal) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', this.url);
      xhr.responseType = 'arraybuffer';
      for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value);
      }

      // hook signals
      xhr.onload = () => {
        const data = xhr.response;
        resolve(new XHRResponse(xhr, data));
      };
      xhr.onerror = reject;
      xhr.onabort = () => reject(new AbortError('Request aborted'));
      xhr.send();
      if (signal) {
        if (signal.aborted) {
          xhr.abort();
        }
        signal.addEventListener('abort', () => xhr.abort());
      }
    });
  }
  async request() {
    let {
      headers,
      signal
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    const response = await this.constructRequest(headers, signal);
    return response;
  }
}
// EXTERNAL MODULE: http (ignored)
var http_ignored_ = __webpack_require__(1677);
var http_ignored_default = /*#__PURE__*/__webpack_require__.n(http_ignored_);
// EXTERNAL MODULE: https (ignored)
var https_ignored_ = __webpack_require__(76);
var https_ignored_default = /*#__PURE__*/__webpack_require__.n(https_ignored_);
// EXTERNAL MODULE: ./node_modules/url/url.js
var url_url = __webpack_require__(8835);
;// CONCATENATED MODULE: ./src_geotiff/source/client/http.js





class HttpResponse extends BaseResponse {
  /**
   * BaseResponse facade for node HTTP/HTTPS API Response
   * @param {http.ServerResponse} response
   */
  constructor(response, dataPromise) {
    super();
    this.response = response;
    this.dataPromise = dataPromise;
  }
  get status() {
    return this.response.statusCode;
  }
  getHeader(name) {
    return this.response.headers[name];
  }
  async getData() {
    const data = await this.dataPromise;
    return data;
  }
}
class HttpClient extends BaseClient {
  constructor(url) {
    super(url);
    this.parsedUrl = url_url.parse(this.url);
    this.httpApi = this.parsedUrl.protocol === 'http:' ? (http_ignored_default()) : (https_ignored_default());
  }
  constructRequest(headers, signal) {
    return new Promise((resolve, reject) => {
      const request = this.httpApi.get({
        ...this.parsedUrl,
        headers
      }, response => {
        const dataPromise = new Promise(resolveData => {
          const chunks = [];

          // collect chunks
          response.on('data', chunk => {
            chunks.push(chunk);
          });

          // concatenate all chunks and resolve the promise with the resulting buffer
          response.on('end', () => {
            const data = Buffer.concat(chunks).buffer;
            resolveData(data);
          });
          response.on('error', reject);
        });
        resolve(new HttpResponse(response, dataPromise));
      });
      request.on('error', reject);
      if (signal) {
        if (signal.aborted) {
          request.destroy(new AbortError('Request aborted'));
        }
        signal.addEventListener('abort', () => request.destroy(new AbortError('Request aborted')));
      }
    });
  }
  async request() {
    let {
      headers,
      signal
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    const response = await this.constructRequest(headers, signal);
    return response;
  }
}
;// CONCATENATED MODULE: ./src_geotiff/source/remote.js






class RemoteSource extends BaseSource {
  /**
   *
   * @param {BaseClient} client
   * @param {object} headers
   * @param {numbers} maxRanges
   * @param {boolean} allowFullFile
   */
  constructor(client, headers, maxRanges, allowFullFile) {
    super();
    this.client = client;
    this.headers = headers;
    this.maxRanges = maxRanges;
    this.allowFullFile = allowFullFile;
    this._fileSize = null;
  }

  /**
   *
   * @param {Slice[]} slices
   */
  async fetch(slices, signal) {
    // if we allow multi-ranges, split the incoming request into that many sub-requests
    // and join them afterwards
    if (this.maxRanges >= slices.length) {
      return this.fetchSlices(slices, signal);
    } else if (this.maxRanges > 0 && slices.length > 1) {
      // TODO: split into multiple multi-range requests

      // const subSlicesRequests = [];
      // for (let i = 0; i < slices.length; i += this.maxRanges) {
      //   subSlicesRequests.push(
      //     this.fetchSlices(slices.slice(i, i + this.maxRanges), signal),
      //   );
      // }
      // return (await Promise.all(subSlicesRequests)).flat();
    }

    // otherwise make a single request for each slice
    return Promise.all(slices.map(slice => this.fetchSlice(slice, signal)));
  }
  async fetchSlices(slices, signal) {
    const response = await this.client.request({
      headers: {
        ...this.headers,
        Range: `bytes=${slices.map(_ref => {
          let {
            offset,
            length
          } = _ref;
          return `${offset}-${offset + length}`;
        }).join(',')}`
      },
      signal
    });
    if (!response.ok) {
      throw new Error('Error fetching data.');
    } else if (response.status === 206) {
      const {
        type,
        params
      } = parseContentType(response.getHeader('content-type'));
      if (type === 'multipart/byteranges') {
        const byteRanges = parseByteRanges(await response.getData(), params.boundary);
        this._fileSize = byteRanges[0].fileSize || null;
        return byteRanges;
      }
      const data = await response.getData();
      const {
        start,
        end,
        total
      } = parseContentRange(response.getHeader('content-range'));
      this._fileSize = total || null;
      const first = [{
        data,
        offset: start,
        length: end - start
      }];
      if (slices.length > 1) {
        // we requested more than one slice, but got only the first
        // unfortunately, some HTTP Servers don't support multi-ranges
        // and return only the first

        // get the rest of the slices and fetch them iteratively
        const others = await Promise.all(slices.slice(1).map(slice => this.fetchSlice(slice, signal)));
        return first.concat(others);
      }
      return first;
    } else {
      if (!this.allowFullFile) {
        throw new Error('Server responded with full file');
      }
      const data = await response.getData();
      this._fileSize = data.byteLength;
      return [{
        data,
        offset: 0,
        length: data.byteLength
      }];
    }
  }
  async fetchSlice(slice, signal) {
    const {
      offset,
      length
    } = slice;
    const response = await this.client.request({
      headers: {
        ...this.headers,
        Range: `bytes=${offset}-${offset + length}`
      },
      signal
    });

    // check the response was okay and if the server actually understands range requests
    if (!response.ok) {
      throw new Error('Error fetching data.');
    } else if (response.status === 206) {
      const data = await response.getData();
      const {
        total
      } = parseContentRange(response.getHeader('content-range'));
      this._fileSize = total || null;
      return {
        data,
        offset,
        length
      };
    } else {
      if (!this.allowFullFile) {
        throw new Error('Server responded with full file');
      }
      const data = await response.getData();
      this._fileSize = data.byteLength;
      return {
        data,
        offset: 0,
        length: data.byteLength
      };
    }
  }
  get fileSize() {
    return this._fileSize;
  }
}
function maybeWrapInBlockedSource(source, _ref2) {
  let {
    blockSize,
    cacheSize
  } = _ref2;
  if (blockSize === null) {
    return source;
  }
  return new BlockedSource(source, {
    blockSize,
    cacheSize
  });
}
function makeFetchSource(url) {
  let {
    headers = {},
    credentials,
    maxRanges = 0,
    allowFullFile = false,
    ...blockOptions
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const client = new FetchClient(url, credentials);
  const source = new RemoteSource(client, headers, maxRanges, allowFullFile);
  return maybeWrapInBlockedSource(source, blockOptions);
}
function makeXHRSource(url) {
  let {
    headers = {},
    maxRanges = 0,
    allowFullFile = false,
    ...blockOptions
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const client = new XHRClient(url);
  const source = new RemoteSource(client, headers, maxRanges, allowFullFile);
  return maybeWrapInBlockedSource(source, blockOptions);
}
function makeHttpSource(url) {
  let {
    headers = {},
    maxRanges = 0,
    allowFullFile = false,
    ...blockOptions
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const client = new HttpClient(url);
  const source = new RemoteSource(client, headers, maxRanges, allowFullFile);
  return maybeWrapInBlockedSource(source, blockOptions);
}
function makeCustomSource(client) {
  let {
    headers = {},
    maxRanges = 0,
    allowFullFile = false,
    ...blockOptions
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const source = new RemoteSource(client, headers, maxRanges, allowFullFile);
  return maybeWrapInBlockedSource(source, blockOptions);
}

/**
 *
 * @param {string} url
 * @param {object} options
 */
function makeRemoteSource(url) {
  let {
    forceXHR = false,
    ...clientOptions
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (typeof fetch === 'function' && !forceXHR) {
    return makeFetchSource(url, clientOptions);
  }
  if (typeof XMLHttpRequest !== 'undefined') {
    return makeXHRSource(url, clientOptions);
  }
  return makeHttpSource(url, clientOptions);
}
;// CONCATENATED MODULE: ./src_geotiff/source/arraybuffer.js


class ArrayBufferSource extends BaseSource {
  constructor(arrayBuffer) {
    super();
    this.arrayBuffer = arrayBuffer;
  }
  fetchSlice(slice, signal) {
    if (signal && signal.aborted) {
      throw new AbortError('Request aborted');
    }
    return this.arrayBuffer.slice(slice.offset, slice.offset + slice.length);
  }
}
function makeBufferSource(arrayBuffer) {
  return new ArrayBufferSource(arrayBuffer);
}
;// CONCATENATED MODULE: ./src_geotiff/source/filereader.js

class FileReaderSource extends BaseSource {
  constructor(file) {
    super();
    this.file = file;
  }
  async fetchSlice(slice, signal) {
    return new Promise((resolve, reject) => {
      const blob = this.file.slice(slice.offset, slice.offset + slice.length);
      const reader = new FileReader();
      reader.onload = event => resolve(event.target.result);
      reader.onerror = reject;
      reader.onabort = reject;
      reader.readAsArrayBuffer(blob);
      if (signal) {
        signal.addEventListener('abort', () => reader.abort());
      }
    });
  }
}

/**
 * Create a new source from a given file/blob.
 * @param {Blob} file The file or blob to read from.
 * @returns The constructed source
 */
function makeFileReaderSource(file) {
  return new FileReaderSource(file);
}
// EXTERNAL MODULE: fs (ignored)
var fs_ignored_ = __webpack_require__(5248);
var fs_ignored_default = /*#__PURE__*/__webpack_require__.n(fs_ignored_);
;// CONCATENATED MODULE: ./src_geotiff/source/file.js


function closeAsync(fd) {
  return new Promise((resolve, reject) => {
    fs_ignored_default().close(fd, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
function openAsync(path, flags) {
  let mode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;
  return new Promise((resolve, reject) => {
    fs_ignored_default().open(path, flags, mode, (err, fd) => {
      if (err) {
        reject(err);
      } else {
        resolve(fd);
      }
    });
  });
}
function readAsync() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }
  return new Promise((resolve, reject) => {
    fs_ignored_default().read(...args, (err, bytesRead, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          bytesRead,
          buffer
        });
      }
    });
  });
}
class FileSource extends BaseSource {
  constructor(path) {
    super();
    this.path = path;
    this.openRequest = openAsync(path, 'r');
  }
  async fetchSlice(slice) {
    // TODO: use `signal`
    const fd = await this.openRequest;
    const {
      buffer
    } = await readAsync(fd, Buffer.alloc(slice.length), 0, slice.length, slice.offset);
    return buffer.buffer;
  }
  async close() {
    const fd = await this.openRequest;
    await closeAsync(fd);
  }
}
function makeFileSource(path) {
  return new FileSource(path);
}
;// CONCATENATED MODULE: ./src_geotiff/geotiffwriter.js
/*
  Some parts of this file are based on UTIF.js,
  which was released under the MIT License.
  You can view that here:
  https://github.com/photopea/UTIF.js/blob/master/LICENSE
*/


const tagName2Code = invert(globals.fieldTagNames);
const geoKeyName2Code = invert(globals.geoKeyNames);
const name2code = {};
utils_assign(name2code, tagName2Code);
utils_assign(name2code, geoKeyName2Code);
const typeName2byte = invert(globals.fieldTypeNames);

// config variables
const numBytesInIfd = 1000;
const _binBE = {
  nextZero: (data, o) => {
    let oincr = o;
    while (data[oincr] !== 0) {
      oincr++;
    }
    return oincr;
  },
  readUshort: (buff, p) => {
    return buff[p] << 8 | buff[p + 1];
  },
  readShort: (buff, p) => {
    const a = _binBE.ui8;
    a[0] = buff[p + 1];
    a[1] = buff[p + 0];
    return _binBE.i16[0];
  },
  readInt: (buff, p) => {
    const a = _binBE.ui8;
    a[0] = buff[p + 3];
    a[1] = buff[p + 2];
    a[2] = buff[p + 1];
    a[3] = buff[p + 0];
    return _binBE.i32[0];
  },
  readUint: (buff, p) => {
    const a = _binBE.ui8;
    a[0] = buff[p + 3];
    a[1] = buff[p + 2];
    a[2] = buff[p + 1];
    a[3] = buff[p + 0];
    return _binBE.ui32[0];
  },
  readASCII: (buff, p, l) => {
    return l.map(i => String.fromCharCode(buff[p + i])).join('');
  },
  readFloat: (buff, p) => {
    const a = _binBE.ui8;
    times(4, i => {
      a[i] = buff[p + 3 - i];
    });
    return _binBE.fl32[0];
  },
  readDouble: (buff, p) => {
    const a = _binBE.ui8;
    times(8, i => {
      a[i] = buff[p + 7 - i];
    });
    return _binBE.fl64[0];
  },
  writeUshort: (buff, p, n) => {
    buff[p] = n >> 8 & 255;
    buff[p + 1] = n & 255;
  },
  writeUint: (buff, p, n) => {
    buff[p] = n >> 24 & 255;
    buff[p + 1] = n >> 16 & 255;
    buff[p + 2] = n >> 8 & 255;
    buff[p + 3] = n >> 0 & 255;
  },
  writeASCII: (buff, p, s) => {
    times(s.length, i => {
      buff[p + i] = s.charCodeAt(i);
    });
  },
  ui8: new Uint8Array(8)
};
_binBE.fl64 = new Float64Array(_binBE.ui8.buffer);
_binBE.writeDouble = (buff, p, n) => {
  _binBE.fl64[0] = n;
  times(8, i => {
    buff[p + i] = _binBE.ui8[7 - i];
  });
};
const _writeIFD = (bin, data, _offset, ifd) => {
  let offset = _offset;
  const keys = Object.keys(ifd).filter(key => {
    return key !== undefined && key !== null && key !== 'undefined';
  });
  bin.writeUshort(data, offset, keys.length);
  offset += 2;
  let eoff = offset + 12 * keys.length + 4;
  for (const key of keys) {
    let tag = null;
    if (typeof key === 'number') {
      tag = key;
    } else if (typeof key === 'string') {
      tag = parseInt(key, 10);
    }
    const typeName = globals.fieldTagTypes[tag];
    const typeNum = typeName2byte[typeName];
    if (typeName == null || typeName === undefined || typeof typeName === 'undefined') {
      throw new Error(`unknown type of tag: ${tag}`);
    }
    let val = ifd[key];
    if (val === undefined) {
      throw new Error(`failed to get value for key ${key}`);
    }

    // ASCIIZ format with trailing 0 character
    // http://www.fileformat.info/format/tiff/corion.htm
    // https://stackoverflow.com/questions/7783044/whats-the-difference-between-asciiz-vs-ascii
    if (typeName === 'ASCII' && typeof val === 'string' && endsWith(val, '\u0000') === false) {
      val += '\u0000';
    }
    const num = val.length;
    bin.writeUshort(data, offset, tag);
    offset += 2;
    bin.writeUshort(data, offset, typeNum);
    offset += 2;
    bin.writeUint(data, offset, num);
    offset += 4;
    let dlen = [-1, 1, 1, 2, 4, 8, 0, 0, 0, 0, 0, 0, 8][typeNum] * num;
    let toff = offset;
    if (dlen > 4) {
      bin.writeUint(data, offset, eoff);
      toff = eoff;
    }
    if (typeName === 'ASCII') {
      bin.writeASCII(data, toff, val);
    } else if (typeName === 'SHORT') {
      times(num, i => {
        bin.writeUshort(data, toff + 2 * i, val[i]);
      });
    } else if (typeName === 'LONG') {
      times(num, i => {
        bin.writeUint(data, toff + 4 * i, val[i]);
      });
    } else if (typeName === 'RATIONAL') {
      times(num, i => {
        bin.writeUint(data, toff + 8 * i, Math.round(val[i] * 10000));
        bin.writeUint(data, toff + 8 * i + 4, 10000);
      });
    } else if (typeName === 'DOUBLE') {
      times(num, i => {
        bin.writeDouble(data, toff + 8 * i, val[i]);
      });
    }
    if (dlen > 4) {
      dlen += dlen & 1;
      eoff += dlen;
    }
    offset += 4;
  }
  return [offset, eoff];
};
const encodeIfds = ifds => {
  const data = new Uint8Array(numBytesInIfd);
  let offset = 4;
  const bin = _binBE;

  // set big-endian byte-order
  // https://en.wikipedia.org/wiki/TIFF#Byte_order
  data[0] = 77;
  data[1] = 77;

  // set format-version number
  // https://en.wikipedia.org/wiki/TIFF#Byte_order
  data[3] = 42;
  let ifdo = 8;
  bin.writeUint(data, offset, ifdo);
  offset += 4;
  ifds.forEach((ifd, i) => {
    const noffs = _writeIFD(bin, data, ifdo, ifd);
    ifdo = noffs[1];
    if (i < ifds.length - 1) {
      bin.writeUint(data, noffs[0], ifdo);
    }
  });
  if (data.slice) {
    return data.slice(0, ifdo).buffer;
  }

  // node hasn't implemented slice on Uint8Array yet
  const result = new Uint8Array(ifdo);
  for (let i = 0; i < ifdo; i++) {
    result[i] = data[i];
  }
  return result.buffer;
};
const encodeImage = (values, width, height, metadata) => {
  if (height === undefined || height === null) {
    throw new Error(`you passed into encodeImage a width of type ${height}`);
  }
  if (width === undefined || width === null) {
    throw new Error(`you passed into encodeImage a width of type ${width}`);
  }
  const ifd = {
    256: [width],
    // ImageWidth
    257: [height],
    // ImageLength
    273: [numBytesInIfd],
    // strips offset
    278: [height],
    // RowsPerStrip
    305: 'geotiff.js' // no array for ASCII(Z)
  };
  if (metadata) {
    for (const i in metadata) {
      if (metadata.hasOwnProperty(i)) {
        ifd[i] = metadata[i];
      }
    }
  }
  const prfx = new Uint8Array(encodeIfds([ifd]));
  const img = new Uint8Array(values);
  const samplesPerPixel = ifd[277];
  const data = new Uint8Array(numBytesInIfd + width * height * samplesPerPixel);
  times(prfx.length, i => {
    data[i] = prfx[i];
  });
  forEach(img, (value, i) => {
    data[numBytesInIfd + i] = value;
  });
  return data.buffer;
};
const convertToTids = input => {
  const result = {};
  for (const key in input) {
    if (key !== 'StripOffsets') {
      if (!name2code[key]) {
        console.error(key, 'not in name2code:', Object.keys(name2code));
      }
      result[name2code[key]] = input[key];
    }
  }
  return result;
};
const geotiffwriter_toArray = input => {
  if (Array.isArray(input)) {
    return input;
  }
  return [input];
};
const metadataDefaults = [['Compression', 1],
// no compression
['PlanarConfiguration', 1], ['ExtraSamples', 0]];
function writeGeotiff(data, metadata) {
  const isFlattened = typeof data[0] === 'number';
  let height;
  let numBands;
  let width;
  let flattenedValues;
  if (isFlattened) {
    height = metadata.height || metadata.ImageLength;
    width = metadata.width || metadata.ImageWidth;
    numBands = data.length / (height * width);
    flattenedValues = data;
  } else {
    numBands = data.length;
    height = data[0].length;
    width = data[0][0].length;
    flattenedValues = [];
    times(height, rowIndex => {
      times(width, columnIndex => {
        times(numBands, bandIndex => {
          flattenedValues.push(data[bandIndex][rowIndex][columnIndex]);
        });
      });
    });
  }
  metadata.ImageLength = height;
  delete metadata.height;
  metadata.ImageWidth = width;
  delete metadata.width;

  // consult https://www.loc.gov/preservation/digital/formats/content/tiff_tags.shtml

  if (!metadata.BitsPerSample) {
    metadata.BitsPerSample = times(numBands, () => 8);
  }
  metadataDefaults.forEach(tag => {
    const key = tag[0];
    if (!metadata[key]) {
      const value = tag[1];
      metadata[key] = value;
    }
  });

  // The color space of the image data.
  // 1=black is zero and 2=RGB.
  if (!metadata.PhotometricInterpretation) {
    metadata.PhotometricInterpretation = metadata.BitsPerSample.length === 3 ? 2 : 1;
  }

  // The number of components per pixel.
  if (!metadata.SamplesPerPixel) {
    metadata.SamplesPerPixel = [numBands];
  }
  if (!metadata.StripByteCounts) {
    // we are only writing one strip
    metadata.StripByteCounts = [numBands * height * width];
  }
  if (!metadata.ModelPixelScale) {
    // assumes raster takes up exactly the whole globe
    metadata.ModelPixelScale = [360 / width, 180 / height, 0];
  }
  if (!metadata.SampleFormat) {
    metadata.SampleFormat = times(numBands, () => 1);
  }

  // if didn't pass in projection information, assume the popular 4326 "geographic projection"
  if (!metadata.hasOwnProperty('GeographicTypeGeoKey') && !metadata.hasOwnProperty('ProjectedCSTypeGeoKey')) {
    metadata.GeographicTypeGeoKey = 4326;
    metadata.ModelTiepoint = [0, 0, 0, -180, 90, 0]; // raster fits whole globe
    metadata.GeogCitationGeoKey = 'WGS 84';
    metadata.GTModelTypeGeoKey = 2;
  }
  const geoKeys = Object.keys(metadata).filter(key => endsWith(key, 'GeoKey')).sort((a, b) => name2code[a] - name2code[b]);
  if (!metadata.GeoAsciiParams) {
    let geoAsciiParams = '';
    geoKeys.forEach(name => {
      const code = Number(name2code[name]);
      const tagType = globals.fieldTagTypes[code];
      if (tagType === 'ASCII') {
        geoAsciiParams += `${metadata[name].toString()}\u0000`;
      }
    });
    if (geoAsciiParams.length > 0) {
      metadata.GeoAsciiParams = geoAsciiParams;
    }
  }
  if (!metadata.GeoKeyDirectory) {
    const NumberOfKeys = geoKeys.length;
    const GeoKeyDirectory = [1, 1, 0, NumberOfKeys];
    geoKeys.forEach(geoKey => {
      const KeyID = Number(name2code[geoKey]);
      GeoKeyDirectory.push(KeyID);
      let Count;
      let TIFFTagLocation;
      let valueOffset;
      if (globals.fieldTagTypes[KeyID] === 'SHORT') {
        Count = 1;
        TIFFTagLocation = 0;
        valueOffset = metadata[geoKey];
      } else if (geoKey === 'GeogCitationGeoKey') {
        Count = metadata.GeoAsciiParams.length;
        TIFFTagLocation = Number(name2code.GeoAsciiParams);
        valueOffset = 0;
      } else {
        console.log(`[geotiff.js] couldn't get TIFFTagLocation for ${geoKey}`);
      }
      GeoKeyDirectory.push(TIFFTagLocation);
      GeoKeyDirectory.push(Count);
      GeoKeyDirectory.push(valueOffset);
    });
    metadata.GeoKeyDirectory = GeoKeyDirectory;
  }

  // delete GeoKeys from metadata, because stored in GeoKeyDirectory tag
  for (const geoKey of geoKeys) {
    if (metadata.hasOwnProperty(geoKey)) {
      delete metadata[geoKey];
    }
  }
  ['Compression', 'ExtraSamples', 'GeographicTypeGeoKey', 'GTModelTypeGeoKey', 'GTRasterTypeGeoKey', 'ImageLength',
  // synonym of ImageHeight
  'ImageWidth', 'Orientation', 'PhotometricInterpretation', 'ProjectedCSTypeGeoKey', 'PlanarConfiguration', 'ResolutionUnit', 'SamplesPerPixel', 'XPosition', 'YPosition', 'RowsPerStrip'].forEach(name => {
    if (metadata[name]) {
      metadata[name] = geotiffwriter_toArray(metadata[name]);
    }
  });
  const encodedMetadata = convertToTids(metadata);
  const outputImage = encodeImage(flattenedValues, width, height, encodedMetadata);
  return outputImage;
}
;// CONCATENATED MODULE: ./src_geotiff/logging.js
/**
 * A no-op logger
 */
class DummyLogger {
  log() {}
  debug() {}
  info() {}
  warn() {}
  error() {}
  time() {}
  timeEnd() {}
}
let LOGGER = new DummyLogger();

/**
 *
 * @param {object} logger the new logger. e.g `console`
 */
function setLogger() {
  let logger = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new DummyLogger();
  LOGGER = logger;
}
function debug() {
  return LOGGER.debug(...arguments);
}
function log() {
  return LOGGER.log(...arguments);
}
function info() {
  return LOGGER.info(...arguments);
}
function warn() {
  return LOGGER.warn(...arguments);
}
function error() {
  return LOGGER.error(...arguments);
}
function time() {
  return LOGGER.time(...arguments);
}
function timeEnd() {
  return LOGGER.timeEnd(...arguments);
}
// EXTERNAL MODULE: ./src_geotiff/compression/basedecoder.js + 1 modules
var basedecoder = __webpack_require__(3668);
;// CONCATENATED MODULE: ./src_geotiff/geotiff.js
/** @module geotiff */





















/**
 * @typedef {Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array}
 * TypedArray
 */

/**
 * @typedef {{ height:number, width: number }} Dimensions
 */

/**
 * The autogenerated docs are a little confusing here. The effective type is:
 *
 * `TypedArray & { height: number; width: number}`
 * @typedef {TypedArray & Dimensions} TypedArrayWithDimensions
 */

/**
 * The autogenerated docs are a little confusing here. The effective type is:
 *
 * `TypedArray[] & { height: number; width: number}`
 * @typedef {TypedArray[] & Dimensions} TypedArrayArrayWithDimensions
 */

/**
 *  The autogenerated docs are a little confusing here. The effective type is:
 *
 * `(TypedArray | TypedArray[]) & { height: number; width: number}`
 * @typedef {TypedArrayWithDimensions | TypedArrayArrayWithDimensions} ReadRasterResult
 */

function getFieldTypeLength(fieldType) {
  switch (fieldType) {
    case globals.fieldTypes.BYTE:
    case globals.fieldTypes.ASCII:
    case globals.fieldTypes.SBYTE:
    case globals.fieldTypes.UNDEFINED:
      return 1;
    case globals.fieldTypes.SHORT:
    case globals.fieldTypes.SSHORT:
      return 2;
    case globals.fieldTypes.LONG:
    case globals.fieldTypes.SLONG:
    case globals.fieldTypes.FLOAT:
    case globals.fieldTypes.IFD:
      return 4;
    case globals.fieldTypes.RATIONAL:
    case globals.fieldTypes.SRATIONAL:
    case globals.fieldTypes.DOUBLE:
    case globals.fieldTypes.LONG8:
    case globals.fieldTypes.SLONG8:
    case globals.fieldTypes.IFD8:
      return 8;
    default:
      throw new RangeError(`Invalid field type: ${fieldType}`);
  }
}
function parseGeoKeyDirectory(fileDirectory) {
  const rawGeoKeyDirectory = fileDirectory.GeoKeyDirectory;
  if (!rawGeoKeyDirectory) {
    return null;
  }
  const geoKeyDirectory = {};
  for (let i = 4; i <= rawGeoKeyDirectory[3] * 4; i += 4) {
    const key = globals.geoKeyNames[rawGeoKeyDirectory[i]];
    const location = rawGeoKeyDirectory[i + 1] ? globals.fieldTagNames[rawGeoKeyDirectory[i + 1]] : null;
    const count = rawGeoKeyDirectory[i + 2];
    const offset = rawGeoKeyDirectory[i + 3];
    let value = null;
    if (!location) {
      value = offset;
    } else {
      value = fileDirectory[location];
      if (typeof value === 'undefined' || value === null) {
        throw new Error(`Could not get value of geoKey '${key}'.`);
      } else if (typeof value === 'string') {
        value = value.substring(offset, offset + count - 1);
      } else if (value.subarray) {
        value = value.subarray(offset, offset + count);
        if (count === 1) {
          value = value[0];
        }
      }
    }
    geoKeyDirectory[key] = value;
  }
  return geoKeyDirectory;
}
function getValues(dataSlice, fieldType, count, offset) {
  let values = null;
  let readMethod = null;
  const fieldTypeLength = getFieldTypeLength(fieldType);
  switch (fieldType) {
    case globals.fieldTypes.BYTE:
    case globals.fieldTypes.ASCII:
    case globals.fieldTypes.UNDEFINED:
      values = new Uint8Array(count);
      readMethod = dataSlice.readUint8;
      break;
    case globals.fieldTypes.SBYTE:
      values = new Int8Array(count);
      readMethod = dataSlice.readInt8;
      break;
    case globals.fieldTypes.SHORT:
      values = new Uint16Array(count);
      readMethod = dataSlice.readUint16;
      break;
    case globals.fieldTypes.SSHORT:
      values = new Int16Array(count);
      readMethod = dataSlice.readInt16;
      break;
    case globals.fieldTypes.LONG:
    case globals.fieldTypes.IFD:
      values = new Uint32Array(count);
      readMethod = dataSlice.readUint32;
      break;
    case globals.fieldTypes.SLONG:
      values = new Int32Array(count);
      readMethod = dataSlice.readInt32;
      break;
    case globals.fieldTypes.LONG8:
    case globals.fieldTypes.IFD8:
      values = new Array(count);
      readMethod = dataSlice.readUint64;
      break;
    case globals.fieldTypes.SLONG8:
      values = new Array(count);
      readMethod = dataSlice.readInt64;
      break;
    case globals.fieldTypes.RATIONAL:
      values = new Uint32Array(count * 2);
      readMethod = dataSlice.readUint32;
      break;
    case globals.fieldTypes.SRATIONAL:
      values = new Int32Array(count * 2);
      readMethod = dataSlice.readInt32;
      break;
    case globals.fieldTypes.FLOAT:
      values = new Float32Array(count);
      readMethod = dataSlice.readFloat32;
      break;
    case globals.fieldTypes.DOUBLE:
      values = new Float64Array(count);
      readMethod = dataSlice.readFloat64;
      break;
    default:
      throw new RangeError(`Invalid field type: ${fieldType}`);
  }

  // normal fields
  if (!(fieldType === globals.fieldTypes.RATIONAL || fieldType === globals.fieldTypes.SRATIONAL)) {
    for (let i = 0; i < count; ++i) {
      values[i] = readMethod.call(dataSlice, offset + i * fieldTypeLength);
    }
  } else {
    // RATIONAL or SRATIONAL
    for (let i = 0; i < count; i += 2) {
      values[i] = readMethod.call(dataSlice, offset + i * fieldTypeLength);
      values[i + 1] = readMethod.call(dataSlice, offset + (i * fieldTypeLength + 4));
    }
  }
  if (fieldType === globals.fieldTypes.ASCII) {
    return new TextDecoder('utf-8').decode(values);
  }
  return values;
}

/**
 * Data class to store the parsed file directory, geo key directory and
 * offset to the next IFD
 */
class ImageFileDirectory {
  constructor(fileDirectory, geoKeyDirectory, nextIFDByteOffset) {
    this.fileDirectory = fileDirectory;
    this.geoKeyDirectory = geoKeyDirectory;
    this.nextIFDByteOffset = nextIFDByteOffset;
  }
}

/**
 * Error class for cases when an IFD index was requested, that does not exist
 * in the file.
 */
class GeoTIFFImageIndexError extends Error {
  constructor(index) {
    super(`No image at index ${index}`);
    this.index = index;
  }
}
class GeoTIFFBase {
  /**
   * (experimental) Reads raster data from the best fitting image. This function uses
   * the image with the lowest resolution that is still a higher resolution than the
   * requested resolution.
   * When specified, the `bbox` option is translated to the `window` option and the
   * `resX` and `resY` to `width` and `height` respectively.
   * Then, the [readRasters]{@link GeoTIFFImage#readRasters} method of the selected
   * image is called and the result returned.
   * @see GeoTIFFImage.readRasters
   * @param {import('./geotiffimage').ReadRasterOptions} [options={}] optional parameters
   * @returns {Promise<ReadRasterResult>} the decoded array(s), with `height` and `width`, as a promise
   */
  async readRasters() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    const {
      window: imageWindow,
      width,
      height,
      resampleMethod
    } = options;
    let {
      resX,
      resY,
      bbox
    } = options;
    const firstImage = await this.getImage();
    let usedImage = firstImage;
    const imageCount = await this.getImageCount();
    const imgBBox = firstImage.getBoundingBox();
    if (imageWindow && bbox) {
      throw new Error('Both "bbox" and "window" passed.');
    }

    // if width/height is passed, transform it to resolution
    if (width || height) {
      // if we have an image window (pixel coordinates), transform it to a BBox
      // using the origin/resolution of the first image.
      if (imageWindow) {
        const [oX, oY] = firstImage.getOrigin();
        const [rX, rY] = firstImage.getResolution();
        bbox = [oX + imageWindow[0] * rX, oY + imageWindow[1] * rY, oX + imageWindow[2] * rX, oY + imageWindow[3] * rY];
      }

      // if we have a bbox (or calculated one)

      const usedBBox = bbox || imgBBox;
      //Add a small oversample buffer if resampleMethod is bilinear

      if (resampleMethod) if (width) {
        if (resX) {
          throw new Error('Both width and resX passed');
        }
        resX = (usedBBox[2] - usedBBox[0]) / width;
      }
      if (height) {
        if (resY) {
          throw new Error('Both width and resY passed');
        }
        resY = (usedBBox[3] - usedBBox[1]) / height;
      }
    }

    // if resolution is set or calculated, try to get the image with the worst acceptable resolution
    if (resX || resY) {
      const allImages = [];
      for (let i = 0; i < imageCount; ++i) {
        const image = await this.getImage(i);
        const {
          SubfileType: subfileType,
          NewSubfileType: newSubfileType
        } = image.fileDirectory;
        if (i === 0 || subfileType === 2 || newSubfileType & 1) {
          allImages.push(image);
        }
      }
      allImages.sort((a, b) => a.getWidth() - b.getWidth());
      for (let i = 0; i < allImages.length; ++i) {
        const image = allImages[i];
        const imgResX = (imgBBox[2] - imgBBox[0]) / image.getWidth();
        const imgResY = (imgBBox[3] - imgBBox[1]) / image.getHeight();
        usedImage = image;
        if (resX && resX > imgResX || resY && resY > imgResY) {
          break;
        }
      }
    }
    let wnd = imageWindow;
    if (bbox) {
      const [oX, oY] = firstImage.getOrigin();
      const [imageResX, imageResY] = usedImage.getResolution(firstImage);
      wnd = [Math.round((bbox[0] - oX) / imageResX), Math.round((bbox[1] - oY) / imageResY), Math.round((bbox[2] - oX) / imageResX), Math.round((bbox[3] - oY) / imageResY)];
      wnd = [Math.min(wnd[0], wnd[2]), Math.min(wnd[1], wnd[3]), Math.max(wnd[0], wnd[2]), Math.max(wnd[1], wnd[3])];
    }
    return usedImage.readRasters({
      ...options,
      window: wnd
    });
  }
}

/**
 * @typedef {Object} GeoTIFFOptions
 * @property {boolean} [cache=false] whether or not decoded tiles shall be cached.
 */

/**
 * The abstraction for a whole GeoTIFF file.
 * @augments GeoTIFFBase
 */
class GeoTIFF extends GeoTIFFBase {
  /**
   * @constructor
   * @param {*} source The datasource to read from.
   * @param {boolean} littleEndian Whether the image uses little endian.
   * @param {boolean} bigTiff Whether the image uses bigTIFF conventions.
   * @param {number} firstIFDOffset The numeric byte-offset from the start of the image
   *                                to the first IFD.
   * @param {GeoTIFFOptions} [options] further options.
   */
  constructor(source, littleEndian, bigTiff, firstIFDOffset) {
    let options = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
    super();
    this.source = source;
    this.littleEndian = littleEndian;
    this.bigTiff = bigTiff;
    this.firstIFDOffset = firstIFDOffset;
    this.cache = options.cache || false;
    this.ifdRequests = [];
    this.ghostValues = null;
  }
  async getSlice(offset, size) {
    const fallbackSize = this.bigTiff ? 4048 : 1024;
    return new DataSlice((await this.source.fetch([{
      offset,
      length: typeof size !== 'undefined' ? size : fallbackSize
    }]))[0], offset, this.littleEndian, this.bigTiff);
  }

  /**
   * Instructs to parse an image file directory at the given file offset.
   * As there is no way to ensure that a location is indeed the start of an IFD,
   * this function must be called with caution (e.g only using the IFD offsets from
   * the headers or other IFDs).
   * @param {number} offset the offset to parse the IFD at
   * @returns {Promise<ImageFileDirectory>} the parsed IFD
   */
  async parseFileDirectoryAt(offset) {
    const entrySize = this.bigTiff ? 20 : 12;
    const offsetSize = this.bigTiff ? 8 : 2;
    let dataSlice = await this.getSlice(offset);
    const numDirEntries = this.bigTiff ? dataSlice.readUint64(offset) : dataSlice.readUint16(offset);

    // if the slice does not cover the whole IFD, request a bigger slice, where the
    // whole IFD fits: num of entries + n x tag length + offset to next IFD
    const byteSize = numDirEntries * entrySize + (this.bigTiff ? 16 : 6);
    if (!dataSlice.covers(offset, byteSize)) {
      dataSlice = await this.getSlice(offset, byteSize);
    }
    const fileDirectory = {};

    // loop over the IFD and create a file directory object
    let i = offset + (this.bigTiff ? 8 : 2);
    for (let entryCount = 0; entryCount < numDirEntries; i += entrySize, ++entryCount) {
      const fieldTag = dataSlice.readUint16(i);
      const fieldType = dataSlice.readUint16(i + 2);
      const typeCount = this.bigTiff ? dataSlice.readUint64(i + 4) : dataSlice.readUint32(i + 4);
      let fieldValues;
      let value;
      const fieldTypeLength = getFieldTypeLength(fieldType);
      const valueOffset = i + (this.bigTiff ? 12 : 8);

      // check whether the value is directly encoded in the tag or refers to a
      // different external byte range
      if (fieldTypeLength * typeCount <= (this.bigTiff ? 8 : 4)) {
        fieldValues = getValues(dataSlice, fieldType, typeCount, valueOffset);
      } else {
        // resolve the reference to the actual byte range
        const actualOffset = dataSlice.readOffset(valueOffset);
        const length = getFieldTypeLength(fieldType) * typeCount;

        // check, whether we actually cover the referenced byte range; if not,
        // request a new slice of bytes to read from it
        if (dataSlice.covers(actualOffset, length)) {
          fieldValues = getValues(dataSlice, fieldType, typeCount, actualOffset);
        } else {
          const fieldDataSlice = await this.getSlice(actualOffset, length);
          fieldValues = getValues(fieldDataSlice, fieldType, typeCount, actualOffset);
        }
      }

      // unpack single values from the array
      if (typeCount === 1 && globals.arrayFields.indexOf(fieldTag) === -1 && !(fieldType === globals.fieldTypes.RATIONAL || fieldType === globals.fieldTypes.SRATIONAL)) {
        value = fieldValues[0];
      } else {
        value = fieldValues;
      }

      // write the tags value to the file directly
      fileDirectory[globals.fieldTagNames[fieldTag]] = value;
    }
    const geoKeyDirectory = parseGeoKeyDirectory(fileDirectory);
    const nextIFDByteOffset = dataSlice.readOffset(offset + offsetSize + entrySize * numDirEntries);
    return new ImageFileDirectory(fileDirectory, geoKeyDirectory, nextIFDByteOffset);
  }
  async requestIFD(index) {
    // see if we already have that IFD index requested.
    if (this.ifdRequests[index]) {
      // attach to an already requested IFD
      return this.ifdRequests[index];
    } else if (index === 0) {
      // special case for index 0
      this.ifdRequests[index] = this.parseFileDirectoryAt(this.firstIFDOffset);
      return this.ifdRequests[index];
    } else if (!this.ifdRequests[index - 1]) {
      // if the previous IFD was not yet loaded, load that one first
      // this is the recursive call.
      try {
        this.ifdRequests[index - 1] = this.requestIFD(index - 1);
      } catch (e) {
        // if the previous one already was an index error, rethrow
        // with the current index
        if (e instanceof GeoTIFFImageIndexError) {
          throw new GeoTIFFImageIndexError(index);
        }
        // rethrow anything else
        throw e;
      }
    }
    // if the previous IFD was loaded, we can finally fetch the one we are interested in.
    // we need to wrap this in an IIFE, otherwise this.ifdRequests[index] would be delayed
    this.ifdRequests[index] = (async () => {
      const previousIfd = await this.ifdRequests[index - 1];
      if (previousIfd.nextIFDByteOffset === 0) {
        throw new GeoTIFFImageIndexError(index);
      }
      return this.parseFileDirectoryAt(previousIfd.nextIFDByteOffset);
    })();
    return this.ifdRequests[index];
  }

  /**
   * Get the n-th internal subfile of an image. By default, the first is returned.
   *
   * @param {number} [index=0] the index of the image to return.
   * @returns {Promise<GeoTIFFImage>} the image at the given index
   */
  async getImage() {
    let index = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    const ifd = await this.requestIFD(index);
    return new geotiffimage(ifd.fileDirectory, ifd.geoKeyDirectory, this.dataView, this.littleEndian, this.cache, this.source);
  }

  /**
   * Returns the count of the internal subfiles.
   *
   * @returns {Promise<number>} the number of internal subfile images
   */
  async getImageCount() {
    let index = 0;
    // loop until we run out of IFDs
    let hasNext = true;
    while (hasNext) {
      try {
        await this.requestIFD(index);
        ++index;
      } catch (e) {
        if (e instanceof GeoTIFFImageIndexError) {
          hasNext = false;
        } else {
          throw e;
        }
      }
    }
    return index;
  }

  /**
   * Get the values of the COG ghost area as a parsed map.
   * See https://gdal.org/drivers/raster/cog.html#header-ghost-area for reference
   * @returns {Promise<Object>} the parsed ghost area or null, if no such area was found
   */
  async getGhostValues() {
    const offset = this.bigTiff ? 16 : 8;
    if (this.ghostValues) {
      return this.ghostValues;
    }
    const detectionString = 'GDAL_STRUCTURAL_METADATA_SIZE=';
    const heuristicAreaSize = detectionString.length + 100;
    let slice = await this.getSlice(offset, heuristicAreaSize);
    if (detectionString === getValues(slice, globals.fieldTypes.ASCII, detectionString.length, offset)) {
      const valuesString = getValues(slice, globals.fieldTypes.ASCII, heuristicAreaSize, offset);
      const firstLine = valuesString.split('\n')[0];
      const metadataSize = Number(firstLine.split('=')[1].split(' ')[0]) + firstLine.length;
      if (metadataSize > heuristicAreaSize) {
        slice = await this.getSlice(offset, metadataSize);
      }
      const fullString = getValues(slice, globals.fieldTypes.ASCII, metadataSize, offset);
      this.ghostValues = {};
      fullString.split('\n').filter(line => line.length > 0).map(line => line.split('=')).forEach(_ref => {
        let [key, value] = _ref;
        this.ghostValues[key] = value;
      });
    }
    return this.ghostValues;
  }

  /**
   * Parse a (Geo)TIFF file from the given source.
   *
   * @param {*} source The source of data to parse from.
   * @param {GeoTIFFOptions} [options] Additional options.
   * @param {AbortSignal} [signal] An AbortSignal that may be signalled if the request is
   *                               to be aborted
   */
  static async fromSource(source, options, signal) {
    const headerData = (await source.fetch([{
      offset: 0,
      length: 1024
    }], signal))[0];
    const dataView = new DataView64(headerData);
    const BOM = dataView.getUint16(0, 0);
    let littleEndian;
    if (BOM === 0x4949) {
      littleEndian = true;
    } else if (BOM === 0x4D4D) {
      littleEndian = false;
    } else {
      throw new TypeError('Invalid byte order value.');
    }
    const magicNumber = dataView.getUint16(2, littleEndian);
    let bigTiff;
    if (magicNumber === 42) {
      bigTiff = false;
    } else if (magicNumber === 43) {
      bigTiff = true;
      const offsetByteSize = dataView.getUint16(4, littleEndian);
      if (offsetByteSize !== 8) {
        throw new Error('Unsupported offset byte-size.');
      }
    } else {
      throw new TypeError('Invalid magic number.');
    }
    const firstIFDOffset = bigTiff ? dataView.getUint64(8, littleEndian) : dataView.getUint32(4, littleEndian);
    return new GeoTIFF(source, littleEndian, bigTiff, firstIFDOffset, options);
  }

  /**
   * Closes the underlying file buffer
   * N.B. After the GeoTIFF has been completely processed it needs
   * to be closed but only if it has been constructed from a file.
   */
  close() {
    if (typeof this.source.close === 'function') {
      return this.source.close();
    }
    return false;
  }
}

/* harmony default export */ const geotiff = (GeoTIFF);

/**
 * Wrapper for GeoTIFF files that have external overviews.
 * @augments GeoTIFFBase
 */
class MultiGeoTIFF extends GeoTIFFBase {
  /**
   * Construct a new MultiGeoTIFF from a main and several overview files.
   * @param {GeoTIFF} mainFile The main GeoTIFF file.
   * @param {GeoTIFF[]} overviewFiles An array of overview files.
   */
  constructor(mainFile, overviewFiles) {
    super();
    this.mainFile = mainFile;
    this.overviewFiles = overviewFiles;
    this.imageFiles = [mainFile].concat(overviewFiles);
    this.fileDirectoriesPerFile = null;
    this.fileDirectoriesPerFileParsing = null;
    this.imageCount = null;
  }
  async parseFileDirectoriesPerFile() {
    const requests = [this.mainFile.parseFileDirectoryAt(this.mainFile.firstIFDOffset)].concat(this.overviewFiles.map(file => file.parseFileDirectoryAt(file.firstIFDOffset)));
    this.fileDirectoriesPerFile = await Promise.all(requests);
    return this.fileDirectoriesPerFile;
  }

  /**
   * Get the n-th internal subfile of an image. By default, the first is returned.
   *
   * @param {number} [index=0] the index of the image to return.
   * @returns {Promise<GeoTIFFImage>} the image at the given index
   */
  async getImage() {
    let index = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
    await this.getImageCount();
    await this.parseFileDirectoriesPerFile();
    let visited = 0;
    let relativeIndex = 0;
    for (let i = 0; i < this.imageFiles.length; i++) {
      const imageFile = this.imageFiles[i];
      for (let ii = 0; ii < this.imageCounts[i]; ii++) {
        if (index === visited) {
          const ifd = await imageFile.requestIFD(relativeIndex);
          return new geotiffimage(ifd.fileDirectory, ifd.geoKeyDirectory, imageFile.dataView, imageFile.littleEndian, imageFile.cache, imageFile.source);
        }
        visited++;
        relativeIndex++;
      }
      relativeIndex = 0;
    }
    throw new RangeError('Invalid image index');
  }

  /**
   * Returns the count of the internal subfiles.
   *
   * @returns {Promise<number>} the number of internal subfile images
   */
  async getImageCount() {
    if (this.imageCount !== null) {
      return this.imageCount;
    }
    const requests = [this.mainFile.getImageCount()].concat(this.overviewFiles.map(file => file.getImageCount()));
    this.imageCounts = await Promise.all(requests);
    this.imageCount = this.imageCounts.reduce((count, ifds) => count + ifds, 0);
    return this.imageCount;
  }
}


/**
 * Creates a new GeoTIFF from a remote URL.
 * @param {string} url The URL to access the image from
 * @param {object} [options] Additional options to pass to the source.
 *                           See {@link makeRemoteSource} for details.
 * @param {AbortSignal} [signal] An AbortSignal that may be signalled if the request is
 *                               to be aborted
 * @returns {Promise<GeoTIFF>} The resulting GeoTIFF file.
 */
async function fromUrl(url) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let signal = arguments.length > 2 ? arguments[2] : undefined;
  return GeoTIFF.fromSource(makeRemoteSource(url, options), signal);
}

/**
 * Creates a new GeoTIFF from a custom {@link BaseClient}.
 * @param {BaseClient} client The client.
 * @param {object} [options] Additional options to pass to the source.
 *                           See {@link makeRemoteSource} for details.
 * @param {AbortSignal} [signal] An AbortSignal that may be signalled if the request is
 *                               to be aborted
 * @returns {Promise<GeoTIFF>} The resulting GeoTIFF file.
 */
async function fromCustomClient(client) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let signal = arguments.length > 2 ? arguments[2] : undefined;
  return GeoTIFF.fromSource(makeCustomSource(client, options), signal);
}

/**
 * Construct a new GeoTIFF from an
 * [ArrayBuffer]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer}.
 * @param {ArrayBuffer} arrayBuffer The data to read the file from.
 * @param {AbortSignal} [signal] An AbortSignal that may be signalled if the request is
 *                               to be aborted
 * @returns {Promise<GeoTIFF>} The resulting GeoTIFF file.
 */
async function fromArrayBuffer(arrayBuffer, signal) {
  return GeoTIFF.fromSource(makeBufferSource(arrayBuffer), signal);
}

/**
 * Construct a GeoTIFF from a local file path. This uses the node
 * [filesystem API]{@link https://nodejs.org/api/fs.html} and is
 * not available on browsers.
 *
 * N.B. After the GeoTIFF has been completely processed it needs
 * to be closed but only if it has been constructed from a file.
 * @param {string} path The file path to read from.
 * @param {AbortSignal} [signal] An AbortSignal that may be signalled if the request is
 *                               to be aborted
 * @returns {Promise<GeoTIFF>} The resulting GeoTIFF file.
 */
async function fromFile(path, signal) {
  return GeoTIFF.fromSource(makeFileSource(path), signal);
}

/**
 * Construct a GeoTIFF from an HTML
 * [Blob]{@link https://developer.mozilla.org/en-US/docs/Web/API/Blob} or
 * [File]{@link https://developer.mozilla.org/en-US/docs/Web/API/File}
 * object.
 * @param {Blob|File} blob The Blob or File object to read from.
 * @param {AbortSignal} [signal] An AbortSignal that may be signalled if the request is
 *                               to be aborted
 * @returns {Promise<GeoTIFF>} The resulting GeoTIFF file.
 */
async function fromBlob(blob, signal) {
  return GeoTIFF.fromSource(makeFileReaderSource(blob), signal);
}

/**
 * Construct a MultiGeoTIFF from the given URLs.
 * @param {string} mainUrl The URL for the main file.
 * @param {string[]} overviewUrls An array of URLs for the overview images.
 * @param {Object} [options] Additional options to pass to the source.
 *                           See [makeRemoteSource]{@link module:source.makeRemoteSource}
 *                           for details.
 * @param {AbortSignal} [signal] An AbortSignal that may be signalled if the request is
 *                               to be aborted
 * @returns {Promise<MultiGeoTIFF>} The resulting MultiGeoTIFF file.
 */
async function fromUrls(mainUrl) {
  let overviewUrls = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  let signal = arguments.length > 3 ? arguments[3] : undefined;
  const mainFile = await GeoTIFF.fromSource(makeRemoteSource(mainUrl, options), signal);
  const overviewFiles = await Promise.all(overviewUrls.map(url => GeoTIFF.fromSource(makeRemoteSource(url, options))));
  return new MultiGeoTIFF(mainFile, overviewFiles);
}

/**
 * Main creating function for GeoTIFF files.
 * @param {(Array)} array of pixel values
 * @returns {metadata} metadata
 */
function writeArrayBuffer(values, metadata) {
  return writeGeotiff(values, metadata);
}




/***/ }),

/***/ 167:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ExtraSamplesValues: () => (/* binding */ ExtraSamplesValues),
/* harmony export */   LercAddCompression: () => (/* binding */ LercAddCompression),
/* harmony export */   LercParameters: () => (/* binding */ LercParameters),
/* harmony export */   arrayFields: () => (/* binding */ arrayFields),
/* harmony export */   fieldTagNames: () => (/* binding */ fieldTagNames),
/* harmony export */   fieldTagTypes: () => (/* binding */ fieldTagTypes),
/* harmony export */   fieldTags: () => (/* binding */ fieldTags),
/* harmony export */   fieldTypeNames: () => (/* binding */ fieldTypeNames),
/* harmony export */   fieldTypes: () => (/* binding */ fieldTypes),
/* harmony export */   geoKeyNames: () => (/* binding */ geoKeyNames),
/* harmony export */   geoKeys: () => (/* binding */ geoKeys),
/* harmony export */   photometricInterpretations: () => (/* binding */ photometricInterpretations)
/* harmony export */ });
const fieldTagNames = {
  // TIFF Baseline
  0x013B: 'Artist',
  0x0102: 'BitsPerSample',
  0x0109: 'CellLength',
  0x0108: 'CellWidth',
  0x0140: 'ColorMap',
  0x0103: 'Compression',
  0x8298: 'Copyright',
  0x0132: 'DateTime',
  0x0152: 'ExtraSamples',
  0x010A: 'FillOrder',
  0x0121: 'FreeByteCounts',
  0x0120: 'FreeOffsets',
  0x0123: 'GrayResponseCurve',
  0x0122: 'GrayResponseUnit',
  0x013C: 'HostComputer',
  0x010E: 'ImageDescription',
  0x0101: 'ImageLength',
  0x0100: 'ImageWidth',
  0x010F: 'Make',
  0x0119: 'MaxSampleValue',
  0x0118: 'MinSampleValue',
  0x0110: 'Model',
  0x00FE: 'NewSubfileType',
  0x0112: 'Orientation',
  0x0106: 'PhotometricInterpretation',
  0x011C: 'PlanarConfiguration',
  0x0128: 'ResolutionUnit',
  0x0116: 'RowsPerStrip',
  0x0115: 'SamplesPerPixel',
  0x0131: 'Software',
  0x0117: 'StripByteCounts',
  0x0111: 'StripOffsets',
  0x00FF: 'SubfileType',
  0x0107: 'Threshholding',
  0x011A: 'XResolution',
  0x011B: 'YResolution',
  // TIFF Extended
  0x0146: 'BadFaxLines',
  0x0147: 'CleanFaxData',
  0x0157: 'ClipPath',
  0x0148: 'ConsecutiveBadFaxLines',
  0x01B1: 'Decode',
  0x01B2: 'DefaultImageColor',
  0x010D: 'DocumentName',
  0x0150: 'DotRange',
  0x0141: 'HalftoneHints',
  0x015A: 'Indexed',
  0x015B: 'JPEGTables',
  0x011D: 'PageName',
  0x0129: 'PageNumber',
  0x013D: 'Predictor',
  0x013F: 'PrimaryChromaticities',
  0x0214: 'ReferenceBlackWhite',
  0x0153: 'SampleFormat',
  0x0154: 'SMinSampleValue',
  0x0155: 'SMaxSampleValue',
  0x022F: 'StripRowCounts',
  0x014A: 'SubIFDs',
  0x0124: 'T4Options',
  0x0125: 'T6Options',
  0x0145: 'TileByteCounts',
  0x0143: 'TileLength',
  0x0144: 'TileOffsets',
  0x0142: 'TileWidth',
  0x012D: 'TransferFunction',
  0x013E: 'WhitePoint',
  0x0158: 'XClipPathUnits',
  0x011E: 'XPosition',
  0x0211: 'YCbCrCoefficients',
  0x0213: 'YCbCrPositioning',
  0x0212: 'YCbCrSubSampling',
  0x0159: 'YClipPathUnits',
  0x011F: 'YPosition',
  // EXIF
  0x9202: 'ApertureValue',
  0xA001: 'ColorSpace',
  0x9004: 'DateTimeDigitized',
  0x9003: 'DateTimeOriginal',
  0x8769: 'Exif IFD',
  0x9000: 'ExifVersion',
  0x829A: 'ExposureTime',
  0xA300: 'FileSource',
  0x9209: 'Flash',
  0xA000: 'FlashpixVersion',
  0x829D: 'FNumber',
  0xA420: 'ImageUniqueID',
  0x9208: 'LightSource',
  0x927C: 'MakerNote',
  0x9201: 'ShutterSpeedValue',
  0x9286: 'UserComment',
  // IPTC
  0x83BB: 'IPTC',
  // ICC
  0x8773: 'ICC Profile',
  // XMP
  0x02BC: 'XMP',
  // GDAL
  0xA480: 'GDAL_METADATA',
  0xA481: 'GDAL_NODATA',
  // Photoshop
  0x8649: 'Photoshop',
  // GeoTiff
  0x830E: 'ModelPixelScale',
  0x8482: 'ModelTiepoint',
  0x85D8: 'ModelTransformation',
  0x87AF: 'GeoKeyDirectory',
  0x87B0: 'GeoDoubleParams',
  0x87B1: 'GeoAsciiParams',
  // LERC
  0xC5F2: 'LercParameters'
};
const fieldTags = {};
for (const key in fieldTagNames) {
  if (fieldTagNames.hasOwnProperty(key)) {
    fieldTags[fieldTagNames[key]] = parseInt(key, 10);
  }
}
const fieldTagTypes = {
  256: 'SHORT',
  257: 'SHORT',
  258: 'SHORT',
  259: 'SHORT',
  262: 'SHORT',
  273: 'LONG',
  274: 'SHORT',
  277: 'SHORT',
  278: 'LONG',
  279: 'LONG',
  282: 'RATIONAL',
  283: 'RATIONAL',
  284: 'SHORT',
  286: 'SHORT',
  287: 'RATIONAL',
  296: 'SHORT',
  297: 'SHORT',
  305: 'ASCII',
  306: 'ASCII',
  338: 'SHORT',
  339: 'SHORT',
  513: 'LONG',
  514: 'LONG',
  1024: 'SHORT',
  1025: 'SHORT',
  2048: 'SHORT',
  2049: 'ASCII',
  3072: 'SHORT',
  3073: 'ASCII',
  33550: 'DOUBLE',
  33922: 'DOUBLE',
  34264: 'DOUBLE',
  34665: 'LONG',
  34735: 'SHORT',
  34736: 'DOUBLE',
  34737: 'ASCII',
  42113: 'ASCII'
};
const arrayFields = [fieldTags.BitsPerSample, fieldTags.ExtraSamples, fieldTags.SampleFormat, fieldTags.StripByteCounts, fieldTags.StripOffsets, fieldTags.StripRowCounts, fieldTags.TileByteCounts, fieldTags.TileOffsets, fieldTags.SubIFDs];
const fieldTypeNames = {
  0x0001: 'BYTE',
  0x0002: 'ASCII',
  0x0003: 'SHORT',
  0x0004: 'LONG',
  0x0005: 'RATIONAL',
  0x0006: 'SBYTE',
  0x0007: 'UNDEFINED',
  0x0008: 'SSHORT',
  0x0009: 'SLONG',
  0x000A: 'SRATIONAL',
  0x000B: 'FLOAT',
  0x000C: 'DOUBLE',
  // IFD offset, suggested by https://owl.phy.queensu.ca/~phil/exiftool/standards.html
  0x000D: 'IFD',
  // introduced by BigTIFF
  0x0010: 'LONG8',
  0x0011: 'SLONG8',
  0x0012: 'IFD8'
};
const fieldTypes = {};
for (const key in fieldTypeNames) {
  if (fieldTypeNames.hasOwnProperty(key)) {
    fieldTypes[fieldTypeNames[key]] = parseInt(key, 10);
  }
}
const photometricInterpretations = {
  WhiteIsZero: 0,
  BlackIsZero: 1,
  RGB: 2,
  Palette: 3,
  TransparencyMask: 4,
  CMYK: 5,
  YCbCr: 6,
  CIELab: 8,
  ICCLab: 9
};
const ExtraSamplesValues = {
  Unspecified: 0,
  Assocalpha: 1,
  Unassalpha: 2
};
const LercParameters = {
  Version: 0,
  AddCompression: 1
};
const LercAddCompression = {
  None: 0,
  Deflate: 1,
  Zstandard: 2
};
const geoKeyNames = {
  1024: 'GTModelTypeGeoKey',
  1025: 'GTRasterTypeGeoKey',
  1026: 'GTCitationGeoKey',
  2048: 'GeographicTypeGeoKey',
  2049: 'GeogCitationGeoKey',
  2050: 'GeogGeodeticDatumGeoKey',
  2051: 'GeogPrimeMeridianGeoKey',
  2052: 'GeogLinearUnitsGeoKey',
  2053: 'GeogLinearUnitSizeGeoKey',
  2054: 'GeogAngularUnitsGeoKey',
  2055: 'GeogAngularUnitSizeGeoKey',
  2056: 'GeogEllipsoidGeoKey',
  2057: 'GeogSemiMajorAxisGeoKey',
  2058: 'GeogSemiMinorAxisGeoKey',
  2059: 'GeogInvFlatteningGeoKey',
  2060: 'GeogAzimuthUnitsGeoKey',
  2061: 'GeogPrimeMeridianLongGeoKey',
  2062: 'GeogTOWGS84GeoKey',
  3072: 'ProjectedCSTypeGeoKey',
  3073: 'PCSCitationGeoKey',
  3074: 'ProjectionGeoKey',
  3075: 'ProjCoordTransGeoKey',
  3076: 'ProjLinearUnitsGeoKey',
  3077: 'ProjLinearUnitSizeGeoKey',
  3078: 'ProjStdParallel1GeoKey',
  3079: 'ProjStdParallel2GeoKey',
  3080: 'ProjNatOriginLongGeoKey',
  3081: 'ProjNatOriginLatGeoKey',
  3082: 'ProjFalseEastingGeoKey',
  3083: 'ProjFalseNorthingGeoKey',
  3084: 'ProjFalseOriginLongGeoKey',
  3085: 'ProjFalseOriginLatGeoKey',
  3086: 'ProjFalseOriginEastingGeoKey',
  3087: 'ProjFalseOriginNorthingGeoKey',
  3088: 'ProjCenterLongGeoKey',
  3089: 'ProjCenterLatGeoKey',
  3090: 'ProjCenterEastingGeoKey',
  3091: 'ProjCenterNorthingGeoKey',
  3092: 'ProjScaleAtNatOriginGeoKey',
  3093: 'ProjScaleAtCenterGeoKey',
  3094: 'ProjAzimuthAngleGeoKey',
  3095: 'ProjStraightVertPoleLongGeoKey',
  3096: 'ProjRectifiedGridAngleGeoKey',
  4096: 'VerticalCSTypeGeoKey',
  4097: 'VerticalCitationGeoKey',
  4098: 'VerticalDatumGeoKey',
  4099: 'VerticalUnitsGeoKey'
};
const geoKeys = {};
for (const key in geoKeyNames) {
  if (geoKeyNames.hasOwnProperty(key)) {
    geoKeys[geoKeyNames[key]] = parseInt(key, 10);
  }
}

/***/ }),

/***/ 8075:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var GetIntrinsic = __webpack_require__(453);

var callBind = __webpack_require__(487);

var $indexOf = callBind(GetIntrinsic('String.prototype.indexOf'));

module.exports = function callBoundIntrinsic(name, allowMissing) {
	var intrinsic = GetIntrinsic(name, !!allowMissing);
	if (typeof intrinsic === 'function' && $indexOf(name, '.prototype.') > -1) {
		return callBind(intrinsic);
	}
	return intrinsic;
};


/***/ }),

/***/ 487:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var bind = __webpack_require__(6743);
var GetIntrinsic = __webpack_require__(453);
var setFunctionLength = __webpack_require__(6897);

var $TypeError = __webpack_require__(9675);
var $apply = GetIntrinsic('%Function.prototype.apply%');
var $call = GetIntrinsic('%Function.prototype.call%');
var $reflectApply = GetIntrinsic('%Reflect.apply%', true) || bind.call($call, $apply);

var $defineProperty = __webpack_require__(655);
var $max = GetIntrinsic('%Math.max%');

module.exports = function callBind(originalFunction) {
	if (typeof originalFunction !== 'function') {
		throw new $TypeError('a function is required');
	}
	var func = $reflectApply(bind, $call, arguments);
	return setFunctionLength(
		func,
		1 + $max(0, originalFunction.length - (arguments.length - 1)),
		true
	);
};

var applyBind = function applyBind() {
	return $reflectApply(bind, $apply, arguments);
};

if ($defineProperty) {
	$defineProperty(module.exports, 'apply', { value: applyBind });
} else {
	module.exports.apply = applyBind;
}


/***/ }),

/***/ 41:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var $defineProperty = __webpack_require__(655);

var $SyntaxError = __webpack_require__(8068);
var $TypeError = __webpack_require__(9675);

var gopd = __webpack_require__(5795);

/** @type {import('.')} */
module.exports = function defineDataProperty(
	obj,
	property,
	value
) {
	if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) {
		throw new $TypeError('`obj` must be an object or a function`');
	}
	if (typeof property !== 'string' && typeof property !== 'symbol') {
		throw new $TypeError('`property` must be a string or a symbol`');
	}
	if (arguments.length > 3 && typeof arguments[3] !== 'boolean' && arguments[3] !== null) {
		throw new $TypeError('`nonEnumerable`, if provided, must be a boolean or null');
	}
	if (arguments.length > 4 && typeof arguments[4] !== 'boolean' && arguments[4] !== null) {
		throw new $TypeError('`nonWritable`, if provided, must be a boolean or null');
	}
	if (arguments.length > 5 && typeof arguments[5] !== 'boolean' && arguments[5] !== null) {
		throw new $TypeError('`nonConfigurable`, if provided, must be a boolean or null');
	}
	if (arguments.length > 6 && typeof arguments[6] !== 'boolean') {
		throw new $TypeError('`loose`, if provided, must be a boolean');
	}

	var nonEnumerable = arguments.length > 3 ? arguments[3] : null;
	var nonWritable = arguments.length > 4 ? arguments[4] : null;
	var nonConfigurable = arguments.length > 5 ? arguments[5] : null;
	var loose = arguments.length > 6 ? arguments[6] : false;

	/* @type {false | TypedPropertyDescriptor<unknown>} */
	var desc = !!gopd && gopd(obj, property);

	if ($defineProperty) {
		$defineProperty(obj, property, {
			configurable: nonConfigurable === null && desc ? desc.configurable : !nonConfigurable,
			enumerable: nonEnumerable === null && desc ? desc.enumerable : !nonEnumerable,
			value: value,
			writable: nonWritable === null && desc ? desc.writable : !nonWritable
		});
	} else if (loose || (!nonEnumerable && !nonWritable && !nonConfigurable)) {
		// must fall back to [[Set]], and was not explicitly asked to make non-enumerable, non-writable, or non-configurable
		obj[property] = value; // eslint-disable-line no-param-reassign
	} else {
		throw new $SyntaxError('This environment does not support defining a property as non-configurable, non-writable, or non-enumerable.');
	}
};


/***/ }),

/***/ 655:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var GetIntrinsic = __webpack_require__(453);

/** @type {import('.')} */
var $defineProperty = GetIntrinsic('%Object.defineProperty%', true) || false;
if ($defineProperty) {
	try {
		$defineProperty({}, 'a', { value: 1 });
	} catch (e) {
		// IE 8 has a broken defineProperty
		$defineProperty = false;
	}
}

module.exports = $defineProperty;


/***/ }),

/***/ 1237:
/***/ ((module) => {

"use strict";


/** @type {import('./eval')} */
module.exports = EvalError;


/***/ }),

/***/ 9383:
/***/ ((module) => {

"use strict";


/** @type {import('.')} */
module.exports = Error;


/***/ }),

/***/ 9290:
/***/ ((module) => {

"use strict";


/** @type {import('./range')} */
module.exports = RangeError;


/***/ }),

/***/ 9538:
/***/ ((module) => {

"use strict";


/** @type {import('./ref')} */
module.exports = ReferenceError;


/***/ }),

/***/ 8068:
/***/ ((module) => {

"use strict";


/** @type {import('./syntax')} */
module.exports = SyntaxError;


/***/ }),

/***/ 9675:
/***/ ((module) => {

"use strict";


/** @type {import('./type')} */
module.exports = TypeError;


/***/ }),

/***/ 5345:
/***/ ((module) => {

"use strict";


/** @type {import('./uri')} */
module.exports = URIError;


/***/ }),

/***/ 9353:
/***/ ((module) => {

"use strict";


/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var toStr = Object.prototype.toString;
var max = Math.max;
var funcType = '[object Function]';

var concatty = function concatty(a, b) {
    var arr = [];

    for (var i = 0; i < a.length; i += 1) {
        arr[i] = a[i];
    }
    for (var j = 0; j < b.length; j += 1) {
        arr[j + a.length] = b[j];
    }

    return arr;
};

var slicy = function slicy(arrLike, offset) {
    var arr = [];
    for (var i = offset || 0, j = 0; i < arrLike.length; i += 1, j += 1) {
        arr[j] = arrLike[i];
    }
    return arr;
};

var joiny = function (arr, joiner) {
    var str = '';
    for (var i = 0; i < arr.length; i += 1) {
        str += arr[i];
        if (i + 1 < arr.length) {
            str += joiner;
        }
    }
    return str;
};

module.exports = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr.apply(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slicy(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                concatty(args, arguments)
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        }
        return target.apply(
            that,
            concatty(args, arguments)
        );

    };

    var boundLength = max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs[i] = '$' + i;
    }

    bound = Function('binder', 'return function (' + joiny(boundArgs, ',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};


/***/ }),

/***/ 6743:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var implementation = __webpack_require__(9353);

module.exports = Function.prototype.bind || implementation;


/***/ }),

/***/ 453:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var undefined;

var $Error = __webpack_require__(9383);
var $EvalError = __webpack_require__(1237);
var $RangeError = __webpack_require__(9290);
var $ReferenceError = __webpack_require__(9538);
var $SyntaxError = __webpack_require__(8068);
var $TypeError = __webpack_require__(9675);
var $URIError = __webpack_require__(5345);

var $Function = Function;

// eslint-disable-next-line consistent-return
var getEvalledConstructor = function (expressionSyntax) {
	try {
		return $Function('"use strict"; return (' + expressionSyntax + ').constructor;')();
	} catch (e) {}
};

var $gOPD = Object.getOwnPropertyDescriptor;
if ($gOPD) {
	try {
		$gOPD({}, '');
	} catch (e) {
		$gOPD = null; // this is IE 8, which has a broken gOPD
	}
}

var throwTypeError = function () {
	throw new $TypeError();
};
var ThrowTypeError = $gOPD
	? (function () {
		try {
			// eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
			arguments.callee; // IE 8 does not throw here
			return throwTypeError;
		} catch (calleeThrows) {
			try {
				// IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
				return $gOPD(arguments, 'callee').get;
			} catch (gOPDthrows) {
				return throwTypeError;
			}
		}
	}())
	: throwTypeError;

var hasSymbols = __webpack_require__(4039)();
var hasProto = __webpack_require__(24)();

var getProto = Object.getPrototypeOf || (
	hasProto
		? function (x) { return x.__proto__; } // eslint-disable-line no-proto
		: null
);

var needsEval = {};

var TypedArray = typeof Uint8Array === 'undefined' || !getProto ? undefined : getProto(Uint8Array);

var INTRINSICS = {
	__proto__: null,
	'%AggregateError%': typeof AggregateError === 'undefined' ? undefined : AggregateError,
	'%Array%': Array,
	'%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer,
	'%ArrayIteratorPrototype%': hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined,
	'%AsyncFromSyncIteratorPrototype%': undefined,
	'%AsyncFunction%': needsEval,
	'%AsyncGenerator%': needsEval,
	'%AsyncGeneratorFunction%': needsEval,
	'%AsyncIteratorPrototype%': needsEval,
	'%Atomics%': typeof Atomics === 'undefined' ? undefined : Atomics,
	'%BigInt%': typeof BigInt === 'undefined' ? undefined : BigInt,
	'%BigInt64Array%': typeof BigInt64Array === 'undefined' ? undefined : BigInt64Array,
	'%BigUint64Array%': typeof BigUint64Array === 'undefined' ? undefined : BigUint64Array,
	'%Boolean%': Boolean,
	'%DataView%': typeof DataView === 'undefined' ? undefined : DataView,
	'%Date%': Date,
	'%decodeURI%': decodeURI,
	'%decodeURIComponent%': decodeURIComponent,
	'%encodeURI%': encodeURI,
	'%encodeURIComponent%': encodeURIComponent,
	'%Error%': $Error,
	'%eval%': eval, // eslint-disable-line no-eval
	'%EvalError%': $EvalError,
	'%Float32Array%': typeof Float32Array === 'undefined' ? undefined : Float32Array,
	'%Float64Array%': typeof Float64Array === 'undefined' ? undefined : Float64Array,
	'%FinalizationRegistry%': typeof FinalizationRegistry === 'undefined' ? undefined : FinalizationRegistry,
	'%Function%': $Function,
	'%GeneratorFunction%': needsEval,
	'%Int8Array%': typeof Int8Array === 'undefined' ? undefined : Int8Array,
	'%Int16Array%': typeof Int16Array === 'undefined' ? undefined : Int16Array,
	'%Int32Array%': typeof Int32Array === 'undefined' ? undefined : Int32Array,
	'%isFinite%': isFinite,
	'%isNaN%': isNaN,
	'%IteratorPrototype%': hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined,
	'%JSON%': typeof JSON === 'object' ? JSON : undefined,
	'%Map%': typeof Map === 'undefined' ? undefined : Map,
	'%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols || !getProto ? undefined : getProto(new Map()[Symbol.iterator]()),
	'%Math%': Math,
	'%Number%': Number,
	'%Object%': Object,
	'%parseFloat%': parseFloat,
	'%parseInt%': parseInt,
	'%Promise%': typeof Promise === 'undefined' ? undefined : Promise,
	'%Proxy%': typeof Proxy === 'undefined' ? undefined : Proxy,
	'%RangeError%': $RangeError,
	'%ReferenceError%': $ReferenceError,
	'%Reflect%': typeof Reflect === 'undefined' ? undefined : Reflect,
	'%RegExp%': RegExp,
	'%Set%': typeof Set === 'undefined' ? undefined : Set,
	'%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols || !getProto ? undefined : getProto(new Set()[Symbol.iterator]()),
	'%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer,
	'%String%': String,
	'%StringIteratorPrototype%': hasSymbols && getProto ? getProto(''[Symbol.iterator]()) : undefined,
	'%Symbol%': hasSymbols ? Symbol : undefined,
	'%SyntaxError%': $SyntaxError,
	'%ThrowTypeError%': ThrowTypeError,
	'%TypedArray%': TypedArray,
	'%TypeError%': $TypeError,
	'%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array,
	'%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray,
	'%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array,
	'%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array,
	'%URIError%': $URIError,
	'%WeakMap%': typeof WeakMap === 'undefined' ? undefined : WeakMap,
	'%WeakRef%': typeof WeakRef === 'undefined' ? undefined : WeakRef,
	'%WeakSet%': typeof WeakSet === 'undefined' ? undefined : WeakSet
};

if (getProto) {
	try {
		null.error; // eslint-disable-line no-unused-expressions
	} catch (e) {
		// https://github.com/tc39/proposal-shadowrealm/pull/384#issuecomment-1364264229
		var errorProto = getProto(getProto(e));
		INTRINSICS['%Error.prototype%'] = errorProto;
	}
}

var doEval = function doEval(name) {
	var value;
	if (name === '%AsyncFunction%') {
		value = getEvalledConstructor('async function () {}');
	} else if (name === '%GeneratorFunction%') {
		value = getEvalledConstructor('function* () {}');
	} else if (name === '%AsyncGeneratorFunction%') {
		value = getEvalledConstructor('async function* () {}');
	} else if (name === '%AsyncGenerator%') {
		var fn = doEval('%AsyncGeneratorFunction%');
		if (fn) {
			value = fn.prototype;
		}
	} else if (name === '%AsyncIteratorPrototype%') {
		var gen = doEval('%AsyncGenerator%');
		if (gen && getProto) {
			value = getProto(gen.prototype);
		}
	}

	INTRINSICS[name] = value;

	return value;
};

var LEGACY_ALIASES = {
	__proto__: null,
	'%ArrayBufferPrototype%': ['ArrayBuffer', 'prototype'],
	'%ArrayPrototype%': ['Array', 'prototype'],
	'%ArrayProto_entries%': ['Array', 'prototype', 'entries'],
	'%ArrayProto_forEach%': ['Array', 'prototype', 'forEach'],
	'%ArrayProto_keys%': ['Array', 'prototype', 'keys'],
	'%ArrayProto_values%': ['Array', 'prototype', 'values'],
	'%AsyncFunctionPrototype%': ['AsyncFunction', 'prototype'],
	'%AsyncGenerator%': ['AsyncGeneratorFunction', 'prototype'],
	'%AsyncGeneratorPrototype%': ['AsyncGeneratorFunction', 'prototype', 'prototype'],
	'%BooleanPrototype%': ['Boolean', 'prototype'],
	'%DataViewPrototype%': ['DataView', 'prototype'],
	'%DatePrototype%': ['Date', 'prototype'],
	'%ErrorPrototype%': ['Error', 'prototype'],
	'%EvalErrorPrototype%': ['EvalError', 'prototype'],
	'%Float32ArrayPrototype%': ['Float32Array', 'prototype'],
	'%Float64ArrayPrototype%': ['Float64Array', 'prototype'],
	'%FunctionPrototype%': ['Function', 'prototype'],
	'%Generator%': ['GeneratorFunction', 'prototype'],
	'%GeneratorPrototype%': ['GeneratorFunction', 'prototype', 'prototype'],
	'%Int8ArrayPrototype%': ['Int8Array', 'prototype'],
	'%Int16ArrayPrototype%': ['Int16Array', 'prototype'],
	'%Int32ArrayPrototype%': ['Int32Array', 'prototype'],
	'%JSONParse%': ['JSON', 'parse'],
	'%JSONStringify%': ['JSON', 'stringify'],
	'%MapPrototype%': ['Map', 'prototype'],
	'%NumberPrototype%': ['Number', 'prototype'],
	'%ObjectPrototype%': ['Object', 'prototype'],
	'%ObjProto_toString%': ['Object', 'prototype', 'toString'],
	'%ObjProto_valueOf%': ['Object', 'prototype', 'valueOf'],
	'%PromisePrototype%': ['Promise', 'prototype'],
	'%PromiseProto_then%': ['Promise', 'prototype', 'then'],
	'%Promise_all%': ['Promise', 'all'],
	'%Promise_reject%': ['Promise', 'reject'],
	'%Promise_resolve%': ['Promise', 'resolve'],
	'%RangeErrorPrototype%': ['RangeError', 'prototype'],
	'%ReferenceErrorPrototype%': ['ReferenceError', 'prototype'],
	'%RegExpPrototype%': ['RegExp', 'prototype'],
	'%SetPrototype%': ['Set', 'prototype'],
	'%SharedArrayBufferPrototype%': ['SharedArrayBuffer', 'prototype'],
	'%StringPrototype%': ['String', 'prototype'],
	'%SymbolPrototype%': ['Symbol', 'prototype'],
	'%SyntaxErrorPrototype%': ['SyntaxError', 'prototype'],
	'%TypedArrayPrototype%': ['TypedArray', 'prototype'],
	'%TypeErrorPrototype%': ['TypeError', 'prototype'],
	'%Uint8ArrayPrototype%': ['Uint8Array', 'prototype'],
	'%Uint8ClampedArrayPrototype%': ['Uint8ClampedArray', 'prototype'],
	'%Uint16ArrayPrototype%': ['Uint16Array', 'prototype'],
	'%Uint32ArrayPrototype%': ['Uint32Array', 'prototype'],
	'%URIErrorPrototype%': ['URIError', 'prototype'],
	'%WeakMapPrototype%': ['WeakMap', 'prototype'],
	'%WeakSetPrototype%': ['WeakSet', 'prototype']
};

var bind = __webpack_require__(6743);
var hasOwn = __webpack_require__(9957);
var $concat = bind.call(Function.call, Array.prototype.concat);
var $spliceApply = bind.call(Function.apply, Array.prototype.splice);
var $replace = bind.call(Function.call, String.prototype.replace);
var $strSlice = bind.call(Function.call, String.prototype.slice);
var $exec = bind.call(Function.call, RegExp.prototype.exec);

/* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */
var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var reEscapeChar = /\\(\\)?/g; /** Used to match backslashes in property paths. */
var stringToPath = function stringToPath(string) {
	var first = $strSlice(string, 0, 1);
	var last = $strSlice(string, -1);
	if (first === '%' && last !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected closing `%`');
	} else if (last === '%' && first !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected opening `%`');
	}
	var result = [];
	$replace(string, rePropName, function (match, number, quote, subString) {
		result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : number || match;
	});
	return result;
};
/* end adaptation */

var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
	var intrinsicName = name;
	var alias;
	if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
		alias = LEGACY_ALIASES[intrinsicName];
		intrinsicName = '%' + alias[0] + '%';
	}

	if (hasOwn(INTRINSICS, intrinsicName)) {
		var value = INTRINSICS[intrinsicName];
		if (value === needsEval) {
			value = doEval(intrinsicName);
		}
		if (typeof value === 'undefined' && !allowMissing) {
			throw new $TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
		}

		return {
			alias: alias,
			name: intrinsicName,
			value: value
		};
	}

	throw new $SyntaxError('intrinsic ' + name + ' does not exist!');
};

module.exports = function GetIntrinsic(name, allowMissing) {
	if (typeof name !== 'string' || name.length === 0) {
		throw new $TypeError('intrinsic name must be a non-empty string');
	}
	if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
		throw new $TypeError('"allowMissing" argument must be a boolean');
	}

	if ($exec(/^%?[^%]*%?$/, name) === null) {
		throw new $SyntaxError('`%` may not be present anywhere but at the beginning and end of the intrinsic name');
	}
	var parts = stringToPath(name);
	var intrinsicBaseName = parts.length > 0 ? parts[0] : '';

	var intrinsic = getBaseIntrinsic('%' + intrinsicBaseName + '%', allowMissing);
	var intrinsicRealName = intrinsic.name;
	var value = intrinsic.value;
	var skipFurtherCaching = false;

	var alias = intrinsic.alias;
	if (alias) {
		intrinsicBaseName = alias[0];
		$spliceApply(parts, $concat([0, 1], alias));
	}

	for (var i = 1, isOwn = true; i < parts.length; i += 1) {
		var part = parts[i];
		var first = $strSlice(part, 0, 1);
		var last = $strSlice(part, -1);
		if (
			(
				(first === '"' || first === "'" || first === '`')
				|| (last === '"' || last === "'" || last === '`')
			)
			&& first !== last
		) {
			throw new $SyntaxError('property names with quotes must have matching quotes');
		}
		if (part === 'constructor' || !isOwn) {
			skipFurtherCaching = true;
		}

		intrinsicBaseName += '.' + part;
		intrinsicRealName = '%' + intrinsicBaseName + '%';

		if (hasOwn(INTRINSICS, intrinsicRealName)) {
			value = INTRINSICS[intrinsicRealName];
		} else if (value != null) {
			if (!(part in value)) {
				if (!allowMissing) {
					throw new $TypeError('base intrinsic for ' + name + ' exists, but the property is not available.');
				}
				return void undefined;
			}
			if ($gOPD && (i + 1) >= parts.length) {
				var desc = $gOPD(value, part);
				isOwn = !!desc;

				// By convention, when a data property is converted to an accessor
				// property to emulate a data property that does not suffer from
				// the override mistake, that accessor's getter is marked with
				// an `originalValue` property. Here, when we detect this, we
				// uphold the illusion by pretending to see that original data
				// property, i.e., returning the value rather than the getter
				// itself.
				if (isOwn && 'get' in desc && !('originalValue' in desc.get)) {
					value = desc.get;
				} else {
					value = value[part];
				}
			} else {
				isOwn = hasOwn(value, part);
				value = value[part];
			}

			if (isOwn && !skipFurtherCaching) {
				INTRINSICS[intrinsicRealName] = value;
			}
		}
	}
	return value;
};


/***/ }),

/***/ 5795:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var GetIntrinsic = __webpack_require__(453);

var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);

if ($gOPD) {
	try {
		$gOPD([], 'length');
	} catch (e) {
		// IE 8 has a broken gOPD
		$gOPD = null;
	}
}

module.exports = $gOPD;


/***/ }),

/***/ 592:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var $defineProperty = __webpack_require__(655);

var hasPropertyDescriptors = function hasPropertyDescriptors() {
	return !!$defineProperty;
};

hasPropertyDescriptors.hasArrayLengthDefineBug = function hasArrayLengthDefineBug() {
	// node v0.6 has a bug where array lengths can be Set but not Defined
	if (!$defineProperty) {
		return null;
	}
	try {
		return $defineProperty([], 'length', { value: 1 }).length !== 1;
	} catch (e) {
		// In Firefox 4-22, defining length on an array throws an exception.
		return true;
	}
};

module.exports = hasPropertyDescriptors;


/***/ }),

/***/ 24:
/***/ ((module) => {

"use strict";


var test = {
	__proto__: null,
	foo: {}
};

var $Object = Object;

/** @type {import('.')} */
module.exports = function hasProto() {
	// @ts-expect-error: TS errors on an inherited property for some reason
	return { __proto__: test }.foo === test.foo
		&& !(test instanceof $Object);
};


/***/ }),

/***/ 4039:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var origSymbol = typeof Symbol !== 'undefined' && Symbol;
var hasSymbolSham = __webpack_require__(1333);

module.exports = function hasNativeSymbols() {
	if (typeof origSymbol !== 'function') { return false; }
	if (typeof Symbol !== 'function') { return false; }
	if (typeof origSymbol('foo') !== 'symbol') { return false; }
	if (typeof Symbol('bar') !== 'symbol') { return false; }

	return hasSymbolSham();
};


/***/ }),

/***/ 1333:
/***/ ((module) => {

"use strict";


/* eslint complexity: [2, 18], max-statements: [2, 33] */
module.exports = function hasSymbols() {
	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
	if (typeof Symbol.iterator === 'symbol') { return true; }

	var obj = {};
	var sym = Symbol('test');
	var symObj = Object(sym);
	if (typeof sym === 'string') { return false; }

	if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
	if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

	// temp disabled per https://github.com/ljharb/object.assign/issues/17
	// if (sym instanceof Symbol) { return false; }
	// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
	// if (!(symObj instanceof Symbol)) { return false; }

	// if (typeof Symbol.prototype.toString !== 'function') { return false; }
	// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

	var symVal = 42;
	obj[sym] = symVal;
	for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax, no-unreachable-loop
	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

	if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

	var syms = Object.getOwnPropertySymbols(obj);
	if (syms.length !== 1 || syms[0] !== sym) { return false; }

	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

	if (typeof Object.getOwnPropertyDescriptor === 'function') {
		var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
		if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
	}

	return true;
};


/***/ }),

/***/ 9957:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var call = Function.prototype.call;
var $hasOwn = Object.prototype.hasOwnProperty;
var bind = __webpack_require__(6743);

/** @type {import('.')} */
module.exports = bind.call(call, $hasOwn);


/***/ }),

/***/ 8859:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var hasMap = typeof Map === 'function' && Map.prototype;
var mapSizeDescriptor = Object.getOwnPropertyDescriptor && hasMap ? Object.getOwnPropertyDescriptor(Map.prototype, 'size') : null;
var mapSize = hasMap && mapSizeDescriptor && typeof mapSizeDescriptor.get === 'function' ? mapSizeDescriptor.get : null;
var mapForEach = hasMap && Map.prototype.forEach;
var hasSet = typeof Set === 'function' && Set.prototype;
var setSizeDescriptor = Object.getOwnPropertyDescriptor && hasSet ? Object.getOwnPropertyDescriptor(Set.prototype, 'size') : null;
var setSize = hasSet && setSizeDescriptor && typeof setSizeDescriptor.get === 'function' ? setSizeDescriptor.get : null;
var setForEach = hasSet && Set.prototype.forEach;
var hasWeakMap = typeof WeakMap === 'function' && WeakMap.prototype;
var weakMapHas = hasWeakMap ? WeakMap.prototype.has : null;
var hasWeakSet = typeof WeakSet === 'function' && WeakSet.prototype;
var weakSetHas = hasWeakSet ? WeakSet.prototype.has : null;
var hasWeakRef = typeof WeakRef === 'function' && WeakRef.prototype;
var weakRefDeref = hasWeakRef ? WeakRef.prototype.deref : null;
var booleanValueOf = Boolean.prototype.valueOf;
var objectToString = Object.prototype.toString;
var functionToString = Function.prototype.toString;
var $match = String.prototype.match;
var $slice = String.prototype.slice;
var $replace = String.prototype.replace;
var $toUpperCase = String.prototype.toUpperCase;
var $toLowerCase = String.prototype.toLowerCase;
var $test = RegExp.prototype.test;
var $concat = Array.prototype.concat;
var $join = Array.prototype.join;
var $arrSlice = Array.prototype.slice;
var $floor = Math.floor;
var bigIntValueOf = typeof BigInt === 'function' ? BigInt.prototype.valueOf : null;
var gOPS = Object.getOwnPropertySymbols;
var symToString = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol' ? Symbol.prototype.toString : null;
var hasShammedSymbols = typeof Symbol === 'function' && typeof Symbol.iterator === 'object';
// ie, `has-tostringtag/shams
var toStringTag = typeof Symbol === 'function' && Symbol.toStringTag && (typeof Symbol.toStringTag === hasShammedSymbols ? 'object' : 'symbol')
    ? Symbol.toStringTag
    : null;
var isEnumerable = Object.prototype.propertyIsEnumerable;

var gPO = (typeof Reflect === 'function' ? Reflect.getPrototypeOf : Object.getPrototypeOf) || (
    [].__proto__ === Array.prototype // eslint-disable-line no-proto
        ? function (O) {
            return O.__proto__; // eslint-disable-line no-proto
        }
        : null
);

function addNumericSeparator(num, str) {
    if (
        num === Infinity
        || num === -Infinity
        || num !== num
        || (num && num > -1000 && num < 1000)
        || $test.call(/e/, str)
    ) {
        return str;
    }
    var sepRegex = /[0-9](?=(?:[0-9]{3})+(?![0-9]))/g;
    if (typeof num === 'number') {
        var int = num < 0 ? -$floor(-num) : $floor(num); // trunc(num)
        if (int !== num) {
            var intStr = String(int);
            var dec = $slice.call(str, intStr.length + 1);
            return $replace.call(intStr, sepRegex, '$&_') + '.' + $replace.call($replace.call(dec, /([0-9]{3})/g, '$&_'), /_$/, '');
        }
    }
    return $replace.call(str, sepRegex, '$&_');
}

var utilInspect = __webpack_require__(2634);
var inspectCustom = utilInspect.custom;
var inspectSymbol = isSymbol(inspectCustom) ? inspectCustom : null;

module.exports = function inspect_(obj, options, depth, seen) {
    var opts = options || {};

    if (has(opts, 'quoteStyle') && (opts.quoteStyle !== 'single' && opts.quoteStyle !== 'double')) {
        throw new TypeError('option "quoteStyle" must be "single" or "double"');
    }
    if (
        has(opts, 'maxStringLength') && (typeof opts.maxStringLength === 'number'
            ? opts.maxStringLength < 0 && opts.maxStringLength !== Infinity
            : opts.maxStringLength !== null
        )
    ) {
        throw new TypeError('option "maxStringLength", if provided, must be a positive integer, Infinity, or `null`');
    }
    var customInspect = has(opts, 'customInspect') ? opts.customInspect : true;
    if (typeof customInspect !== 'boolean' && customInspect !== 'symbol') {
        throw new TypeError('option "customInspect", if provided, must be `true`, `false`, or `\'symbol\'`');
    }

    if (
        has(opts, 'indent')
        && opts.indent !== null
        && opts.indent !== '\t'
        && !(parseInt(opts.indent, 10) === opts.indent && opts.indent > 0)
    ) {
        throw new TypeError('option "indent" must be "\\t", an integer > 0, or `null`');
    }
    if (has(opts, 'numericSeparator') && typeof opts.numericSeparator !== 'boolean') {
        throw new TypeError('option "numericSeparator", if provided, must be `true` or `false`');
    }
    var numericSeparator = opts.numericSeparator;

    if (typeof obj === 'undefined') {
        return 'undefined';
    }
    if (obj === null) {
        return 'null';
    }
    if (typeof obj === 'boolean') {
        return obj ? 'true' : 'false';
    }

    if (typeof obj === 'string') {
        return inspectString(obj, opts);
    }
    if (typeof obj === 'number') {
        if (obj === 0) {
            return Infinity / obj > 0 ? '0' : '-0';
        }
        var str = String(obj);
        return numericSeparator ? addNumericSeparator(obj, str) : str;
    }
    if (typeof obj === 'bigint') {
        var bigIntStr = String(obj) + 'n';
        return numericSeparator ? addNumericSeparator(obj, bigIntStr) : bigIntStr;
    }

    var maxDepth = typeof opts.depth === 'undefined' ? 5 : opts.depth;
    if (typeof depth === 'undefined') { depth = 0; }
    if (depth >= maxDepth && maxDepth > 0 && typeof obj === 'object') {
        return isArray(obj) ? '[Array]' : '[Object]';
    }

    var indent = getIndent(opts, depth);

    if (typeof seen === 'undefined') {
        seen = [];
    } else if (indexOf(seen, obj) >= 0) {
        return '[Circular]';
    }

    function inspect(value, from, noIndent) {
        if (from) {
            seen = $arrSlice.call(seen);
            seen.push(from);
        }
        if (noIndent) {
            var newOpts = {
                depth: opts.depth
            };
            if (has(opts, 'quoteStyle')) {
                newOpts.quoteStyle = opts.quoteStyle;
            }
            return inspect_(value, newOpts, depth + 1, seen);
        }
        return inspect_(value, opts, depth + 1, seen);
    }

    if (typeof obj === 'function' && !isRegExp(obj)) { // in older engines, regexes are callable
        var name = nameOf(obj);
        var keys = arrObjKeys(obj, inspect);
        return '[Function' + (name ? ': ' + name : ' (anonymous)') + ']' + (keys.length > 0 ? ' { ' + $join.call(keys, ', ') + ' }' : '');
    }
    if (isSymbol(obj)) {
        var symString = hasShammedSymbols ? $replace.call(String(obj), /^(Symbol\(.*\))_[^)]*$/, '$1') : symToString.call(obj);
        return typeof obj === 'object' && !hasShammedSymbols ? markBoxed(symString) : symString;
    }
    if (isElement(obj)) {
        var s = '<' + $toLowerCase.call(String(obj.nodeName));
        var attrs = obj.attributes || [];
        for (var i = 0; i < attrs.length; i++) {
            s += ' ' + attrs[i].name + '=' + wrapQuotes(quote(attrs[i].value), 'double', opts);
        }
        s += '>';
        if (obj.childNodes && obj.childNodes.length) { s += '...'; }
        s += '</' + $toLowerCase.call(String(obj.nodeName)) + '>';
        return s;
    }
    if (isArray(obj)) {
        if (obj.length === 0) { return '[]'; }
        var xs = arrObjKeys(obj, inspect);
        if (indent && !singleLineValues(xs)) {
            return '[' + indentedJoin(xs, indent) + ']';
        }
        return '[ ' + $join.call(xs, ', ') + ' ]';
    }
    if (isError(obj)) {
        var parts = arrObjKeys(obj, inspect);
        if (!('cause' in Error.prototype) && 'cause' in obj && !isEnumerable.call(obj, 'cause')) {
            return '{ [' + String(obj) + '] ' + $join.call($concat.call('[cause]: ' + inspect(obj.cause), parts), ', ') + ' }';
        }
        if (parts.length === 0) { return '[' + String(obj) + ']'; }
        return '{ [' + String(obj) + '] ' + $join.call(parts, ', ') + ' }';
    }
    if (typeof obj === 'object' && customInspect) {
        if (inspectSymbol && typeof obj[inspectSymbol] === 'function' && utilInspect) {
            return utilInspect(obj, { depth: maxDepth - depth });
        } else if (customInspect !== 'symbol' && typeof obj.inspect === 'function') {
            return obj.inspect();
        }
    }
    if (isMap(obj)) {
        var mapParts = [];
        if (mapForEach) {
            mapForEach.call(obj, function (value, key) {
                mapParts.push(inspect(key, obj, true) + ' => ' + inspect(value, obj));
            });
        }
        return collectionOf('Map', mapSize.call(obj), mapParts, indent);
    }
    if (isSet(obj)) {
        var setParts = [];
        if (setForEach) {
            setForEach.call(obj, function (value) {
                setParts.push(inspect(value, obj));
            });
        }
        return collectionOf('Set', setSize.call(obj), setParts, indent);
    }
    if (isWeakMap(obj)) {
        return weakCollectionOf('WeakMap');
    }
    if (isWeakSet(obj)) {
        return weakCollectionOf('WeakSet');
    }
    if (isWeakRef(obj)) {
        return weakCollectionOf('WeakRef');
    }
    if (isNumber(obj)) {
        return markBoxed(inspect(Number(obj)));
    }
    if (isBigInt(obj)) {
        return markBoxed(inspect(bigIntValueOf.call(obj)));
    }
    if (isBoolean(obj)) {
        return markBoxed(booleanValueOf.call(obj));
    }
    if (isString(obj)) {
        return markBoxed(inspect(String(obj)));
    }
    // note: in IE 8, sometimes `global !== window` but both are the prototypes of each other
    /* eslint-env browser */
    if (typeof window !== 'undefined' && obj === window) {
        return '{ [object Window] }';
    }
    if (obj === __webpack_require__.g) {
        return '{ [object globalThis] }';
    }
    if (!isDate(obj) && !isRegExp(obj)) {
        var ys = arrObjKeys(obj, inspect);
        var isPlainObject = gPO ? gPO(obj) === Object.prototype : obj instanceof Object || obj.constructor === Object;
        var protoTag = obj instanceof Object ? '' : 'null prototype';
        var stringTag = !isPlainObject && toStringTag && Object(obj) === obj && toStringTag in obj ? $slice.call(toStr(obj), 8, -1) : protoTag ? 'Object' : '';
        var constructorTag = isPlainObject || typeof obj.constructor !== 'function' ? '' : obj.constructor.name ? obj.constructor.name + ' ' : '';
        var tag = constructorTag + (stringTag || protoTag ? '[' + $join.call($concat.call([], stringTag || [], protoTag || []), ': ') + '] ' : '');
        if (ys.length === 0) { return tag + '{}'; }
        if (indent) {
            return tag + '{' + indentedJoin(ys, indent) + '}';
        }
        return tag + '{ ' + $join.call(ys, ', ') + ' }';
    }
    return String(obj);
};

function wrapQuotes(s, defaultStyle, opts) {
    var quoteChar = (opts.quoteStyle || defaultStyle) === 'double' ? '"' : "'";
    return quoteChar + s + quoteChar;
}

function quote(s) {
    return $replace.call(String(s), /"/g, '&quot;');
}

function isArray(obj) { return toStr(obj) === '[object Array]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isDate(obj) { return toStr(obj) === '[object Date]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isRegExp(obj) { return toStr(obj) === '[object RegExp]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isError(obj) { return toStr(obj) === '[object Error]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isString(obj) { return toStr(obj) === '[object String]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isNumber(obj) { return toStr(obj) === '[object Number]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
function isBoolean(obj) { return toStr(obj) === '[object Boolean]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }

// Symbol and BigInt do have Symbol.toStringTag by spec, so that can't be used to eliminate false positives
function isSymbol(obj) {
    if (hasShammedSymbols) {
        return obj && typeof obj === 'object' && obj instanceof Symbol;
    }
    if (typeof obj === 'symbol') {
        return true;
    }
    if (!obj || typeof obj !== 'object' || !symToString) {
        return false;
    }
    try {
        symToString.call(obj);
        return true;
    } catch (e) {}
    return false;
}

function isBigInt(obj) {
    if (!obj || typeof obj !== 'object' || !bigIntValueOf) {
        return false;
    }
    try {
        bigIntValueOf.call(obj);
        return true;
    } catch (e) {}
    return false;
}

var hasOwn = Object.prototype.hasOwnProperty || function (key) { return key in this; };
function has(obj, key) {
    return hasOwn.call(obj, key);
}

function toStr(obj) {
    return objectToString.call(obj);
}

function nameOf(f) {
    if (f.name) { return f.name; }
    var m = $match.call(functionToString.call(f), /^function\s*([\w$]+)/);
    if (m) { return m[1]; }
    return null;
}

function indexOf(xs, x) {
    if (xs.indexOf) { return xs.indexOf(x); }
    for (var i = 0, l = xs.length; i < l; i++) {
        if (xs[i] === x) { return i; }
    }
    return -1;
}

function isMap(x) {
    if (!mapSize || !x || typeof x !== 'object') {
        return false;
    }
    try {
        mapSize.call(x);
        try {
            setSize.call(x);
        } catch (s) {
            return true;
        }
        return x instanceof Map; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isWeakMap(x) {
    if (!weakMapHas || !x || typeof x !== 'object') {
        return false;
    }
    try {
        weakMapHas.call(x, weakMapHas);
        try {
            weakSetHas.call(x, weakSetHas);
        } catch (s) {
            return true;
        }
        return x instanceof WeakMap; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isWeakRef(x) {
    if (!weakRefDeref || !x || typeof x !== 'object') {
        return false;
    }
    try {
        weakRefDeref.call(x);
        return true;
    } catch (e) {}
    return false;
}

function isSet(x) {
    if (!setSize || !x || typeof x !== 'object') {
        return false;
    }
    try {
        setSize.call(x);
        try {
            mapSize.call(x);
        } catch (m) {
            return true;
        }
        return x instanceof Set; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isWeakSet(x) {
    if (!weakSetHas || !x || typeof x !== 'object') {
        return false;
    }
    try {
        weakSetHas.call(x, weakSetHas);
        try {
            weakMapHas.call(x, weakMapHas);
        } catch (s) {
            return true;
        }
        return x instanceof WeakSet; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isElement(x) {
    if (!x || typeof x !== 'object') { return false; }
    if (typeof HTMLElement !== 'undefined' && x instanceof HTMLElement) {
        return true;
    }
    return typeof x.nodeName === 'string' && typeof x.getAttribute === 'function';
}

function inspectString(str, opts) {
    if (str.length > opts.maxStringLength) {
        var remaining = str.length - opts.maxStringLength;
        var trailer = '... ' + remaining + ' more character' + (remaining > 1 ? 's' : '');
        return inspectString($slice.call(str, 0, opts.maxStringLength), opts) + trailer;
    }
    // eslint-disable-next-line no-control-regex
    var s = $replace.call($replace.call(str, /(['\\])/g, '\\$1'), /[\x00-\x1f]/g, lowbyte);
    return wrapQuotes(s, 'single', opts);
}

function lowbyte(c) {
    var n = c.charCodeAt(0);
    var x = {
        8: 'b',
        9: 't',
        10: 'n',
        12: 'f',
        13: 'r'
    }[n];
    if (x) { return '\\' + x; }
    return '\\x' + (n < 0x10 ? '0' : '') + $toUpperCase.call(n.toString(16));
}

function markBoxed(str) {
    return 'Object(' + str + ')';
}

function weakCollectionOf(type) {
    return type + ' { ? }';
}

function collectionOf(type, size, entries, indent) {
    var joinedEntries = indent ? indentedJoin(entries, indent) : $join.call(entries, ', ');
    return type + ' (' + size + ') {' + joinedEntries + '}';
}

function singleLineValues(xs) {
    for (var i = 0; i < xs.length; i++) {
        if (indexOf(xs[i], '\n') >= 0) {
            return false;
        }
    }
    return true;
}

function getIndent(opts, depth) {
    var baseIndent;
    if (opts.indent === '\t') {
        baseIndent = '\t';
    } else if (typeof opts.indent === 'number' && opts.indent > 0) {
        baseIndent = $join.call(Array(opts.indent + 1), ' ');
    } else {
        return null;
    }
    return {
        base: baseIndent,
        prev: $join.call(Array(depth + 1), baseIndent)
    };
}

function indentedJoin(xs, indent) {
    if (xs.length === 0) { return ''; }
    var lineJoiner = '\n' + indent.prev + indent.base;
    return lineJoiner + $join.call(xs, ',' + lineJoiner) + '\n' + indent.prev;
}

function arrObjKeys(obj, inspect) {
    var isArr = isArray(obj);
    var xs = [];
    if (isArr) {
        xs.length = obj.length;
        for (var i = 0; i < obj.length; i++) {
            xs[i] = has(obj, i) ? inspect(obj[i], obj) : '';
        }
    }
    var syms = typeof gOPS === 'function' ? gOPS(obj) : [];
    var symMap;
    if (hasShammedSymbols) {
        symMap = {};
        for (var k = 0; k < syms.length; k++) {
            symMap['$' + syms[k]] = syms[k];
        }
    }

    for (var key in obj) { // eslint-disable-line no-restricted-syntax
        if (!has(obj, key)) { continue; } // eslint-disable-line no-restricted-syntax, no-continue
        if (isArr && String(Number(key)) === key && key < obj.length) { continue; } // eslint-disable-line no-restricted-syntax, no-continue
        if (hasShammedSymbols && symMap['$' + key] instanceof Symbol) {
            // this is to prevent shammed Symbols, which are stored as strings, from being included in the string key section
            continue; // eslint-disable-line no-restricted-syntax, no-continue
        } else if ($test.call(/[^\w$]/, key)) {
            xs.push(inspect(key, obj) + ': ' + inspect(obj[key], obj));
        } else {
            xs.push(key + ': ' + inspect(obj[key], obj));
        }
    }
    if (typeof gOPS === 'function') {
        for (var j = 0; j < syms.length; j++) {
            if (isEnumerable.call(obj, syms[j])) {
                xs.push('[' + inspect(syms[j]) + ']: ' + inspect(obj[syms[j]], obj));
            }
        }
    }
    return xs;
}


/***/ }),

/***/ 4765:
/***/ ((module) => {

"use strict";


var replace = String.prototype.replace;
var percentTwenties = /%20/g;

var Format = {
    RFC1738: 'RFC1738',
    RFC3986: 'RFC3986'
};

module.exports = {
    'default': Format.RFC3986,
    formatters: {
        RFC1738: function (value) {
            return replace.call(value, percentTwenties, '+');
        },
        RFC3986: function (value) {
            return String(value);
        }
    },
    RFC1738: Format.RFC1738,
    RFC3986: Format.RFC3986
};


/***/ }),

/***/ 5373:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var stringify = __webpack_require__(8636);
var parse = __webpack_require__(2642);
var formats = __webpack_require__(4765);

module.exports = {
    formats: formats,
    parse: parse,
    stringify: stringify
};


/***/ }),

/***/ 2642:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(7720);

var has = Object.prototype.hasOwnProperty;
var isArray = Array.isArray;

var defaults = {
    allowDots: false,
    allowEmptyArrays: false,
    allowPrototypes: false,
    allowSparse: false,
    arrayLimit: 20,
    charset: 'utf-8',
    charsetSentinel: false,
    comma: false,
    decodeDotInKeys: false,
    decoder: utils.decode,
    delimiter: '&',
    depth: 5,
    duplicates: 'combine',
    ignoreQueryPrefix: false,
    interpretNumericEntities: false,
    parameterLimit: 1000,
    parseArrays: true,
    plainObjects: false,
    strictNullHandling: false
};

var interpretNumericEntities = function (str) {
    return str.replace(/&#(\d+);/g, function ($0, numberStr) {
        return String.fromCharCode(parseInt(numberStr, 10));
    });
};

var parseArrayValue = function (val, options) {
    if (val && typeof val === 'string' && options.comma && val.indexOf(',') > -1) {
        return val.split(',');
    }

    return val;
};

// This is what browsers will submit when the ✓ character occurs in an
// application/x-www-form-urlencoded body and the encoding of the page containing
// the form is iso-8859-1, or when the submitted form has an accept-charset
// attribute of iso-8859-1. Presumably also with other charsets that do not contain
// the ✓ character, such as us-ascii.
var isoSentinel = 'utf8=%26%2310003%3B'; // encodeURIComponent('&#10003;')

// These are the percent-encoded utf-8 octets representing a checkmark, indicating that the request actually is utf-8 encoded.
var charsetSentinel = 'utf8=%E2%9C%93'; // encodeURIComponent('✓')

var parseValues = function parseQueryStringValues(str, options) {
    var obj = { __proto__: null };

    var cleanStr = options.ignoreQueryPrefix ? str.replace(/^\?/, '') : str;
    var limit = options.parameterLimit === Infinity ? undefined : options.parameterLimit;
    var parts = cleanStr.split(options.delimiter, limit);
    var skipIndex = -1; // Keep track of where the utf8 sentinel was found
    var i;

    var charset = options.charset;
    if (options.charsetSentinel) {
        for (i = 0; i < parts.length; ++i) {
            if (parts[i].indexOf('utf8=') === 0) {
                if (parts[i] === charsetSentinel) {
                    charset = 'utf-8';
                } else if (parts[i] === isoSentinel) {
                    charset = 'iso-8859-1';
                }
                skipIndex = i;
                i = parts.length; // The eslint settings do not allow break;
            }
        }
    }

    for (i = 0; i < parts.length; ++i) {
        if (i === skipIndex) {
            continue;
        }
        var part = parts[i];

        var bracketEqualsPos = part.indexOf(']=');
        var pos = bracketEqualsPos === -1 ? part.indexOf('=') : bracketEqualsPos + 1;

        var key, val;
        if (pos === -1) {
            key = options.decoder(part, defaults.decoder, charset, 'key');
            val = options.strictNullHandling ? null : '';
        } else {
            key = options.decoder(part.slice(0, pos), defaults.decoder, charset, 'key');
            val = utils.maybeMap(
                parseArrayValue(part.slice(pos + 1), options),
                function (encodedVal) {
                    return options.decoder(encodedVal, defaults.decoder, charset, 'value');
                }
            );
        }

        if (val && options.interpretNumericEntities && charset === 'iso-8859-1') {
            val = interpretNumericEntities(val);
        }

        if (part.indexOf('[]=') > -1) {
            val = isArray(val) ? [val] : val;
        }

        var existing = has.call(obj, key);
        if (existing && options.duplicates === 'combine') {
            obj[key] = utils.combine(obj[key], val);
        } else if (!existing || options.duplicates === 'last') {
            obj[key] = val;
        }
    }

    return obj;
};

var parseObject = function (chain, val, options, valuesParsed) {
    var leaf = valuesParsed ? val : parseArrayValue(val, options);

    for (var i = chain.length - 1; i >= 0; --i) {
        var obj;
        var root = chain[i];

        if (root === '[]' && options.parseArrays) {
            obj = options.allowEmptyArrays && leaf === '' ? [] : [].concat(leaf);
        } else {
            obj = options.plainObjects ? Object.create(null) : {};
            var cleanRoot = root.charAt(0) === '[' && root.charAt(root.length - 1) === ']' ? root.slice(1, -1) : root;
            var decodedRoot = options.decodeDotInKeys ? cleanRoot.replace(/%2E/g, '.') : cleanRoot;
            var index = parseInt(decodedRoot, 10);
            if (!options.parseArrays && decodedRoot === '') {
                obj = { 0: leaf };
            } else if (
                !isNaN(index)
                && root !== decodedRoot
                && String(index) === decodedRoot
                && index >= 0
                && (options.parseArrays && index <= options.arrayLimit)
            ) {
                obj = [];
                obj[index] = leaf;
            } else if (decodedRoot !== '__proto__') {
                obj[decodedRoot] = leaf;
            }
        }

        leaf = obj;
    }

    return leaf;
};

var parseKeys = function parseQueryStringKeys(givenKey, val, options, valuesParsed) {
    if (!givenKey) {
        return;
    }

    // Transform dot notation to bracket notation
    var key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, '[$1]') : givenKey;

    // The regex chunks

    var brackets = /(\[[^[\]]*])/;
    var child = /(\[[^[\]]*])/g;

    // Get the parent

    var segment = options.depth > 0 && brackets.exec(key);
    var parent = segment ? key.slice(0, segment.index) : key;

    // Stash the parent if it exists

    var keys = [];
    if (parent) {
        // If we aren't using plain objects, optionally prefix keys that would overwrite object prototype properties
        if (!options.plainObjects && has.call(Object.prototype, parent)) {
            if (!options.allowPrototypes) {
                return;
            }
        }

        keys.push(parent);
    }

    // Loop through children appending to the array until we hit depth

    var i = 0;
    while (options.depth > 0 && (segment = child.exec(key)) !== null && i < options.depth) {
        i += 1;
        if (!options.plainObjects && has.call(Object.prototype, segment[1].slice(1, -1))) {
            if (!options.allowPrototypes) {
                return;
            }
        }
        keys.push(segment[1]);
    }

    // If there's a remainder, just add whatever is left

    if (segment) {
        keys.push('[' + key.slice(segment.index) + ']');
    }

    return parseObject(keys, val, options, valuesParsed);
};

var normalizeParseOptions = function normalizeParseOptions(opts) {
    if (!opts) {
        return defaults;
    }

    if (typeof opts.allowEmptyArrays !== 'undefined' && typeof opts.allowEmptyArrays !== 'boolean') {
        throw new TypeError('`allowEmptyArrays` option can only be `true` or `false`, when provided');
    }

    if (typeof opts.decodeDotInKeys !== 'undefined' && typeof opts.decodeDotInKeys !== 'boolean') {
        throw new TypeError('`decodeDotInKeys` option can only be `true` or `false`, when provided');
    }

    if (opts.decoder !== null && typeof opts.decoder !== 'undefined' && typeof opts.decoder !== 'function') {
        throw new TypeError('Decoder has to be a function.');
    }

    if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
        throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined');
    }
    var charset = typeof opts.charset === 'undefined' ? defaults.charset : opts.charset;

    var duplicates = typeof opts.duplicates === 'undefined' ? defaults.duplicates : opts.duplicates;

    if (duplicates !== 'combine' && duplicates !== 'first' && duplicates !== 'last') {
        throw new TypeError('The duplicates option must be either combine, first, or last');
    }

    var allowDots = typeof opts.allowDots === 'undefined' ? opts.decodeDotInKeys === true ? true : defaults.allowDots : !!opts.allowDots;

    return {
        allowDots: allowDots,
        allowEmptyArrays: typeof opts.allowEmptyArrays === 'boolean' ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
        allowPrototypes: typeof opts.allowPrototypes === 'boolean' ? opts.allowPrototypes : defaults.allowPrototypes,
        allowSparse: typeof opts.allowSparse === 'boolean' ? opts.allowSparse : defaults.allowSparse,
        arrayLimit: typeof opts.arrayLimit === 'number' ? opts.arrayLimit : defaults.arrayLimit,
        charset: charset,
        charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults.charsetSentinel,
        comma: typeof opts.comma === 'boolean' ? opts.comma : defaults.comma,
        decodeDotInKeys: typeof opts.decodeDotInKeys === 'boolean' ? opts.decodeDotInKeys : defaults.decodeDotInKeys,
        decoder: typeof opts.decoder === 'function' ? opts.decoder : defaults.decoder,
        delimiter: typeof opts.delimiter === 'string' || utils.isRegExp(opts.delimiter) ? opts.delimiter : defaults.delimiter,
        // eslint-disable-next-line no-implicit-coercion, no-extra-parens
        depth: (typeof opts.depth === 'number' || opts.depth === false) ? +opts.depth : defaults.depth,
        duplicates: duplicates,
        ignoreQueryPrefix: opts.ignoreQueryPrefix === true,
        interpretNumericEntities: typeof opts.interpretNumericEntities === 'boolean' ? opts.interpretNumericEntities : defaults.interpretNumericEntities,
        parameterLimit: typeof opts.parameterLimit === 'number' ? opts.parameterLimit : defaults.parameterLimit,
        parseArrays: opts.parseArrays !== false,
        plainObjects: typeof opts.plainObjects === 'boolean' ? opts.plainObjects : defaults.plainObjects,
        strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults.strictNullHandling
    };
};

module.exports = function (str, opts) {
    var options = normalizeParseOptions(opts);

    if (str === '' || str === null || typeof str === 'undefined') {
        return options.plainObjects ? Object.create(null) : {};
    }

    var tempObj = typeof str === 'string' ? parseValues(str, options) : str;
    var obj = options.plainObjects ? Object.create(null) : {};

    // Iterate over the keys and setup the new object

    var keys = Object.keys(tempObj);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var newObj = parseKeys(key, tempObj[key], options, typeof str === 'string');
        obj = utils.merge(obj, newObj, options);
    }

    if (options.allowSparse === true) {
        return obj;
    }

    return utils.compact(obj);
};


/***/ }),

/***/ 8636:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var getSideChannel = __webpack_require__(920);
var utils = __webpack_require__(7720);
var formats = __webpack_require__(4765);
var has = Object.prototype.hasOwnProperty;

var arrayPrefixGenerators = {
    brackets: function brackets(prefix) {
        return prefix + '[]';
    },
    comma: 'comma',
    indices: function indices(prefix, key) {
        return prefix + '[' + key + ']';
    },
    repeat: function repeat(prefix) {
        return prefix;
    }
};

var isArray = Array.isArray;
var push = Array.prototype.push;
var pushToArray = function (arr, valueOrArray) {
    push.apply(arr, isArray(valueOrArray) ? valueOrArray : [valueOrArray]);
};

var toISO = Date.prototype.toISOString;

var defaultFormat = formats['default'];
var defaults = {
    addQueryPrefix: false,
    allowDots: false,
    allowEmptyArrays: false,
    arrayFormat: 'indices',
    charset: 'utf-8',
    charsetSentinel: false,
    delimiter: '&',
    encode: true,
    encodeDotInKeys: false,
    encoder: utils.encode,
    encodeValuesOnly: false,
    format: defaultFormat,
    formatter: formats.formatters[defaultFormat],
    // deprecated
    indices: false,
    serializeDate: function serializeDate(date) {
        return toISO.call(date);
    },
    skipNulls: false,
    strictNullHandling: false
};

var isNonNullishPrimitive = function isNonNullishPrimitive(v) {
    return typeof v === 'string'
        || typeof v === 'number'
        || typeof v === 'boolean'
        || typeof v === 'symbol'
        || typeof v === 'bigint';
};

var sentinel = {};

var stringify = function stringify(
    object,
    prefix,
    generateArrayPrefix,
    commaRoundTrip,
    allowEmptyArrays,
    strictNullHandling,
    skipNulls,
    encodeDotInKeys,
    encoder,
    filter,
    sort,
    allowDots,
    serializeDate,
    format,
    formatter,
    encodeValuesOnly,
    charset,
    sideChannel
) {
    var obj = object;

    var tmpSc = sideChannel;
    var step = 0;
    var findFlag = false;
    while ((tmpSc = tmpSc.get(sentinel)) !== void undefined && !findFlag) {
        // Where object last appeared in the ref tree
        var pos = tmpSc.get(object);
        step += 1;
        if (typeof pos !== 'undefined') {
            if (pos === step) {
                throw new RangeError('Cyclic object value');
            } else {
                findFlag = true; // Break while
            }
        }
        if (typeof tmpSc.get(sentinel) === 'undefined') {
            step = 0;
        }
    }

    if (typeof filter === 'function') {
        obj = filter(prefix, obj);
    } else if (obj instanceof Date) {
        obj = serializeDate(obj);
    } else if (generateArrayPrefix === 'comma' && isArray(obj)) {
        obj = utils.maybeMap(obj, function (value) {
            if (value instanceof Date) {
                return serializeDate(value);
            }
            return value;
        });
    }

    if (obj === null) {
        if (strictNullHandling) {
            return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder, charset, 'key', format) : prefix;
        }

        obj = '';
    }

    if (isNonNullishPrimitive(obj) || utils.isBuffer(obj)) {
        if (encoder) {
            var keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset, 'key', format);
            return [formatter(keyValue) + '=' + formatter(encoder(obj, defaults.encoder, charset, 'value', format))];
        }
        return [formatter(prefix) + '=' + formatter(String(obj))];
    }

    var values = [];

    if (typeof obj === 'undefined') {
        return values;
    }

    var objKeys;
    if (generateArrayPrefix === 'comma' && isArray(obj)) {
        // we need to join elements in
        if (encodeValuesOnly && encoder) {
            obj = utils.maybeMap(obj, encoder);
        }
        objKeys = [{ value: obj.length > 0 ? obj.join(',') || null : void undefined }];
    } else if (isArray(filter)) {
        objKeys = filter;
    } else {
        var keys = Object.keys(obj);
        objKeys = sort ? keys.sort(sort) : keys;
    }

    var encodedPrefix = encodeDotInKeys ? prefix.replace(/\./g, '%2E') : prefix;

    var adjustedPrefix = commaRoundTrip && isArray(obj) && obj.length === 1 ? encodedPrefix + '[]' : encodedPrefix;

    if (allowEmptyArrays && isArray(obj) && obj.length === 0) {
        return adjustedPrefix + '[]';
    }

    for (var j = 0; j < objKeys.length; ++j) {
        var key = objKeys[j];
        var value = typeof key === 'object' && typeof key.value !== 'undefined' ? key.value : obj[key];

        if (skipNulls && value === null) {
            continue;
        }

        var encodedKey = allowDots && encodeDotInKeys ? key.replace(/\./g, '%2E') : key;
        var keyPrefix = isArray(obj)
            ? typeof generateArrayPrefix === 'function' ? generateArrayPrefix(adjustedPrefix, encodedKey) : adjustedPrefix
            : adjustedPrefix + (allowDots ? '.' + encodedKey : '[' + encodedKey + ']');

        sideChannel.set(object, step);
        var valueSideChannel = getSideChannel();
        valueSideChannel.set(sentinel, sideChannel);
        pushToArray(values, stringify(
            value,
            keyPrefix,
            generateArrayPrefix,
            commaRoundTrip,
            allowEmptyArrays,
            strictNullHandling,
            skipNulls,
            encodeDotInKeys,
            generateArrayPrefix === 'comma' && encodeValuesOnly && isArray(obj) ? null : encoder,
            filter,
            sort,
            allowDots,
            serializeDate,
            format,
            formatter,
            encodeValuesOnly,
            charset,
            valueSideChannel
        ));
    }

    return values;
};

var normalizeStringifyOptions = function normalizeStringifyOptions(opts) {
    if (!opts) {
        return defaults;
    }

    if (typeof opts.allowEmptyArrays !== 'undefined' && typeof opts.allowEmptyArrays !== 'boolean') {
        throw new TypeError('`allowEmptyArrays` option can only be `true` or `false`, when provided');
    }

    if (typeof opts.encodeDotInKeys !== 'undefined' && typeof opts.encodeDotInKeys !== 'boolean') {
        throw new TypeError('`encodeDotInKeys` option can only be `true` or `false`, when provided');
    }

    if (opts.encoder !== null && typeof opts.encoder !== 'undefined' && typeof opts.encoder !== 'function') {
        throw new TypeError('Encoder has to be a function.');
    }

    var charset = opts.charset || defaults.charset;
    if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
        throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined');
    }

    var format = formats['default'];
    if (typeof opts.format !== 'undefined') {
        if (!has.call(formats.formatters, opts.format)) {
            throw new TypeError('Unknown format option provided.');
        }
        format = opts.format;
    }
    var formatter = formats.formatters[format];

    var filter = defaults.filter;
    if (typeof opts.filter === 'function' || isArray(opts.filter)) {
        filter = opts.filter;
    }

    var arrayFormat;
    if (opts.arrayFormat in arrayPrefixGenerators) {
        arrayFormat = opts.arrayFormat;
    } else if ('indices' in opts) {
        arrayFormat = opts.indices ? 'indices' : 'repeat';
    } else {
        arrayFormat = defaults.arrayFormat;
    }

    if ('commaRoundTrip' in opts && typeof opts.commaRoundTrip !== 'boolean') {
        throw new TypeError('`commaRoundTrip` must be a boolean, or absent');
    }

    var allowDots = typeof opts.allowDots === 'undefined' ? opts.encodeDotInKeys === true ? true : defaults.allowDots : !!opts.allowDots;

    return {
        addQueryPrefix: typeof opts.addQueryPrefix === 'boolean' ? opts.addQueryPrefix : defaults.addQueryPrefix,
        allowDots: allowDots,
        allowEmptyArrays: typeof opts.allowEmptyArrays === 'boolean' ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
        arrayFormat: arrayFormat,
        charset: charset,
        charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults.charsetSentinel,
        commaRoundTrip: opts.commaRoundTrip,
        delimiter: typeof opts.delimiter === 'undefined' ? defaults.delimiter : opts.delimiter,
        encode: typeof opts.encode === 'boolean' ? opts.encode : defaults.encode,
        encodeDotInKeys: typeof opts.encodeDotInKeys === 'boolean' ? opts.encodeDotInKeys : defaults.encodeDotInKeys,
        encoder: typeof opts.encoder === 'function' ? opts.encoder : defaults.encoder,
        encodeValuesOnly: typeof opts.encodeValuesOnly === 'boolean' ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
        filter: filter,
        format: format,
        formatter: formatter,
        serializeDate: typeof opts.serializeDate === 'function' ? opts.serializeDate : defaults.serializeDate,
        skipNulls: typeof opts.skipNulls === 'boolean' ? opts.skipNulls : defaults.skipNulls,
        sort: typeof opts.sort === 'function' ? opts.sort : null,
        strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults.strictNullHandling
    };
};

module.exports = function (object, opts) {
    var obj = object;
    var options = normalizeStringifyOptions(opts);

    var objKeys;
    var filter;

    if (typeof options.filter === 'function') {
        filter = options.filter;
        obj = filter('', obj);
    } else if (isArray(options.filter)) {
        filter = options.filter;
        objKeys = filter;
    }

    var keys = [];

    if (typeof obj !== 'object' || obj === null) {
        return '';
    }

    var generateArrayPrefix = arrayPrefixGenerators[options.arrayFormat];
    var commaRoundTrip = generateArrayPrefix === 'comma' && options.commaRoundTrip;

    if (!objKeys) {
        objKeys = Object.keys(obj);
    }

    if (options.sort) {
        objKeys.sort(options.sort);
    }

    var sideChannel = getSideChannel();
    for (var i = 0; i < objKeys.length; ++i) {
        var key = objKeys[i];

        if (options.skipNulls && obj[key] === null) {
            continue;
        }
        pushToArray(keys, stringify(
            obj[key],
            key,
            generateArrayPrefix,
            commaRoundTrip,
            options.allowEmptyArrays,
            options.strictNullHandling,
            options.skipNulls,
            options.encodeDotInKeys,
            options.encode ? options.encoder : null,
            options.filter,
            options.sort,
            options.allowDots,
            options.serializeDate,
            options.format,
            options.formatter,
            options.encodeValuesOnly,
            options.charset,
            sideChannel
        ));
    }

    var joined = keys.join(options.delimiter);
    var prefix = options.addQueryPrefix === true ? '?' : '';

    if (options.charsetSentinel) {
        if (options.charset === 'iso-8859-1') {
            // encodeURIComponent('&#10003;'), the "numeric entity" representation of a checkmark
            prefix += 'utf8=%26%2310003%3B&';
        } else {
            // encodeURIComponent('✓')
            prefix += 'utf8=%E2%9C%93&';
        }
    }

    return joined.length > 0 ? prefix + joined : '';
};


/***/ }),

/***/ 7720:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var formats = __webpack_require__(4765);

var has = Object.prototype.hasOwnProperty;
var isArray = Array.isArray;

var hexTable = (function () {
    var array = [];
    for (var i = 0; i < 256; ++i) {
        array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
    }

    return array;
}());

var compactQueue = function compactQueue(queue) {
    while (queue.length > 1) {
        var item = queue.pop();
        var obj = item.obj[item.prop];

        if (isArray(obj)) {
            var compacted = [];

            for (var j = 0; j < obj.length; ++j) {
                if (typeof obj[j] !== 'undefined') {
                    compacted.push(obj[j]);
                }
            }

            item.obj[item.prop] = compacted;
        }
    }
};

var arrayToObject = function arrayToObject(source, options) {
    var obj = options && options.plainObjects ? Object.create(null) : {};
    for (var i = 0; i < source.length; ++i) {
        if (typeof source[i] !== 'undefined') {
            obj[i] = source[i];
        }
    }

    return obj;
};

var merge = function merge(target, source, options) {
    /* eslint no-param-reassign: 0 */
    if (!source) {
        return target;
    }

    if (typeof source !== 'object') {
        if (isArray(target)) {
            target.push(source);
        } else if (target && typeof target === 'object') {
            if ((options && (options.plainObjects || options.allowPrototypes)) || !has.call(Object.prototype, source)) {
                target[source] = true;
            }
        } else {
            return [target, source];
        }

        return target;
    }

    if (!target || typeof target !== 'object') {
        return [target].concat(source);
    }

    var mergeTarget = target;
    if (isArray(target) && !isArray(source)) {
        mergeTarget = arrayToObject(target, options);
    }

    if (isArray(target) && isArray(source)) {
        source.forEach(function (item, i) {
            if (has.call(target, i)) {
                var targetItem = target[i];
                if (targetItem && typeof targetItem === 'object' && item && typeof item === 'object') {
                    target[i] = merge(targetItem, item, options);
                } else {
                    target.push(item);
                }
            } else {
                target[i] = item;
            }
        });
        return target;
    }

    return Object.keys(source).reduce(function (acc, key) {
        var value = source[key];

        if (has.call(acc, key)) {
            acc[key] = merge(acc[key], value, options);
        } else {
            acc[key] = value;
        }
        return acc;
    }, mergeTarget);
};

var assign = function assignSingleSource(target, source) {
    return Object.keys(source).reduce(function (acc, key) {
        acc[key] = source[key];
        return acc;
    }, target);
};

var decode = function (str, decoder, charset) {
    var strWithoutPlus = str.replace(/\+/g, ' ');
    if (charset === 'iso-8859-1') {
        // unescape never throws, no try...catch needed:
        return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
    }
    // utf-8
    try {
        return decodeURIComponent(strWithoutPlus);
    } catch (e) {
        return strWithoutPlus;
    }
};

var limit = 1024;

/* eslint operator-linebreak: [2, "before"] */

var encode = function encode(str, defaultEncoder, charset, kind, format) {
    // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
    // It has been adapted here for stricter adherence to RFC 3986
    if (str.length === 0) {
        return str;
    }

    var string = str;
    if (typeof str === 'symbol') {
        string = Symbol.prototype.toString.call(str);
    } else if (typeof str !== 'string') {
        string = String(str);
    }

    if (charset === 'iso-8859-1') {
        return escape(string).replace(/%u[0-9a-f]{4}/gi, function ($0) {
            return '%26%23' + parseInt($0.slice(2), 16) + '%3B';
        });
    }

    var out = '';
    for (var j = 0; j < string.length; j += limit) {
        var segment = string.length >= limit ? string.slice(j, j + limit) : string;
        var arr = [];

        for (var i = 0; i < segment.length; ++i) {
            var c = segment.charCodeAt(i);
            if (
                c === 0x2D // -
                || c === 0x2E // .
                || c === 0x5F // _
                || c === 0x7E // ~
                || (c >= 0x30 && c <= 0x39) // 0-9
                || (c >= 0x41 && c <= 0x5A) // a-z
                || (c >= 0x61 && c <= 0x7A) // A-Z
                || (format === formats.RFC1738 && (c === 0x28 || c === 0x29)) // ( )
            ) {
                arr[arr.length] = segment.charAt(i);
                continue;
            }

            if (c < 0x80) {
                arr[arr.length] = hexTable[c];
                continue;
            }

            if (c < 0x800) {
                arr[arr.length] = hexTable[0xC0 | (c >> 6)]
                    + hexTable[0x80 | (c & 0x3F)];
                continue;
            }

            if (c < 0xD800 || c >= 0xE000) {
                arr[arr.length] = hexTable[0xE0 | (c >> 12)]
                    + hexTable[0x80 | ((c >> 6) & 0x3F)]
                    + hexTable[0x80 | (c & 0x3F)];
                continue;
            }

            i += 1;
            c = 0x10000 + (((c & 0x3FF) << 10) | (segment.charCodeAt(i) & 0x3FF));

            arr[arr.length] = hexTable[0xF0 | (c >> 18)]
                + hexTable[0x80 | ((c >> 12) & 0x3F)]
                + hexTable[0x80 | ((c >> 6) & 0x3F)]
                + hexTable[0x80 | (c & 0x3F)];
        }

        out += arr.join('');
    }

    return out;
};

var compact = function compact(value) {
    var queue = [{ obj: { o: value }, prop: 'o' }];
    var refs = [];

    for (var i = 0; i < queue.length; ++i) {
        var item = queue[i];
        var obj = item.obj[item.prop];

        var keys = Object.keys(obj);
        for (var j = 0; j < keys.length; ++j) {
            var key = keys[j];
            var val = obj[key];
            if (typeof val === 'object' && val !== null && refs.indexOf(val) === -1) {
                queue.push({ obj: obj, prop: key });
                refs.push(val);
            }
        }
    }

    compactQueue(queue);

    return value;
};

var isRegExp = function isRegExp(obj) {
    return Object.prototype.toString.call(obj) === '[object RegExp]';
};

var isBuffer = function isBuffer(obj) {
    if (!obj || typeof obj !== 'object') {
        return false;
    }

    return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
};

var combine = function combine(a, b) {
    return [].concat(a, b);
};

var maybeMap = function maybeMap(val, fn) {
    if (isArray(val)) {
        var mapped = [];
        for (var i = 0; i < val.length; i += 1) {
            mapped.push(fn(val[i]));
        }
        return mapped;
    }
    return fn(val);
};

module.exports = {
    arrayToObject: arrayToObject,
    assign: assign,
    combine: combine,
    compact: compact,
    decode: decode,
    encode: encode,
    isBuffer: isBuffer,
    isRegExp: isRegExp,
    maybeMap: maybeMap,
    merge: merge
};


/***/ }),

/***/ 6897:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var GetIntrinsic = __webpack_require__(453);
var define = __webpack_require__(41);
var hasDescriptors = __webpack_require__(592)();
var gOPD = __webpack_require__(5795);

var $TypeError = __webpack_require__(9675);
var $floor = GetIntrinsic('%Math.floor%');

/** @type {import('.')} */
module.exports = function setFunctionLength(fn, length) {
	if (typeof fn !== 'function') {
		throw new $TypeError('`fn` is not a function');
	}
	if (typeof length !== 'number' || length < 0 || length > 0xFFFFFFFF || $floor(length) !== length) {
		throw new $TypeError('`length` must be a positive 32-bit integer');
	}

	var loose = arguments.length > 2 && !!arguments[2];

	var functionLengthIsConfigurable = true;
	var functionLengthIsWritable = true;
	if ('length' in fn && gOPD) {
		var desc = gOPD(fn, 'length');
		if (desc && !desc.configurable) {
			functionLengthIsConfigurable = false;
		}
		if (desc && !desc.writable) {
			functionLengthIsWritable = false;
		}
	}

	if (functionLengthIsConfigurable || functionLengthIsWritable || !loose) {
		if (hasDescriptors) {
			define(/** @type {Parameters<define>[0]} */ (fn), 'length', length, true, true);
		} else {
			define(/** @type {Parameters<define>[0]} */ (fn), 'length', length);
		}
	}
	return fn;
};


/***/ }),

/***/ 920:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var GetIntrinsic = __webpack_require__(453);
var callBound = __webpack_require__(8075);
var inspect = __webpack_require__(8859);

var $TypeError = __webpack_require__(9675);
var $WeakMap = GetIntrinsic('%WeakMap%', true);
var $Map = GetIntrinsic('%Map%', true);

var $weakMapGet = callBound('WeakMap.prototype.get', true);
var $weakMapSet = callBound('WeakMap.prototype.set', true);
var $weakMapHas = callBound('WeakMap.prototype.has', true);
var $mapGet = callBound('Map.prototype.get', true);
var $mapSet = callBound('Map.prototype.set', true);
var $mapHas = callBound('Map.prototype.has', true);

/*
* This function traverses the list returning the node corresponding to the given key.
*
* That node is also moved to the head of the list, so that if it's accessed again we don't need to traverse the whole list. By doing so, all the recently used nodes can be accessed relatively quickly.
*/
/** @type {import('.').listGetNode} */
var listGetNode = function (list, key) { // eslint-disable-line consistent-return
	/** @type {typeof list | NonNullable<(typeof list)['next']>} */
	var prev = list;
	/** @type {(typeof list)['next']} */
	var curr;
	for (; (curr = prev.next) !== null; prev = curr) {
		if (curr.key === key) {
			prev.next = curr.next;
			// eslint-disable-next-line no-extra-parens
			curr.next = /** @type {NonNullable<typeof list.next>} */ (list.next);
			list.next = curr; // eslint-disable-line no-param-reassign
			return curr;
		}
	}
};

/** @type {import('.').listGet} */
var listGet = function (objects, key) {
	var node = listGetNode(objects, key);
	return node && node.value;
};
/** @type {import('.').listSet} */
var listSet = function (objects, key, value) {
	var node = listGetNode(objects, key);
	if (node) {
		node.value = value;
	} else {
		// Prepend the new node to the beginning of the list
		objects.next = /** @type {import('.').ListNode<typeof value>} */ ({ // eslint-disable-line no-param-reassign, no-extra-parens
			key: key,
			next: objects.next,
			value: value
		});
	}
};
/** @type {import('.').listHas} */
var listHas = function (objects, key) {
	return !!listGetNode(objects, key);
};

/** @type {import('.')} */
module.exports = function getSideChannel() {
	/** @type {WeakMap<object, unknown>} */ var $wm;
	/** @type {Map<object, unknown>} */ var $m;
	/** @type {import('.').RootNode<unknown>} */ var $o;

	/** @type {import('.').Channel} */
	var channel = {
		assert: function (key) {
			if (!channel.has(key)) {
				throw new $TypeError('Side channel does not contain ' + inspect(key));
			}
		},
		get: function (key) { // eslint-disable-line consistent-return
			if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
				if ($wm) {
					return $weakMapGet($wm, key);
				}
			} else if ($Map) {
				if ($m) {
					return $mapGet($m, key);
				}
			} else {
				if ($o) { // eslint-disable-line no-lonely-if
					return listGet($o, key);
				}
			}
		},
		has: function (key) {
			if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
				if ($wm) {
					return $weakMapHas($wm, key);
				}
			} else if ($Map) {
				if ($m) {
					return $mapHas($m, key);
				}
			} else {
				if ($o) { // eslint-disable-line no-lonely-if
					return listHas($o, key);
				}
			}
			return false;
		},
		set: function (key, value) {
			if ($WeakMap && key && (typeof key === 'object' || typeof key === 'function')) {
				if (!$wm) {
					$wm = new $WeakMap();
				}
				$weakMapSet($wm, key, value);
			} else if ($Map) {
				if (!$m) {
					$m = new $Map();
				}
				$mapSet($m, key, value);
			} else {
				if (!$o) {
					// Initialize the linked list as an empty node, so that we don't have to special-case handling of the first node: we can always refer to it as (previous node).next, instead of something like (list).head
					$o = { key: {}, next: null };
				}
				listSet($o, key, value);
			}
		}
	};
	return channel;
};


/***/ }),

/***/ 1270:
/***/ (function(module, exports, __webpack_require__) {

/* module decorator */ module = __webpack_require__.nmd(module);
var __WEBPACK_AMD_DEFINE_RESULT__;/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports =  true && exports &&
		!exports.nodeType && exports;
	var freeModule =  true && module &&
		!module.nodeType && module;
	var freeGlobal = typeof __webpack_require__.g == 'object' && __webpack_require__.g;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		true
	) {
		!(__WEBPACK_AMD_DEFINE_RESULT__ = (function() {
			return punycode;
		}).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	} else {}

}(this));


/***/ }),

/***/ 8835:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";
/*
 * Copyright Joyent, Inc. and other Node contributors.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit
 * persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 */



var punycode = __webpack_require__(1270);

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

/*
 * define these here so at least they only have to be
 * compiled once on the first module load.
 */
var protocolPattern = /^([a-z0-9.+-]+:)/i,
  portPattern = /:[0-9]*$/,

  // Special case for a simple path URL
  simplePathPattern = /^(\/\/?(?!\/)[^?\s]*)(\?[^\s]*)?$/,

  /*
   * RFC 2396: characters reserved for delimiting URLs.
   * We actually just auto-escape these.
   */
  delims = [
    '<', '>', '"', '`', ' ', '\r', '\n', '\t'
  ],

  // RFC 2396: characters not allowed for various reasons.
  unwise = [
    '{', '}', '|', '\\', '^', '`'
  ].concat(delims),

  // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
  autoEscape = ['\''].concat(unwise),
  /*
   * Characters that are never ever allowed in a hostname.
   * Note that any invalid chars are also handled, but these
   * are the ones that are *expected* to be seen, so we fast-path
   * them.
   */
  nonHostChars = [
    '%', '/', '?', ';', '#'
  ].concat(autoEscape),
  hostEndingChars = [
    '/', '?', '#'
  ],
  hostnameMaxLen = 255,
  hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
  hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
  // protocols that can allow "unsafe" and "unwise" chars.
  unsafeProtocol = {
    javascript: true,
    'javascript:': true
  },
  // protocols that never have a hostname.
  hostlessProtocol = {
    javascript: true,
    'javascript:': true
  },
  // protocols that always contain a // bit.
  slashedProtocol = {
    http: true,
    https: true,
    ftp: true,
    gopher: true,
    file: true,
    'http:': true,
    'https:': true,
    'ftp:': true,
    'gopher:': true,
    'file:': true
  },
  querystring = __webpack_require__(5373);

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && typeof url === 'object' && url instanceof Url) { return url; }

  var u = new Url();
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function (url, parseQueryString, slashesDenoteHost) {
  if (typeof url !== 'string') {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  /*
   * Copy chrome, IE, opera backslash-handling behavior.
   * Back slashes before the query string get converted to forward slashes
   * See: https://code.google.com/p/chromium/issues/detail?id=25916
   */
  var queryIndex = url.indexOf('?'),
    splitter = queryIndex !== -1 && queryIndex < url.indexOf('#') ? '?' : '#',
    uSplit = url.split(splitter),
    slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url;

  /*
   * trim before proceeding.
   * This is to support parse stuff like "  http://foo.com  \n"
   */
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  /*
   * figure out if it's got a host
   * user@server is *always* interpreted as a hostname, and url
   * resolution will treat //foo/bar as host=foo,path=bar because that's
   * how the browser resolves relative URLs.
   */
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@/]+@[^@/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] && (slashes || (proto && !slashedProtocol[proto]))) {

    /*
     * there's a hostname.
     * the first instance of /, ?, ;, or # ends the host.
     *
     * If there is an @ in the hostname, then non-host chars *are* allowed
     * to the left of the last @ sign, unless some host-ending character
     * comes *before* the @-sign.
     * URLs are obnoxious.
     *
     * ex:
     * http://a@b@c/ => user:a@b host:c
     * http://a@b?@c => user:a host:c path:/?@c
     */

    /*
     * v0.12 TODO(isaacs): This is not quite how Chrome does things.
     * Review our test case against browsers more comprehensively.
     */

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd)) { hostEnd = hec; }
    }

    /*
     * at this point, either we have an explicit point where the
     * auth portion cannot go past, or the last @ char is the decider.
     */
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      /*
       * atSign must be in auth portion.
       * http://a@b/c@d => host:b auth:a path:/c@d
       */
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    /*
     * Now we have a portion which is definitely the auth.
     * Pull that off.
     */
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd)) { hostEnd = hec; }
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1) { hostEnd = rest.length; }

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    /*
     * we've indicated that there is a hostname,
     * so even if it's empty, it has to be present.
     */
    this.hostname = this.hostname || '';

    /*
     * if hostname begins with [ and ends with ]
     * assume that it's an IPv6 address.
     */
    var ipv6Hostname = this.hostname[0] === '[' && this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) { continue; }
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              /*
               * we replace non-ASCII char with a temporary placeholder
               * we need this to make sure size of hostname is not
               * broken by replacing non-ASCII by nothing
               */
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      /*
       * IDNA Support: Returns a punycoded representation of "domain".
       * It only converts parts of the domain name that
       * have non-ASCII characters, i.e. it doesn't matter if
       * you call it with a domain that already is ASCII-only.
       */
      this.hostname = punycode.toASCII(this.hostname);
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    /*
     * strip [ and ] from the hostname
     * the host field still retains them, though
     */
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  /*
   * now rest is set to the post-host stuff.
   * chop off any delim chars.
   */
  if (!unsafeProtocol[lowerProto]) {

    /*
     * First, make 100% sure that any "autoEscape" chars get
     * escaped, even if encodeURIComponent doesn't think they
     * need to be.
     */
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      if (rest.indexOf(ae) === -1) { continue; }
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }

  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) { this.pathname = rest; }
  if (slashedProtocol[lowerProto] && this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  // to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  /*
   * ensure it's an object, and not a string url.
   * If it's an obj, this is a no-op.
   * this way, you can call url_format() on strings
   * to clean up potentially wonky urls.
   */
  if (typeof obj === 'string') { obj = urlParse(obj); }
  if (!(obj instanceof Url)) { return Url.prototype.format.call(obj); }
  return obj.format();
}

Url.prototype.format = function () {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
    pathname = this.pathname || '',
    hash = this.hash || '',
    host = false,
    query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ? this.hostname : '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query && typeof this.query === 'object' && Object.keys(this.query).length) {
    query = querystring.stringify(this.query, {
      arrayFormat: 'repeat',
      addQueryPrefix: false
    });
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') { protocol += ':'; }

  /*
   * only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
   * unless they had them to begin with.
   */
  if (this.slashes || (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') { pathname = '/' + pathname; }
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') { hash = '#' + hash; }
  if (search && search.charAt(0) !== '?') { search = '?' + search; }

  pathname = pathname.replace(/[?#]/g, function (match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function (relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) { return relative; }
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function (relative) {
  if (typeof relative === 'string') {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

  /*
   * hash is always overridden, no matter what.
   * even href="" will remove it.
   */
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol') { result[rkey] = relative[rkey]; }
    }

    // urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] && result.hostname && !result.pathname) {
      result.pathname = '/';
      result.path = result.pathname;
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    /*
     * if it's a known url protocol, then changing
     * the protocol does weird things
     * first, if it's not file:, then we MUST have a host,
     * and if there was a path
     * to begin with, then we MUST have a path.
     * if it is file:, then the host is dropped,
     * because that's known to be hostless.
     * anything else is assumed to be absolute.
     */
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift())) { }
      if (!relative.host) { relative.host = ''; }
      if (!relative.hostname) { relative.hostname = ''; }
      if (relPath[0] !== '') { relPath.unshift(''); }
      if (relPath.length < 2) { relPath.unshift(''); }
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = result.pathname && result.pathname.charAt(0) === '/',
    isRelAbs = relative.host || relative.pathname && relative.pathname.charAt(0) === '/',
    mustEndAbs = isRelAbs || isSourceAbs || (result.host && relative.pathname),
    removeAllDots = mustEndAbs,
    srcPath = result.pathname && result.pathname.split('/') || [],
    relPath = relative.pathname && relative.pathname.split('/') || [],
    psychotic = result.protocol && !slashedProtocol[result.protocol];

  /*
   * if the url is a non-slashed url, then relative
   * links like ../.. should be able
   * to crawl up to the hostname, as well.  This is strange.
   * result.protocol has already been set by now.
   * Later on, put the first path part into the host field.
   */
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') { srcPath[0] = result.host; } else { srcPath.unshift(result.host); }
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') { relPath[0] = relative.host; } else { relPath.unshift(relative.host); }
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = relative.host || relative.host === '' ? relative.host : result.host;
    result.hostname = relative.hostname || relative.hostname === '' ? relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    /*
     * it's relative
     * throw away the existing file, and take the new path instead.
     */
    if (!srcPath) { srcPath = []; }
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (relative.search != null) {
    /*
     * just pull out the search.
     * like href='?foo'.
     * Put this after the other two cases because it simplifies the booleans
     */
    if (psychotic) {
      result.host = srcPath.shift();
      result.hostname = result.host;
      /*
       * occationaly the auth can get stuck only in host
       * this especially happens in cases like
       * url.resolveObject('mailto:local1@domain1', 'local2@domain2')
       */
      var authInHost = result.host && result.host.indexOf('@') > 0 ? result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.hostname = authInHost.shift();
        result.host = result.hostname;
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    // to support http.request
    if (result.pathname !== null || result.search !== null) {
      result.path = (result.pathname ? result.pathname : '') + (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    /*
     * no path at all.  easy.
     * we've already handled the other stuff above.
     */
    result.pathname = null;
    // to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  /*
   * if a url ENDs in . or .., then it must get a trailing slash.
   * however, if it ends in anything else non-slashy,
   * then it must NOT get a trailing slash.
   */
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (result.host || relative.host || srcPath.length > 1) && (last === '.' || last === '..') || last === '';

  /*
   * strip single dots, resolve double dots to parent dir
   * if the path tries to go above the root, `up` ends up > 0
   */
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' && (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' || (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = isAbsolute ? '' : srcPath.length ? srcPath.shift() : '';
    result.host = result.hostname;
    /*
     * occationaly the auth can get stuck only in host
     * this especially happens in cases like
     * url.resolveObject('mailto:local1@domain1', 'local2@domain2')
     */
    var authInHost = result.host && result.host.indexOf('@') > 0 ? result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.hostname = authInHost.shift();
      result.host = result.hostname;
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (srcPath.length > 0) {
    result.pathname = srcPath.join('/');
  } else {
    result.pathname = null;
    result.path = null;
  }

  // to support request.http
  if (result.pathname !== null || result.search !== null) {
    result.path = (result.pathname ? result.pathname : '') + (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function () {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) { this.hostname = host; }
};

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;


/***/ }),

/***/ 6675:
/***/ ((module) => {

function countSubstring(string, substring) {
  const pattern = new RegExp(substring, "g");
  const match = string.match(pattern);
  return match ? match.length : 0;
}

module.exports = countSubstring;
module.exports["default"] = countSubstring;


/***/ }),

/***/ 8556:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const indexOfMatch = __webpack_require__(3614);
const indexOfMatchEnd = __webpack_require__(8694);
const countSubstring = __webpack_require__(6675);

function findTagByName(xml, tagName, options) {
  const debug = (options && options.debug) || false;
  const nested = !(options && typeof options.nested === false);

  const startIndex = (options && options.startIndex) || 0;

  if (debug) console.log("[xml-utils] starting findTagByName with", tagName, " and ", options);

  const start = indexOfMatch(xml, `\<${tagName}[ \n\>\/]`, startIndex);
  if (debug) console.log("[xml-utils] start:", start);
  if (start === -1) return undefined;

  const afterStart = xml.slice(start + tagName.length);

  let relativeEnd = indexOfMatchEnd(afterStart, "^[^<]*[ /]>", 0);

  const selfClosing = relativeEnd !== -1 && afterStart[relativeEnd - 1] === "/";
  if (debug) console.log("[xml-utils] selfClosing:", selfClosing);

  if (selfClosing === false) {
    // check if tag has subtags with the same name
    if (nested) {
      let startIndex = 0;
      let openings = 1;
      let closings = 0;
      while ((relativeEnd = indexOfMatchEnd(afterStart, "[ /]" + tagName + ">", startIndex)) !== -1) {
        const clip = afterStart.substring(startIndex, relativeEnd + 1);
        openings += countSubstring(clip, "<" + tagName + "[ \n\t>]");
        closings += countSubstring(clip, "</" + tagName + ">");
        // we can't have more openings than closings
        if (closings >= openings) break;
        startIndex = relativeEnd;
      }
    } else {
      relativeEnd = indexOfMatchEnd(afterStart, "[ /]" + tagName + ">", 0);
    }
  }

  const end = start + tagName.length + relativeEnd + 1;
  if (debug) console.log("[xml-utils] end:", end);
  if (end === -1) return undefined;

  const outer = xml.slice(start, end);
  // tag is like <gml:identifier codeSpace="OGP">urn:ogc:def:crs:EPSG::32617</gml:identifier>

  let inner;
  if (selfClosing) {
    inner = null;
  } else {
    inner = outer.slice(outer.indexOf(">") + 1, outer.lastIndexOf("<"));
  }

  return { inner, outer, start, end };
}

module.exports = findTagByName;
module.exports["default"] = findTagByName;


/***/ }),

/***/ 563:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const findTagByName = __webpack_require__(8556);

function findTagsByName(xml, tagName, options) {
  const tags = [];
  const debug = (options && options.debug) || false;
  const nested = options && typeof options.nested === "boolean" ? options.nested : true;
  let startIndex = (options && options.startIndex) || 0;
  let tag;
  while ((tag = findTagByName(xml, tagName, { debug, startIndex }))) {
    if (nested) {
      startIndex = tag.start + 1 + tagName.length;
    } else {
      startIndex = tag.end;
    }
    tags.push(tag);
  }
  if (debug) console.log("findTagsByName found", tags.length, "tags");
  return tags;
}

module.exports = findTagsByName;
module.exports["default"] = findTagsByName;


/***/ }),

/***/ 7379:
/***/ ((module) => {

function getAttribute(tag, attributeName, options) {
  const debug = (options && options.debug) || false;
  if (debug) console.log("[xml-utils] getting " + attributeName + " in " + tag);

  const xml = typeof tag === "object" ? tag.outer : tag;

  // only search for attributes in the opening tag
  const opening = xml.slice(0, xml.indexOf(">") + 1);

  const quotechars = ['"', "'"];
  for (let i = 0; i < quotechars.length; i++) {
    const char = quotechars[i];
    const pattern = attributeName + "\\=" + char + "([^" + char + "]*)" + char;
    if (debug) console.log("[xml-utils] pattern:", pattern);

    const re = new RegExp(pattern);
    const match = re.exec(opening);
    if (debug) console.log("[xml-utils] match:", match);
    if (match) return match[1];
  }
}

module.exports = getAttribute;
module.exports["default"] = getAttribute;


/***/ }),

/***/ 8694:
/***/ ((module) => {

function indexOfMatchEnd(xml, pattern, startIndex) {
  const re = new RegExp(pattern);
  const match = re.exec(xml.slice(startIndex));
  if (match) return startIndex + match.index + match[0].length - 1;
  else return -1;
}

module.exports = indexOfMatchEnd;
module.exports["default"] = indexOfMatchEnd;


/***/ }),

/***/ 3614:
/***/ ((module) => {

function indexOfMatch(xml, pattern, startIndex) {
  const re = new RegExp(pattern);
  const match = re.exec(xml.slice(startIndex));
  if (match) return startIndex + match.index;
  else return -1;
}

module.exports = indexOfMatch;
module.exports["default"] = indexOfMatch;


/***/ }),

/***/ 1353:
/***/ ((module, exports, __webpack_require__) => {

var __WEBPACK_AMD_DEFINE_RESULT__;var d=Object.defineProperty;var f=Object.getOwnPropertySymbols;var b=Object.prototype.hasOwnProperty,g=Object.prototype.propertyIsEnumerable;var p=(e,o,c)=>o in e?d(e,o,{enumerable:!0,configurable:!0,writable:!0,value:c}):e[o]=c,w=(e,o)=>{for(var c in o||(o={}))b.call(o,c)&&p(e,c,o[c]);if(f)for(var c of f(o))g.call(o,c)&&p(e,c,o[c]);return e};var m=(e,o)=>d(e,"name",{value:o,configurable:!0});var S=(e,o)=>{var c={};for(var n in e)b.call(e,n)&&o.indexOf(n)<0&&(c[n]=e[n]);if(e!=null&&f)for(var n of f(e))o.indexOf(n)<0&&g.call(e,n)&&(c[n]=e[n]);return c};const calcStats=__webpack_require__(6534),guessImageLayout=__webpack_require__(860),xdim=__webpack_require__(4307),range=m(e=>new Array(e).fill(0).map((o,c)=>c),"range");function calcImageStats(e,k={}){var i=k,{bands:o,height:c,precise:n=!1,stats:j,width:r,layout:t}=i,q=S(i,["bands","height","precise","stats","width","layout"]);if(typeof e.then=="function")throw new Error("[calc-image-stats] you passed in a promise as the data values.  please resolve the promise first before calling calcImageStats");const s=guessImageLayout({bands:o,data:e,height:c,layout:t,width:r});o!=null||(o=s.bands),c!=null||(c=s.height),t!=null||(t=s.layout),r!=null||(r=s.width);const I=range(o).map(l=>{let a;const u=w({precise:n,stats:j},q);if(["[band][row,column]","[band][column,row]"].includes(t))a=e[l];else if(["[band][row][column]","[band][column][row]"].includes(t))a=e[l],u.chunked=!0;else if(o===1&&["[band,row,column]","[row,column,band]","[column,band,row]","[column,row,band]"].includes(t))a=e;else{const x={band:[l,l]},R={band:o,column:r,row:c};a=xdim.iterClip({data:e,layout:t,rect:x,sizes:R})}return calcStats(a,u)});return{depth:o,height:c,width:r,bands:I}}m(calcImageStats,"calcImageStats"), true&&!(__WEBPACK_AMD_DEFINE_RESULT__ = (function(){return calcImageStats}).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__)), true&&(module.exports=calcImageStats,module.exports["default"]=calcImageStats,module.exports.calcImageStats=calcImageStats),typeof self=="object"&&(self.calcImageStats=calcImageStats),typeof window=="object"&&(self.calcImageStats=calcImageStats);
//# sourceMappingURL=calc-image-stats.min.js.map


/***/ }),

/***/ 6534:
/***/ ((module, exports, __webpack_require__) => {

var __WEBPACK_AMD_DEFINE_RESULT__;const { getOrCreateIterator } = __webpack_require__(8060);
const { add, compare, divide, mean, multiply, pow, round, sort, subtract, sum } = __webpack_require__(7422);
const mediana = __webpack_require__(2422);

// n === n is a lot quicker than !isNaN(n)
const isValidNumber = n => typeof n === "number" && n === n;

const computeVariance = ({ count, histogram, mean_value, precise = false }) => {
  if (precise) {
    mean_value = mean_value.toString();
    const reduced = Object.values(histogram).reduce((sum, { n, ct }) => {
      const diff = subtract(n.toString(), mean_value);
      return add(sum, multiply(ct.toString(), pow(diff, "2")));
    }, "0");
    return divide(reduced, count.toString());
  } else {
    return (
      Object.values(histogram).reduce((sum, { n, ct }) => {
        return sum + ct * Math.pow(n - mean_value, 2);
      }, 0) / count
    );
  }
};

function calcStats(
  data,
  {
    async = false,
    chunked = false,
    noData = undefined,
    filter = undefined,
    map,
    calcCount = true,
    calcFrequency = true,
    calcHistogram = true,
    calcInvalid = true,
    calcMax = true,
    calcMean = true,
    calcMedian = true,
    calcMin = true,
    calcMode = true,
    calcModes = true,
    calcProduct = true,
    calcRange = true,
    calcStd = true,
    calcSum = true,
    calcValid = true,
    calcVariance = true,
    calcUniques = true,
    precise = false,
    precise_max_decimal_digits = 100,
    stats,
    timed = false
  } = { debugLevel: 0 }
) {
  const start = timed ? performance.now() : 0;

  if (stats) {
    // validate stats argument
    stats.forEach(stat => {
      if (
        ![
          "count",
          "frequency",
          "histogram",
          "invalid",
          "max",
          "mean",
          "median",
          "min",
          "mode",
          "modes",
          "product",
          "range",
          "sum",
          "std",
          "valid",
          "variance",
          "uniques"
        ].includes(stat)
      ) {
        console.warn(`[calc-stats] skipping unknown stat "${stat}"`);
      }
    });
    calcCount = stats.includes("count");
    calcFrequency = stats.includes("frequency");
    calcHistogram = stats.includes("histogram");
    calcInvalid = stats.includes("invalid");
    calcMax = stats.includes("max");
    calcMean = stats.includes("mean");
    calcMedian = stats.includes("median");
    calcMin = stats.includes("min");
    calcMode = stats.includes("mode");
    calcModes = stats.includes("modes");
    calcProduct = stats.includes("product");
    calcRange = stats.includes("range");
    calcStd = stats.includes("std");
    calcSum = stats.includes("sum");
    calcValid = stats.includes("valid");
    calcVariance = stats.includes("variance");
    calcUniques = stats.includes("uniques");
  }

  if (typeof map === "string") {
    const key = map;
    map = it => it[key];
  }

  const iter = getOrCreateIterator(data);

  let needHistogram =
    calcFrequency || calcHistogram || calcMedian || calcMode || calcModes || calcVariance || calcStd || calcUniques;
  let needValid =
    calcCount ||
    calcFrequency ||
    calcMean ||
    calcMedian ||
    calcProduct ||
    calcValid ||
    calcVariance ||
    calcStd ||
    typeof filter === "function";
  let needInvalid = calcCount || calcInvalid || typeof filter === "function";
  let needSum = calcSum || calcMean || calcVariance || calcStd;
  let needMin = calcMin || calcRange;
  let needMax = calcMax || calcRange;
  let needProduct = calcProduct;
  let valid = 0;
  let invalid = 0;
  let index = 0;
  let min;
  let max;
  let product;
  let sum = precise ? "0" : 0;
  const histogram = {};

  // after it processes filtering
  let process;

  // hoisting functions outside of conditionals
  // in order to help compilers optimize
  const initial_process = value => {
    if (needValid) valid = 1;
    if (needMin) min = value;
    if (needMax) max = value;
    if (needProduct) product = value;
    if (needSum) sum = value;
    if (needHistogram) {
      histogram[value] = { n: value, ct: 1 };
    }
    process = subsequent_process;
  };

  const subsequent_process = value => {
    if (needValid) valid++;
    if (needMin && value < min) min = value;
    if (needMax && value > max) max = value;
    if (needProduct) product *= value;
    if (needSum) sum += value;
    if (needHistogram) {
      if (value in histogram) histogram[value].ct++;
      else histogram[value] = { n: value, ct: 1 };
    }
  };

  if (precise) {
    process = value => {
      value = value.toString();
      if (needValid) valid++;
      if (needMin && (typeof min === "undefined" || compare(value, min) === "<")) min = value;
      if (needMax && (typeof max === "undefined" || compare(value, max) === ">")) max = value;
      if (needProduct) {
        product = valid === 1 ? value : multiply(product, value, { max_decimal_digits: precise_max_decimal_digits });
      }
      if (needSum) sum = add(sum, value);
      if (needHistogram) {
        if (value in histogram) histogram[value].ct++;
        else histogram[value] = { n: value.toString(), ct: 1 };
      }
    };
  } else {
    process = initial_process;
  }

  let step;
  if (typeof noData === "number" && typeof filter === "function") {
    step = value => {
      index++;
      if (isValidNumber(value) && value !== noData && filter({ valid, index, value }) === true) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  } else if (typeof noData === "number") {
    step = value => {
      if (isValidNumber(value) && value !== noData) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  } else if (Array.isArray(noData) && noData.length > 0 && typeof filter === "function") {
    step = value => {
      index++;
      if (isValidNumber(value) && !noData.includes(value) && filter({ valid, index, value }) === true) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  } else if (Array.isArray(noData) && noData.length > 0) {
    step = value => {
      if (isValidNumber(value) && !noData.includes(value)) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  } else if (typeof filter === "function") {
    step = value => {
      index++;
      if (isValidNumber(value) && filter({ valid, index, value }) === true) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  } else {
    step = value => {
      if (isValidNumber(value)) {
        process(value);
      } else if (needInvalid) {
        invalid++;
      }
    };
  }

  const finish = () => {
    const results = {};
    if (calcCount) results.count = precise ? add(invalid.toString(), valid.toString()) : invalid + valid;
    if (calcValid) results.valid = precise ? valid.toString() : valid;
    if (calcInvalid) results.invalid = precise ? invalid.toString() : invalid;
    if (calcMedian) {
      results.median = mediana.calculate({ counts: histogram, precise, total: valid });
    }
    if (calcMin) results.min = min; // should already be a string if precise
    if (calcMax) results.max = max; // should already be a string if precise
    if (calcProduct) results.product = product; // should already be a string if precise
    if (calcSum) results.sum = sum; // should already be a string if precise
    if (calcRange) results.range = precise ? subtract(max.toString(), min.toString()) : max - min;
    if (calcMean || calcVariance || calcStd) {
      const mean_value = precise
        ? divide(sum, valid.toString(), { max_decimal_digits: precise_max_decimal_digits })
        : sum / valid;
      if (calcMean) results.mean = mean_value;
      if (calcVariance || calcStd) {
        let variance = computeVariance({
          count: valid,
          histogram,
          // want enough precision, so we can get a good standard deviation later
          max_decimal_digits:
            typeof precise_max_decimal_digits === "number" && precise_max_decimal_digits < 20
              ? 20
              : precise_max_decimal_digits,
          mean_value,
          precise
        });
        if (calcVariance) {
          results.variance =
            precise && typeof precise_max_decimal_digits === "number"
              ? round(variance, { digits: precise_max_decimal_digits })
              : variance;
        }
        if (calcStd) results.std = precise ? Math.sqrt(Number(variance)).toString() : Math.sqrt(variance);
      }
    }
    if (calcHistogram) {
      if (precise) {
        Object.values(histogram).forEach(obj => {
          obj.ct = obj.ct.toString();
        });
      }
      results.histogram = histogram;
    }
    if (calcFrequency) {
      const frequency = {};
      if (precise) {
        const valid_as_string = valid.toString();
        for (let key in histogram) {
          const obj = histogram[key];
          frequency[key] = {
            n: obj.n.toString(),
            freq: divide(obj.ct, valid_as_string, { max_decimal_digits: precise_max_decimal_digits })
          };
        }
      } else {
        for (let key in histogram) {
          const obj = histogram[key];
          frequency[key] = {
            n: obj.n,
            freq: obj.ct / valid
          };
        }
      }
      results.frequency = frequency;
    }
    if (calcMode || calcModes) {
      let highest_count = 0;
      let modes = [];
      for (let key in histogram) {
        const { n, ct } = histogram[key];
        if (ct === highest_count) {
          modes.push(precise ? n.toString() : n);
        } else if (ct > highest_count) {
          highest_count = ct;
          modes = [precise ? n.toString() : n];
        }
      }

      if (calcModes) results.modes = modes;

      // compute mean value of all the most popular numbers
      if (calcMode) {
        results.mode = precise ? mean(modes) : modes.reduce((acc, n) => acc + n, 0) / modes.length;
      }
    }
    if (calcUniques) {
      if (precise) {
        results.uniques = sort(Object.keys(histogram));
      } else {
        results.uniques = Object.values(histogram)
          .map(({ n }) => n)
          .sort((a, b) => a - b);
      }
    }
    if (timed) {
      const duration = Math.round(performance.now() - start);
      if (duration > 2000) {
        console.log("[calc-stats] took " + Math.round(duration / 1000).toLocaleString() + " seconds");
      } else {
        console.log("[calc-stats] took " + duration.toLocaleString() + " milliseconds");
      }
    }
    return results;
  };

  if (chunked) {
    if (async) {
      return (async () => {
        for await (let value of iter) {
          for (let v of value) {
            if (map) v = map(v);
            step(v);
          }
        }
        return finish();
      })();
    } else {
      // array of arrays or array of typed arrays
      if (Array.isArray(data) && data[0].length) {
        for (let i = 0; i < data.length; i++) {
          const value = data[i];
          for (let ii = 0; ii < value.length; ii++) {
            let v = value[ii];
            if (map) v = map(v);
            step(v);
          }
        }
      } else {
        for (let value of iter) {
          for (let v of value) {
            if (map) v = map(v);
            step(v);
          }
        }
      }
      return finish();
    }
  } else {
    if (async) {
      return (async () => {
        for await (let value of iter) {
          if (map) value = map(value);
          step(value);
        }
        return finish();
      })();
    } else {
      for (let value of iter) {
        if (map) value = map(value);
        step(value);
      }
      return finish();
    }
  }
}

if (true) {
  !(__WEBPACK_AMD_DEFINE_RESULT__ = (function () {
    return calcStats;
  }).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
}

if (true) {
  module.exports = calcStats;
  module.exports["default"] = calcStats;
  module.exports.calcStats = calcStats;
}

if (typeof self === "object") {
  self.calcStats = calcStats;
}

if (typeof window === "object") {
  window.calcStats = calcStats;
}


/***/ }),

/***/ 8286:
/***/ ((module) => {

const getPalette = (image, { debug = false } = { debug: false }) => {
    if (debug) console.log("starting getPalette with image", image);
    const { fileDirectory } = image;
    const {
        BitsPerSample,
        ColorMap,
        ImageLength,
        ImageWidth,
        PhotometricInterpretation,
        SampleFormat,
        SamplesPerPixel
    } = fileDirectory;

    if (!ColorMap) {
        throw new Error("[geotiff-palette]: the image does not contain a color map, so we can't make a palette.");
    }

    const count = Math.pow(2, BitsPerSample);
    if (debug) console.log("[geotiff-palette]: count:", count);

    const bandSize = ColorMap.length / 3;
    if (debug) console.log("[geotiff-palette]: bandSize:", bandSize);

    if (bandSize !== count) {
        throw new Error("[geotiff-palette]: can't handle situations where the color map has more or less values than the number of possible values in a raster");
    }

    const greenOffset = bandSize;
    const redOffset = greenOffset + bandSize;

    const result = [];
    for (let i = 0; i < count; i++) {
        // colorMap[mapIndex] / 65536 * 256 equals colorMap[mapIndex] / 256
        // because (1 / 2^16) * (2^8) equals 1 / 2^8
        result.push([
            Math.floor(ColorMap[i] / 256), // red
            Math.floor(ColorMap[greenOffset + i] / 256), // green
            Math.floor(ColorMap[redOffset + i] / 256), // blue
            255 // alpha value is always 255
        ]);
    }
    if (debug) console.log("[geotiff-palette]: result is ", result);
    return result;
}

module.exports = { getPalette };


/***/ }),

/***/ 4078:
/***/ ((module) => {

module.exports = function getDepth(arr) {
  const isArray = (arr) =>
    Array.isArray(arr) ||
    arr instanceof Int8Array ||
    arr instanceof Uint8Array ||
    arr instanceof Uint8ClampedArray ||
    arr instanceof Int16Array ||
    arr instanceof Uint16Array ||
    arr instanceof Int32Array ||
    arr instanceof Uint32Array ||
    arr instanceof Float32Array ||
    arr instanceof Float64Array ||
    arr instanceof BigInt64Array ||
    arr instanceof BigUint64Array;

  let depth = 0;
  let part = arr;
  while (isArray(part)) {
    depth++;
    part = part[0];
  }
  return depth;
};


/***/ }),

/***/ 860:
/***/ ((module, exports, __webpack_require__) => {

var __WEBPACK_AMD_DEFINE_RESULT__;const getDepth = __webpack_require__(4078);

function guessImageLayout({ bands, data, height, layout, width }) {
  const depth = getDepth(data);
  if (layout === "[row,column,band]" || depth === 1) {
    // guess interleaved rgba ImageData.data
    return {
      layout: "[row,column,band]",
      bands: bands ? bands : height && width ? data.length / (height * width) : undefined,
      height: height ? height : bands && width ? data.length / (bands * width) : undefined,
      width: width ? width : bands && height ? data.length / (bands * height) : undefined
    };
  } else if (depth === 2) {
    if (height && width) {
      if (data[0].length === height * width) {
        return { layout: "[band][row,column]", bands: data.length, height, width };
      } else if (data.length === height * width) {
        return { layout: "[row,column][band]", bands: data[0].length, height, width };
      }
    } else {
      // assume have more grid cells than bands
      if (data.length < data[0].length) {
        return {
          bands: data.length,
          layout: "[band][row,column]",
          height: height ? height : width ? data[0].length / width : undefined,
          width: width ? width : height ? data[0].length / height : undefined
        };
      } else {
        return {
          bands: data[0].length,
          layout: "[row,column][band]",
          height: height ? height : width ? data.length / width : undefined,
          width: width ? width : height ? data.length / height : undefined
        };
      }
    }
  } else if (depth === 3) {
    const len1 = data.length;
    const len2 = data[0].length;
    const len3 = data[0][0].length;
    if (height && width) {
      if (len1 === height && len2 === width) {
        return { layout: "[row][column][band]", bands: len3, height, width };
      } else if (len2 === height && len3 === width) {
        return { layout: "[band][row][column]", bands: len1, height, width };
      }
    } else {
      // assume band count is smaller than height and width
      if (len1 < len2 && len1 < len3) {
        return { layout: "[band][row][column]", bands: len1, height: len2, width: len3 };
      } else if (len3 < len1 && len3 < len2) {
        return { layout: "[row][column][band]", bands: len3, height: len1, width: len2 };
      }
    }
  }
}

if (true) {
  !(__WEBPACK_AMD_DEFINE_RESULT__ = (function () {
    return guessImageLayout;
  }).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
}

if (true) {
  module.exports = guessImageLayout;
  module.exports["default"] = guessImageLayout;
  module.exports.guessImageLayout = guessImageLayout;
}

if (typeof window === "object") {
  window.guessImageLayout = guessImageLayout;
}

if (typeof self === "object") {
  self.guessImageLayout = guessImageLayout;
}


/***/ }),

/***/ 8060:
/***/ ((module) => {

function addSymbolIterator(obj) {
  try {
    obj[Symbol.iterator] = function () {
      return this;
    };
  } catch (error) {
    // pass
  }
}

function addSymbolIteratorFallback(obj) {
  obj["@@iterator"] = function () {
    return this;
  };
}

function wrapNextFunction(next) {
  const iter = { next };
  addSymbolIterator(iter);
  addSymbolIteratorFallback(iter);
  return iter;
}

function isArray(data) {
  try {
    return data.constructor.name.endsWith("Array");
  } catch {
    return false;
  }
}

function hasNext(data) {
  try {
    return typeof data.next === "function";
  } catch {
    return false;
  }
}

function hasIterator(data) {
  try {
    return "@@iterator" in data;
  } catch {
    return false;
  }
}

function hasSymbolIterator(data) {
  try {
    return Symbol.iterator in data.constructor.prototype;
  } catch {
    return false;
  }
}

function isIterator(data) {
  try {
    return (
      Symbol.iterator in data &&
      typeof data.next === "function" &&
      data.propertyIsEnumerable("next") === false
    );
  } catch {
    return false;
  }
}

function getIterator(data) {
  const iter = data["@@iterator"];
  if (hasNext(iter)) {
    return iter;
  } else if (typeof iter === "function") {
    return iter();
  }
}

function createIterator(data) {
  let i = 0;
  let len = data.length;
  const next = () =>
    i++ < len ? { value: data[i], done: false } : { done: true };
  return wrapNextFunction(next);
}

function getOrCreateIterator(data) {
  if (isIterator(data)) {
    return data;
  } else if (hasSymbolIterator(data)) {
    return data[Symbol.iterator]();
  } else if (hasNext(data)) {
    return wrapNextFunction(data.next);
  } else if (hasIterator(data)) {
    return getIterator(data);
  } else if (typeof data === "string" || isArray(data)) {
    return createIterator(data);
  } else {
    throw "[iter-fun] unable to determine iterator";
  }
}

function zip(iters) {
  // convert input to iters just in case
  iters = iters.map(getOrCreateIterator);

  return wrapNextFunction(function next() {
    const values = iters.map(iter => iter.next());
    // if they are all done, stop
    if (values.every(({ done }) => done)) {
      return { done: true };
    } else {
      return {
        done: false,
        value: values.map(({ value }) => value)
      };
    }
  });
}

if (true) {
  module.exports = {
    addSymbolIterator,
    addSymbolIteratorFallback,
    isIterator,
    isArray,
    hasNext,
    hasSymbolIterator,
    hasIterator,
    getIterator,
    createIterator,
    getOrCreateIterator,
    wrapNextFunction,
    zip
  };
}


/***/ }),

/***/ 4725:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const clean = __webpack_require__(7811);

function absolute(n) {
  n = clean(n);
  if (n[0] === "-") return n.substring(1);
  else return n;
}

module.exports = absolute;
module.exports["default"] = absolute;


/***/ }),

/***/ 9197:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const compare_positive = __webpack_require__(7363);
const clean = __webpack_require__(7811);
const long_addition = __webpack_require__(1149);
const long_subtraction = __webpack_require__(4095);

function add(a, b) {
  a = clean(a);
  b = clean(b);

  const apos = a[0] !== "-";
  const bpos = b[0] !== "-";

  if (apos && bpos) {
    return long_addition(a, b);
  } else if (!apos && !bpos) {
    return "-" + long_addition(a.substring(1), b.substring(1));
  } else if (!apos && bpos) {
    a = a.substring(1);
    switch (compare_positive(a, b)) {
      case "=":
        return "0";
      case "<":
        return long_subtraction(b, a);
      case ">":
        return "-" + long_subtraction(a, b);
    }
  } else if (apos && !bpos) {
    b = b.substring(1);
    switch (compare_positive(a, b)) {
      case "=":
        return "0";
      case "<":
        return "-" + long_subtraction(b, a);
      case ">":
        return long_subtraction(a, b);
    }
  }
}

module.exports = add;
module.exports["default"] = add;


/***/ }),

/***/ 7811:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const expand = __webpack_require__(6940);

module.exports = function clean(n) {
  // remove + from beginning
  if (n[0] === "+") n = n.substring(1);

  n = expand(n);

  // remove extra zero in front
  // 03938.123 => 3938.123
  n = n.replace(/^0+(?=\d)/, "");

  // remove extra zero at end
  if (n.includes(".")) n = n.replace(/\.?0+$/, "");

  // should improve this, so it identifies zero earlier
  if (n === "") n = "0";

  return n;
};


/***/ }),

/***/ 7363:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const clean = __webpack_require__(7811);

// given:
//  - a and b are positive numbers
//  - a and b have been cleaned (i.e. no + or leading zeros)
function compare_positive(a, b) {
  const alen = a.length;
  const blen = b.length;

  const aidx = a.indexOf(".");
  const bidx = b.indexOf(".");

  // basically where would the dot be
  // if we add a dot at the end of integers
  // like 123.
  const a_adjusted_dot_index = aidx === -1 ? alen : aidx;
  const b_adjusted_dot_index = bidx === -1 ? blen : bidx;

  // how much you need to shift the second number
  // to line up the decimal with the first
  //        0.12345
  //    12345.0

  const offset = a_adjusted_dot_index - b_adjusted_dot_index;

  let left = Math.max(a_adjusted_dot_index, b_adjusted_dot_index);

  let right = Math.max(alen - a_adjusted_dot_index, blen - b_adjusted_dot_index);

  let aoffset = offset < 0 ? -1 * offset : 0;
  let boffset = offset <= 0 ? 0 : offset;

  let imax = left + 1 + right - 1; // -1 for zero-index

  let i = 0;
  while (i < imax) {
    const ai = i - aoffset;
    const achar = ai === a_adjusted_dot_index ? "." : a[ai] || "0";
    const bi = i - boffset;
    const bchar = bi === b_adjusted_dot_index ? "." : b[bi] || "0";
    if (achar !== bchar) {
      if (achar > bchar) return ">";
      else if (achar < bchar) return "<";
    }
    i++;
  }

  return "=";
}

module.exports = compare_positive;
module.exports["default"] = compare_positive;


/***/ }),

/***/ 7055:
/***/ ((module) => {

// Internet Explorer doesn't support Number.MAX_SAFE_INTEGER
// so we just define the constant ourselves
const MAX_SAFE_INTEGER = 9007199254740991;

// the greatest number of digits an integer can have
// and be guaranteed to be stored safely as a floating point.
// subtract 1 because MAX_SAFE_INTEGER isn't all 9's
const MAX_SAFE_INTEGER_LENGTH = MAX_SAFE_INTEGER.toString().length - 1;

module.exports = {
  MAX_SAFE_INTEGER,
  MAX_SAFE_INTEGER_LENGTH
};


/***/ }),

/***/ 2729:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const absolute = __webpack_require__(4725);
const clean = __webpack_require__(7811);
const long_division = __webpack_require__(118);

function divide(dividend, divisor, options) {
  dividend = clean(dividend);
  divisor = clean(divisor);

  if (divisor === "0") throw new Error("[preciso] division by zero");

  // sometimes dividend can be cleaned to ""
  if (dividend === "" || dividend === "0") return "0";

  const dividend_is_positive = dividend[0] !== "-";
  const divisor_is_positive = divisor[0] !== "-";

  const out_sign = dividend_is_positive !== divisor_is_positive ? "-" : "";

  if (!dividend_is_positive) dividend = absolute(dividend);
  if (!divisor_is_positive) divisor = absolute(divisor);

  return out_sign + long_division(dividend, divisor, options);
}

module.exports = divide;
module.exports["default"] = divide;


/***/ }),

/***/ 6940:
/***/ ((module) => {

// convert exponential notation to normal string
// not optimized yet and no support for big numbers
function expand(n) {
  // remove + from beginning
  if (n[0] === "+") n = n.substring(1);

  const sign = n[0] === "-" ? "-" : "";
  if (sign === "-") n = n.substring(1);

  const index_of_e = n.indexOf("e");

  // number not in exponential notation
  if (index_of_e === -1) return sign + n;

  let index_of_dot = n.indexOf(".");

  // if number doesn't include a period dot
  // then just assume it at the end
  // such that 3e4 has index of dot at 1
  if (index_of_dot === -1) index_of_dot = index_of_e;

  const shift = Number(n.substring(index_of_e + 1));

  // remove old decimal place
  const base = n.substring(0, index_of_e).replace(".", "");

  // normalize shift to start of the string at index zero
  const normshift = index_of_dot + shift;

  const baselen = base.length;

  if (normshift >= baselen) {
    const zct = normshift - baselen;
    let result = base;
    for (let i = 0; i < zct; i++) result += "0";
    return sign + result;
  } else if (normshift < 0) {
    // need to add zeros in decimal places
    result = "0.";
    for (let i = 0; i > normshift; i--) result += "0";
    result += base;
    return sign + result;
  } else {
    // shifting within the base
    return sign + base.substring(0, normshift) + "." + base.substring(normshift);
  }
}

module.exports = expand;
module.exports["default"] = expand;


/***/ }),

/***/ 1149:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { MAX_SAFE_INTEGER_LENGTH } = __webpack_require__(7055);

// assumes both numbers are positive numbers
module.exports = function long_addition(a, b) {
  const alen = a.length;
  const blen = b.length;

  const aidx = a.indexOf(".");
  const bidx = b.indexOf(".");

  // basically where would the dot be
  // if we add a dot at the end of integers
  // like 123.
  const a_adjusted_dot_index = aidx === -1 ? alen : aidx;
  const b_adjusted_dot_index = bidx === -1 ? blen : bidx;

  // just use floating point arithmetic for small integers
  if (aidx === -1 && bidx === -1 && alen < MAX_SAFE_INTEGER_LENGTH && blen < MAX_SAFE_INTEGER_LENGTH) {
    return (Number(a) + Number(b)).toFixed();
  }

  // how much you need to shift the second number
  // to line up the decimal with the first
  //        0.12345
  //    12345.0

  const offset = a_adjusted_dot_index - b_adjusted_dot_index;

  let left = Math.max(a_adjusted_dot_index, b_adjusted_dot_index);

  let right = Math.max(alen - a_adjusted_dot_index - 1, blen - b_adjusted_dot_index - 1);

  let aoffset = offset < 0 ? -1 * offset : 0;
  let boffset = offset <= 0 ? 0 : offset;

  let imax = left + 1 + right - 1; // -1 for zero-index

  let result = "";

  let carried = 0;

  // to the right of the period
  //        0.12345
  //    12345.0
  let i = imax;
  if (right > 0) {
    while (i > imax - right) {
      const achar = a[i - aoffset] || "0";
      const bchar = b[i - boffset] || "0";
      let n = Number(achar) + Number(bchar) + carried;
      if (n >= 10) {
        n -= 10;
        carried = 1;
      } else {
        carried = 0;
      }
      if (result !== "" || n !== 0) {
        result = n + result;
      }
      i--;
    }
    if (result) result = "." + result;
    i--; // substract 1 for dot
  }

  if (left > 0) {
    while (i >= 0) {
      const achar = a[i - aoffset] || "0";
      const bchar = b[i - boffset] || "0";
      let n = Number(achar) + Number(bchar) + carried;
      if (n >= 10) {
        n -= 10;
        carried = 1;
      } else {
        carried = 0;
      }
      result = n + result;
      i--;
    }
  }

  if (carried === 1) {
    result = carried + result;
  }

  if (result[0] === ".") result = "0" + result;

  return result;
};


/***/ }),

/***/ 118:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const compare_positive = __webpack_require__(7363);
const add = __webpack_require__(9197);
const multiply = __webpack_require__(5679);
const subtract = __webpack_require__(6640);
const round_last_decimal = __webpack_require__(9041);

// given dividend and divisor are positive numberical strings
module.exports = function long_division(dividend, divisor, { max_decimal_digits = 100, ellipsis = false } = {}) {
  // remove unnecessary starting zeros
  // ex: 0.5 => .5
  if (dividend[0] === "0") dividend = dividend.substring(1);
  if (divisor[0] === "0") divisor = divisor.substring(1);

  const dividend_index_of_dot = dividend.indexOf(".");
  const divisor_index_of_dot = divisor.indexOf(".");

  const adjusted_dividend_index_of_dot = dividend_index_of_dot === -1 ? dividend.length : dividend_index_of_dot;
  const divisor_num_decimal_places = divisor_index_of_dot === -1 ? 0 : divisor.length - 1 - divisor_index_of_dot;

  // whether the result has a repeating decimal
  // e.g. 1/3 is repeating as in "0.333..."
  let repeating = false;

  // remove decimals
  dividend = dividend.replace(/\./, "");
  divisor = divisor.replace(/\./, "");

  const dividend_length = dividend.length;

  let current = "";
  let quotient = "";
  let comparison;
  let offset = -1 * divisor_num_decimal_places;
  let skip = 0;
  for (let i = 0; i < dividend_length; i++) {
    const char = dividend[i];

    current += char;

    comparison = compare_positive(current, divisor);

    if (comparison === ">") {
      // same as const times = Math.floor(current / divisor);
      // but without floating point problems
      let times = 1;
      let product = add(divisor, divisor);
      let passed_product = divisor;
      while (compare_positive(product, current) !== ">") {
        times++;
        passed_product = product;
        product = add(product, divisor);
      }
      times = times.toString();

      if (quotient !== "") {
        for (let i = times.length; i <= skip; i++) quotient += "0";
      }
      quotient += times; // string concatentation

      current = subtract(current, passed_product);

      skip = 0;
    } else if (comparison === "<") {
      if (quotient === "") {
        offset++;
      }
      skip++;

      // outside greater than inside
      continue;
    } else if (comparison === "=") {
      if (quotient !== "") {
        for (let i = 0; i < skip; i++) quotient += "0";
      }
      quotient += "1";
      current = "0";
      skip = 0;
    }
  }

  if (current.match(/^0+$/g)) {
    if (comparison === "<") {
      quotient += current.substring(0, current.length - 1);
    }
  } else {
    const previous = {};

    // keep dividing until we have an answer
    // figure out current place of decimal number
    const idot = adjusted_dividend_index_of_dot - offset;
    const qlen = quotient.length;
    // add 1 extra for rounding purposes
    const imax = idot - qlen + max_decimal_digits + 1;

    // reset skip if just "" so far because don't want to count 0 in 0.
    if (quotient === "") {
      skip = 0;
    }

    for (let i = 0; i < imax; i++) {
      current += "0";
      if (ellipsis) {
        if (current in previous) {
          previous[current]++;
          if (previous[current] > 3) {
            quotient += "...";
            repeating = true;
            break;
          }
        } else {
          previous[current] = 1;
        }
      }
      const comparison = compare_positive(current, divisor);

      if (comparison === ">") {
        // inside greater than outside

        // how many times the divisor goes into the current
        let times = 1;
        let product = add(divisor, divisor);
        let passed_product = divisor;
        while (compare_positive(product, current) !== ">") {
          times++;
          passed_product = product;
          product = add(product, divisor);
        }

        times = times.toString();

        // pad left zeros
        for (let i = times.length; i <= skip; i++) quotient += "0";
        quotient += times; // string concatentation
        current = subtract(current, passed_product);

        if (current === "0") {
          break;
        }

        skip = 0;
      } else if (comparison === "<") {
        // outside greater than inside
        skip++;
        continue;
      } else if (comparison === "=") {
        // fill in previous with zeros
        for (let i = 0; i < skip; i++) quotient += "0";
        quotient += "1";
        skip = 0;
        break;
      }
    }
  }

  // reinsert decimal place

  const idot = adjusted_dividend_index_of_dot - offset;
  const qlen = quotient.length;

  let num_decimals;

  if (idot === qlen) {
    // integer number so don't do anything
    num_decimals = 0;
  } else if (idot < 0) {
    quotient = "0." + "0".repeat(Math.abs(idot)) + quotient;
    num_decimals = qlen - idot; // idot is negative, so adding
  } else if (idot > qlen) {
    // add more zeros to integer
    for (let i = qlen; i < idot; i++) quotient += "0";
    num_decimals = 0;
  } else if (idot < qlen) {
    quotient = quotient.substring(0, idot) + "." + quotient.substring(idot);
    num_decimals = qlen - idot;
  } else if (idot === 0) {
    quotient = "0." + quotient;
    num_decimals = qlen;
  }

  // remove zeros from front
  // 03938.123 => 3938.123
  quotient = quotient.replace(/^0+/, "");

  // remove extra zeros from the end
  quotient = quotient.replace(/\.\d+0+$/, "");

  // round if necessary
  if (!repeating) {
    const extra_decimals = num_decimals - max_decimal_digits;
    if (extra_decimals > 0) {
      quotient = round_last_decimal(quotient.substring(0, quotient.length - extra_decimals + 1));
    }
  }

  if (quotient[0] === ".") quotient = "0" + quotient;

  return quotient;
};


/***/ }),

/***/ 7359:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { MAX_SAFE_INTEGER_LENGTH } = __webpack_require__(7055);

const CHUNK_SIZE = 15;

/**
 *
 * @param {String} a - numerical string larger or equal to b
 * @param {String} b - numerical string smaller or equal to a
 * @returns {String} product - result of multiplying a with b
 */

module.exports = function long_multiplication(a, b) {
  if (a === "0" || b === "0") return "0";

  const top_index_of_dot = a.indexOf(".");
  const bottom_index_of_dot = b.indexOf(".");

  const a_num_integer_places = top_index_of_dot === -1 ? a.length : top_index_of_dot;
  const b_num_integer_places = bottom_index_of_dot === -1 ? b.length : bottom_index_of_dot;
  const max_total_num_integer_places = a_num_integer_places + b_num_integer_places;

  const a_num_decimal_places = top_index_of_dot === -1 ? 0 : a.length - 1 - top_index_of_dot;
  const b_num_decimal_places = bottom_index_of_dot === -1 ? 0 : b.length - 1 - bottom_index_of_dot;

  const out_num_decimal_places = a_num_decimal_places + b_num_decimal_places;

  if (out_num_decimal_places === 0 && max_total_num_integer_places < MAX_SAFE_INTEGER_LENGTH) {
    return (Number(a) * Number(b)).toFixed(0);
  }

  // remove decimals
  const aint = a.replace(".", "");
  const bint = b.replace(".", "");

  const alen = aint.length;
  const blen = bint.length;

  const chunks = [];
  let i = alen;
  while (i >= 0) {
    const end = i;
    const start = (i -= CHUNK_SIZE);
    const str = aint.substring(start, end);
    chunks.push([Number(str), str.length]);
  }

  const partial_products = [];
  const partials = [];

  // for each number in multiplier
  for (let i = 0, ireverse = blen - 1; ireverse >= 0; ireverse--, i++) {
    const bstr = bint[ireverse];

    const bnum = Number(bstr);

    let carried = 0;
    let partial = "";
    const ichunklast = chunks.length - 1;
    chunks.forEach(([chunk, chunklen], c) => {
      const subpartial = carried + bnum * chunk;
      let subpartstr = subpartial.toString();
      const subpartcharlen = subpartstr.length;
      if (subpartcharlen > chunklen && c !== ichunklast) {
        const islice = -1 * chunklen;
        partial = subpartstr.slice(islice) + partial;
        carried = Number(subpartstr.slice(0, islice));
      } else {
        const imax = chunklen - subpartcharlen;
        for (let i = 0; i < imax; i++) {
          subpartstr = "0" + subpartstr;
        }
        carried = 0;
        partial = subpartstr + partial;
      }
    });

    // add number of zeros at end
    partial += "0".repeat(i);

    partial_products.push(partial);

    partials.push([Array.from(partial).map(char => Number(char)), partial.length]);
  }

  // back to front, iterate through columns
  // and add partial products together
  const num_partials = partial_products.length;

  const number_of_columns = partials[partials.length - 1][1] + num_partials;

  let result = "";
  let carried = 0;
  for (let icol = 0; icol < number_of_columns; icol++) {
    let sum = carried;
    const pmax = Math.min(icol, num_partials - 1);
    for (let p = 0; p <= pmax; p++) {
      const [pnums, plen] = partials[p];
      const i = plen - 1 - icol;
      if (i >= 0) {
        sum += pnums[i];
      }
    }

    if (sum >= 10) {
      sum = sum.toString();
      result = sum[sum.length - 1] + result;
      carried = Number(sum.slice(0, -1));
    } else {
      result = sum + result;
      carried = 0;
    }
  }

  // add decimal back in
  if (out_num_decimal_places === 0) {
    // integer
    // remove extra zeros
    result = result.replace(/^0+/, "");
  } else {
    // decimal number
    const idot = result.length - out_num_decimal_places;

    result = result.substring(0, idot) + "." + result.substring(idot);

    // remove zeros from front
    result = result.replace(/^0+/, "");

    // remove extra zeros from the end
    result = result.replace(/\.?0+$/, "");

    if (result[0] === ".") result = "0" + result;
  }

  return result;
};


/***/ }),

/***/ 4095:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// const lookup = {};
// const vals = [undefined, 0, 1, 2, 3, 4, 5, 6, 8, 9];
// vals.forEach(top => {
//   lookup[top] = {};
//   vals.forEach(bottom => {
//     lookup[top][bottom] = (top || 0) - (bottom || 0);
//   })
// });

const { MAX_SAFE_INTEGER_LENGTH } = __webpack_require__(7055);

// assumes (1) both a and b are positive numbers
// and (2) a is larger than b
module.exports = function long_subtraction(a, b) {
  const alen = a.length;
  const blen = b.length;

  const aidx = a.indexOf(".");
  const bidx = b.indexOf(".");

  // basically where would the dot be
  // if we add a dot at the end of integers
  // like 123.
  const a_adjusted_dot_index = aidx === -1 ? alen : aidx;
  const b_adjusted_dot_index = bidx === -1 ? blen : bidx;
  // console.log({a_adjusted_dot_index, b_adjusted_dot_index});

  // how much you need to shift the second number
  // to line up the decimal with the first
  //        0.12345
  //    12345.0

  // just use floating point arithmetic for small integers
  if (aidx === -1 && bidx === -1 && alen < MAX_SAFE_INTEGER_LENGTH && blen < MAX_SAFE_INTEGER_LENGTH) {
    return (Number(a) - Number(b)).toFixed();
  }

  const offset = a_adjusted_dot_index - b_adjusted_dot_index;
  // console.log("offset:", offset);

  let left = Math.max(a_adjusted_dot_index, b_adjusted_dot_index);
  // console.log("left:", left);

  let right = Math.max(alen - a_adjusted_dot_index - 1, blen - b_adjusted_dot_index - 1);
  // console.log("right:", right);

  let aoffset = offset < 0 ? -1 * offset : 0;
  let boffset = offset <= 0 ? 0 : offset;
  // console.log({aoffset, boffset});

  let imax = left + 1 + right - 1; // -1 for zero-index
  // console.log({imax});

  let result = "";

  // number of borrowings
  let borrowed = 0;

  // to the right of the period
  //  100.5  6  7
  //    2.2  9  3
  //        (-3 + 10)  4
  let i = imax;
  if (right > 0) {
    while (i > imax - right) {
      // console.log("\n\n", {i});
      let top = a[i - aoffset] || "0";
      let bottom = b[i - boffset] || "0";

      // console.log("pre borrowing", {top, bottom});
      top -= borrowed;
      borrowed = 0;

      // console.log("after borrowing", {top, bottom});
      let n = top - bottom;

      // console.log({n});
      if (n < 0) {
        while (n < 0) {
          borrowed++;
          n += 10;
        }
      } else if (borrowed) {
        borrowed--;
      }
      // console.log({n});
      if (result !== "" || n !== 0) {
        result = n + result;
      }
      i--;
    }
    if (result !== "") {
      result = "." + result;
    }
    i--; // substract 1 for dot
  }

  // console.log({result});

  if (left > 0) {
    while (i > 0) {
      // console.log("\n\n", {i});
      let top = a[i - aoffset] || "0";
      let bottom = b[i - boffset] || "0";

      // console.log("pre borrowing", {top, bottom});
      top -= borrowed;
      borrowed = 0;

      // console.log("after borrowing", {top, bottom});
      let n = top - bottom;

      // console.log({n});
      if (n < 0) {
        while (n < 0) {
          borrowed++;
          n += 10;
        }
      } else if (borrowed) {
        borrowed--;
      }
      // console.log({n});
      result = n + result;
      i--;
    }

    // console.log({borrowed});
    // special rule for last one
    const achar = a[0 - aoffset] || "0";
    const bchar = b[0 - boffset] || "0";
    let n = Number(achar) - (borrowed > 0 ? 1 : 0) - Number(bchar);
    if (n !== 0) {
      result = n + result;
    }

    // remove any zeros in front like in 0123
    result = result.replace(/^0+/, "");
  }

  // if decimal number add zero
  if (result[0] === ".") result = "0" + result;

  return result;
};


/***/ }),

/***/ 5679:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const absolute = __webpack_require__(4725);
const clean = __webpack_require__(7811);
const compare_positive = __webpack_require__(7363);
const long_multiplication = __webpack_require__(7359);

function multiply(a, b) {
  a = clean(a);
  b = clean(b);

  const apos = a[0] !== "-";
  const bpos = b[0] !== "-";

  const out_sign = apos !== bpos ? "-" : "";

  a = absolute(a);
  b = absolute(b);

  const comparison = compare_positive(a, b);

  if (comparison === "<") {
    const aold = a;
    const bold = b;
    a = bold;
    b = aold;
  }

  return out_sign + long_multiplication(a, b);
}

module.exports = multiply;
module.exports["default"] = multiply;


/***/ }),

/***/ 9041:
/***/ ((module) => {

// given n is a decimal number
const up = ["5", "6", "7", "8", "9"];
module.exports = function round_last_decimal(n) {
  // remove + from beginning
  if (n[0] === "+") n = n.substring(1);

  //console.log("rounding:", {n});
  const len = n.length;
  //console.log({len});
  let result = "";

  const last_char = n[n.length - 1];
  //console.log({last_char});

  if (up.includes(last_char)) {
    let i;
    for (i = len - 2; i >= 0; i--) {
      const char = n[i];
      //console.log({char});
      // skip over . or -
      if (char === "." || char === "-") continue;

      const nchar = Number(char) + 1;
      //console.log({nchar});

      if (nchar === 10) {
        result = "0" + result;
        // keep rounding up
      } else {
        result = nchar + result;
        break;
      }
    }
    //console.log({i});
    if (i > 0) result = n.substring(0, i) + result;
  } else {
    result = n.substring(0, len - 1);
  }

  if (result[result.length - 1] === ".") result = result.substring(0, result.length - 1);

  // remove trailing zeros in decimal number
  // 0.50 => 0.5
  if (result.indexOf(".") > -1) result = result.replace(/0+$/, "");

  return result;
};


/***/ }),

/***/ 6640:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const clean = __webpack_require__(7811);
const compare_positive = __webpack_require__(7363);
const long_addition = __webpack_require__(1149);
const long_subtraction = __webpack_require__(4095);

function subtract(a, b) {
  a = clean(a);
  b = clean(b);

  const a_is_positive = a[0] !== "-";
  const b_is_positive = b[0] !== "-";
  if (a_is_positive) {
    if (b_is_positive) {
      const comparison = compare_positive(a, b);
      if (comparison === ">") {
        return long_subtraction(a, b);
      } else if (comparison === "<") {
        return "-" + long_subtraction(b, a);
      } else {
        return "0";
      }
    } else {
      return long_addition(a, b.substring(1));
    }
  } else if (b_is_positive) {
    return "-" + long_addition(a.substring(1), b);
  } else {
    a = a.substring(1);
    b = b.substring(1);
    const comparison = compare_positive(a, b);
    if (comparison === ">") {
      return "-" + long_subtraction(a, b);
    } else if (comparison === "<") {
      return long_subtraction(b, a);
    } else {
      return "0";
    }
  }
}

module.exports = subtract;
module.exports["default"] = subtract;


/***/ }),

/***/ 3017:
/***/ ((module) => {

function count({ nums, no_data }) {
  let len = nums.length;
  const counts = {};
  let total = 0;
  if (no_data !== undefined) {
    for (let i = 0; i < len; i++) {
      const n = nums[i];
      if (n !== no_data) {
        total++;
        if (n in counts) counts[n].ct++;
        else counts[n] = { n, ct: 1 };
      }
    }
  } else {
    for (let i = 0; i < len; i++) {
      const n = nums[i];
      total++;
      if (n in counts) counts[n].ct++;
      else counts[n] = { n, ct: 1 };
    }
  }
  return { counts, total };
}

module.exports = count;
module.exports["default"] = count;


/***/ }),

/***/ 2422:
/***/ ((module, exports, __webpack_require__) => {

var __WEBPACK_AMD_DEFINE_RESULT__;const median_of_a_lot = __webpack_require__(2558);
const median_of_a_few = __webpack_require__(6639);

function calculate({ counts, nums, no_data, precise, threshold = 50, total }) {
  if (counts !== undefined || total !== undefined || nums.length > threshold) {
    return median_of_a_lot({ counts, no_data, nums, precise, total });
  } else {
    return median_of_a_few({ no_data, nums, precise });
  }
}

const mediana = { calculate };

if (true) {
  !(__WEBPACK_AMD_DEFINE_RESULT__ = (function () {
    return mediana;
  }).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
}

if (true) {
  module.exports = mediana;
  module.exports["default"] = { calculate };
}

if (typeof window === "object") {
  window.mediana = mediana;
}

if (typeof self === "object") {
  self.mediana = mediana;
}


/***/ }),

/***/ 9325:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const add = __webpack_require__(9197);
const divide = __webpack_require__(2729);

function mean(a, b, { precise = false } = { precise: false }) {
  if (precise) {
    return divide(add(a.toString(), b.toString()), "2");
  } else {
    return (a + b) / 2;
  }
}

module.exports = mean;
module.exports["default"] = mean;


/***/ }),

/***/ 6639:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const mean = __webpack_require__(9325);

function median_of_a_few({ nums, no_data, precise = false }) {
  nums = nums.filter(n => n !== no_data).sort((a, b) => a - b);
  switch (nums.length) {
    case 0:
      return undefined;
    case 1:
      return precise ? nums[0].toString() : nums[0];
    default:
      const mid = nums.length / 2;
      if (nums.length % 2 === 0) {
        return mean(nums[mid - 1], nums[mid], { precise });
      } else {
        const i = Math.floor(mid);
        return precise ? nums[i].toString() : nums[i];
      }
  }
}

module.exports = median_of_a_few;
module.exports["default"] = median_of_a_few;


/***/ }),

/***/ 2558:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const count = __webpack_require__(3017);
const mean = __webpack_require__(9325);

function median_of_a_lot({ counts, nums, no_data, precise = false, total }) {
  if (counts === undefined || total === undefined) {
    ({ counts, total } = count({ nums, no_data }));
  }

  // sort counts by value
  const countArray = Object.values(counts).sort((a, b) => a.n - b.n);
  const half = total / 2;
  const number_of_unique_values = countArray.length;
  if (number_of_unique_values === 0) {
    return undefined;
  } else if (number_of_unique_values === 1) {
    return precise ? countArray[0].n.toString() : countArray[0].n;
  } else {
    let x = 0;

    if (total % 2 === 0) {
      for (let i = 0; i < number_of_unique_values; i++) {
        const { n, ct } = countArray[i];
        x += ct;
        if (x > half) {
          // handle if odd or even
          // just barely pass cut off
          if (x - ct === half) {
            return mean(countArray[i - 1].n, n, { precise });
          } else {
            return precise ? n.toString() : n;
          }
        }
      }
    } else {
      for (let i = 0; i < number_of_unique_values; i++) {
        const { n, ct } = countArray[i];
        x += ct;
        if (x > half) return precise ? n.toString() : n;
      }
    }
  }
}

module.exports = median_of_a_lot;
module.exports["default"] = median_of_a_lot;


/***/ }),

/***/ 6752:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const clean = __webpack_require__(6468);

function absolute(n) {
  n = clean(n);
  if (n[0] === "-") return n.substring(1);
  else return n;
}

module.exports = absolute;
module.exports["default"] = absolute;


/***/ }),

/***/ 3954:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const compare_positive = __webpack_require__(6154);
const clean = __webpack_require__(6468);
const long_addition = __webpack_require__(5590);
const long_subtraction = __webpack_require__(6990);
const is_infinity = __webpack_require__(1128);

function add(a, b, { infinity_minus_infinity = "NaN" } = {}) {
  a = clean(a);
  b = clean(b);

  const apos = a[0] !== "-";
  const bpos = b[0] !== "-";

  const aneg = !apos;
  const bneg = !bpos;

  const ainf = is_infinity(a);
  const binf = is_infinity(b);

  if (ainf && binf) {
    if (apos && bpos) return "Infinity";
    else if (aneg & bneg) return "-Infinity";
    else return infinity_minus_infinity;
  } else if (ainf) {
    if (apos) return "Infinity";
    else return "-Infinity";
  } else if (binf) {
    if (bpos) return "Infinity";
    else return "-Infinity";
  } else if (apos && bpos) {
    return long_addition(a, b);
  } else if (aneg && bneg) {
    return "-" + long_addition(a.substring(1), b.substring(1));
  } else if (aneg && bpos) {
    a = a.substring(1);
    switch (compare_positive(a, b)) {
      case "=":
        return "0";
      case "<":
        return long_subtraction(b, a);
      case ">":
        return "-" + long_subtraction(a, b);
    }
  } else if (apos && !bpos) {
    b = b.substring(1);
    switch (compare_positive(a, b)) {
      case "=":
        return "0";
      case "<":
        return "-" + long_subtraction(b, a);
      case ">":
        return long_subtraction(a, b);
    }
  }
}

module.exports = add;
module.exports["default"] = add;


/***/ }),

/***/ 4314:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const clean = __webpack_require__(6468);
const compare_positive = __webpack_require__(6154);
const factorial = __webpack_require__(1298);
const long_addition = __webpack_require__(5590);
const long_subtraction = __webpack_require__(6990);
const long_division = __webpack_require__(7909);
const multiply_range = __webpack_require__(2387);

function binomial_coefficient(n, k) {
  n = clean(n);
  k = clean(k);

  switch (compare_positive(n, k)) {
    case "=":
      return "1";
    case ">": {
      const diff = long_subtraction(n, k);
      const numerator = multiply_range(long_addition(k, "1"), n);
      const denominator = factorial(diff);
      return long_division(numerator, denominator);
    }
    case "<": {
      throw new Error("[binominal_coefficient] unsupported");
    }
  }
}

module.exports = binomial_coefficient;
module.exports["default"] = binomial_coefficient;


/***/ }),

/***/ 8876:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const absolute = __webpack_require__(6752);
const clean = __webpack_require__(6468);
const long_addition = __webpack_require__(5590);
const sign = __webpack_require__(9748);

function ceil(n) {
  n = clean(n);

  const idot = n.indexOf(".");

  // if not a decimal number
  // return the original number
  if (idot === -1) return n;

  const nsign = sign(n);

  // convert n to an absolute integer
  n = absolute(n).split(".")[0];

  if (nsign === "+") {
    // like 1.5 => 1 => 2
    return long_addition(n, "1");
  } else if (nsign === "-") {
    // like -1.5 => -1
    if (n === "0" || n === "") {
      return "0";
    } else {
      return "-" + n;
    }
  }
}

module.exports = ceil;
module.exports["default"] = ceil;


/***/ }),

/***/ 6468:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const expand = __webpack_require__(2705);

module.exports = function clean(n) {
  // remove + from beginning
  if (n[0] === "+") n = n.substring(1);

  n = expand(n);

  // remove extra zero in front
  // 03938.123 => 3938.123
  n = n.replace(/^0+(?=\d)/, "");

  // remove extra zero at end
  if (n.includes(".")) n = n.replace(/\.?0+$/, "");

  // should improve this, so it identifies zero earlier
  if (n === "") n = "0";

  if (n === "-0") n = "0";

  return n;
};


/***/ }),

/***/ 4122:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const clean = __webpack_require__(6468);
const compare_positive = __webpack_require__(6154);

function compare(a, b) {
  a = clean(a);
  b = clean(b);

  const a_is_positive = a[0] !== "-";
  const b_is_positive = b[0] !== "-";

  if (a_is_positive) {
    if (b_is_positive) {
      return compare_positive(a, b);
    } else {
      return ">";
    }
  } else if (b_is_positive) {
    return "<";
  } else {
    return compare_positive(b.substring(1), a.substring(1));
  }
}

module.exports = compare;
module.exports["default"] = compare;


/***/ }),

/***/ 6154:
/***/ ((module) => {

"use strict";


// given:
//  - a and b are positive numbers
//  - a and b have been cleaned (i.e. no + or leading zeros)
function compare_positive(a, b) {
  const alen = a.length;
  const blen = b.length;

  const aidx = a.indexOf(".");
  const bidx = b.indexOf(".");

  // basically where would the dot be
  // if we add a dot at the end of integers
  // like 123.
  const a_adjusted_dot_index = aidx === -1 ? alen : aidx;
  const b_adjusted_dot_index = bidx === -1 ? blen : bidx;

  // how much you need to shift the second number
  // to line up the decimal with the first
  //        0.12345
  //    12345.0

  const offset = a_adjusted_dot_index - b_adjusted_dot_index;

  let left = Math.max(a_adjusted_dot_index, b_adjusted_dot_index);

  let right = Math.max(alen - a_adjusted_dot_index, blen - b_adjusted_dot_index);

  let aoffset = offset < 0 ? -1 * offset : 0;
  let boffset = offset <= 0 ? 0 : offset;

  let imax = left + 1 + right - 1; // -1 for zero-index

  let i = 0;
  while (i < imax) {
    const ai = i - aoffset;
    const achar = ai === a_adjusted_dot_index ? "." : a[ai] || "0";
    const bi = i - boffset;
    const bchar = bi === b_adjusted_dot_index ? "." : b[bi] || "0";
    if (achar !== bchar) {
      if (achar > bchar) return ">";
      else if (achar < bchar) return "<";
    }
    i++;
  }

  return "=";
}

module.exports = compare_positive;
module.exports["default"] = compare_positive;


/***/ }),

/***/ 5591:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const { MAX_SAFE_INTEGER } = __webpack_require__(2732);
const { MAX_SAFE_INTEGER_LENGTH } = __webpack_require__(7243);
const { PI } = __webpack_require__(5968);

module.exports = {
  MAX_SAFE_INTEGER,
  MAX_SAFE_INTEGER_LENGTH,
  PI
};


/***/ }),

/***/ 2732:
/***/ ((module) => {

"use strict";


// Internet Explorer doesn't support Number.MAX_SAFE_INTEGER
// so we just define the constant ourselves
const MAX_SAFE_INTEGER = 9007199254740991;

module.exports = { MAX_SAFE_INTEGER };


/***/ }),

/***/ 7243:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const { MAX_SAFE_INTEGER } = __webpack_require__(2732)

// the greatest number of digits an integer can have
// and be guaranteed to be stored safely as a floating point.
// subtract 1 because MAX_SAFE_INTEGER isn't all 9's
const MAX_SAFE_INTEGER_LENGTH = MAX_SAFE_INTEGER.toString().length - 1;

module.exports = { MAX_SAFE_INTEGER_LENGTH };


/***/ }),

/***/ 5968:
/***/ ((module) => {

module.exports = {
  PI_100: '3.1415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679'
};


/***/ }),

/***/ 559:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const add = __webpack_require__(3954);
const is_zero = __webpack_require__(8534);
const square = __webpack_require__(7794);
const multiply_rational = __webpack_require__(5298);
const divide = __webpack_require__(9108);

/**
 * @name cosine_radians
 * @private
 * @param {String} n
 * @returns {String} cosine of n
 */
function cosine_radians(n, { steps = 100, max_decimal_digits = 100 } = {}) {
  if (is_zero(n)) return "0";

  let sign = "-";
  let result = "1";
  let imax = steps;
  let nsquare = square(n);
  let numerator = "1";
  let denominator = "1";
  let f1;
  let f2 = "0";
  for (let i = 0; i < imax; i++) {
    f1 = add(f2, "1");
    f2 = add(f1, "1");

    // same as increasing the power by 2
    numerator = multiply_rational([numerator, nsquare], { max_decimal_digits });
    denominator = multiply_rational([denominator, f1, f2], { max_decimal_digits });
    const diff = divide(numerator, denominator, { max_decimal_digits });

    result = add(result, sign + diff);

    sign = sign === "-" ? "+" : "-";
  }
  return result;
}

module.exports = cosine_radians;
module.exports["default"] = cosine_radians;


/***/ }),

/***/ 6859:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const clean = __webpack_require__(6468);

function count_decimal_digits(n) {
  n = clean(n);

  const i = n.indexOf(".");

  // n is an integer
  if (i === -1) return "0";

  return (n.length - i - 1).toString();
}

module.exports = count_decimal_digits;
module.exports["default"] = count_decimal_digits;


/***/ }),

/***/ 9304:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const absolute = __webpack_require__(6752);
const clean = __webpack_require__(6468);

function count_integer_digits(n) {
  n = absolute(clean(n));

  const i = n.indexOf(".");

  return (i === -1 ? n.length : i).toString();
}

module.exports = count_integer_digits;
module.exports["default"] = count_integer_digits;


/***/ }),

/***/ 1908:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const pow = __webpack_require__(2555);

/**
 *
 * @param {String} base - numerical string
 * @returns {String} cube (base * base * base) as a numerical string
 */
function cube(base, options) {
  return pow(base, "3", options);
}

module.exports = cube;
module.exports["default"] = cube;


/***/ }),

/***/ 9767:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const root = __webpack_require__(6353);

function cube_root(radicand, options) {
  return root(radicand, "3", options);
}

module.exports = cube_root;
module.exports["default"] = cube_root;


/***/ }),

/***/ 9108:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const absolute = __webpack_require__(6752);
const clean = __webpack_require__(6468);
const is_infinity = __webpack_require__(1128);
const long_division = __webpack_require__(7909);

/**
 * @name divide
 * @param {String} dividend
 * @param {String} divisor
 * @param {Object} options
 * @param {Number} options.max_decimal_digits
 * @param {Boolean} options.ellipsis
 * @returns {String} - quotient
 */
function divide(dividend, divisor, options) {
  dividend = clean(dividend);
  divisor = clean(divisor);

  const dividend_is_positive = dividend[0] !== "-";
  const divisor_is_positive = divisor[0] !== "-";

  const dividend_is_infinity = is_infinity(dividend);
  const divisor_is_infinity = is_infinity(divisor);

  if (dividend_is_infinity || divisor_is_infinity) {
    if (dividend_is_positive == divisor_is_positive) {
      return "Infinity";
    } else {
      return "-Infinity";
    }
  }

  if (divisor === "0") throw new Error("[preciso] division by zero");

  // sometimes dividend can be cleaned to ""
  if (dividend === "" || dividend === "0") return "0";

  const out_sign = dividend_is_positive !== divisor_is_positive ? "-" : "";

  if (!dividend_is_positive) dividend = absolute(dividend);
  if (!divisor_is_positive) divisor = absolute(divisor);

  return out_sign + long_division(dividend, divisor, options);
}

module.exports = divide;
module.exports["default"] = divide;


/***/ }),

/***/ 8591:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const add = __webpack_require__(3954);
const divide = __webpack_require__(9108);

function eulers_number({ max_decimal_digits = 100, steps = 100 } = {}) {
  let sum = "1";
  let step = "1";
  for (let i = 1; i < steps; i++) {
    step = divide(step, i.toString(), { max_decimal_digits });
    sum = add(sum, step);
  }

  return sum;
}

module.exports = eulers_number;
module.exports["default"] = eulers_number;


/***/ }),

/***/ 2110:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const clean = __webpack_require__(6468);
const is_negative_infinity = __webpack_require__(9630);
const is_positive_infinity = __webpack_require__(1046);
const is_zero = __webpack_require__(8534);
const eulers_number = __webpack_require__(8591);
const pow = __webpack_require__(2555);

function exp(power, { max_decimal_digits = 100 } = {}) {
  const e = eulers_number({ max_decimal_digits: 2 * max_decimal_digits });

  if (is_negative_infinity(power)) return "0";
  if (is_positive_infinity(power)) return "Infinity";
  if (is_zero(power)) return "1";

  power = clean(power);

  return pow(e, power, { max_decimal_digits });
}

module.exports = exp;
module.exports["default"] = exp;


/***/ }),

/***/ 2705:
/***/ ((module) => {

"use strict";


// convert exponential notation to normal string
// not optimized yet and no support for big numbers
function expand(n) {
  // remove + from beginning
  if (n[0] === "+") n = n.substring(1);

  const sign = n[0] === "-" ? "-" : "";
  if (sign === "-") n = n.substring(1);

  const index_of_e = n.indexOf("e");

  // number not in exponential notation
  if (index_of_e === -1) return sign + n;

  let index_of_dot = n.indexOf(".");

  // if number doesn't include a period dot
  // then just assume it at the end
  // such that 3e4 has index of dot at 1
  if (index_of_dot === -1) index_of_dot = index_of_e;

  const shift = Number(n.substring(index_of_e + 1));

  // remove old decimal place
  const base = n.substring(0, index_of_e).replace(".", "");

  // normalize shift to start of the string at index zero
  const normshift = index_of_dot + shift;

  const baselen = base.length;

  if (normshift >= baselen) {
    const zct = normshift - baselen;
    let result = base;
    for (let i = 0; i < zct; i++) result += "0";
    return sign + result;
  } else if (normshift < 0) {
    // need to add zeros in decimal places
    let result = "0.";
    for (let i = 0; i > normshift; i--) result += "0";
    result += base;
    return sign + result;
  } else {
    // shifting within the base
    return sign + base.substring(0, normshift) + "." + base.substring(normshift);
  }
}

module.exports = expand;
module.exports["default"] = expand;


/***/ }),

/***/ 1298:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const multiply_range = __webpack_require__(2387);

function factorial(n) {
  if (n === "0") return "1";
  return multiply_range("1", n);
}

module.exports = factorial;
module.exports["default"] = factorial;


/***/ }),

/***/ 1804:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const absolute = __webpack_require__(6752);
const clean = __webpack_require__(6468);
const sign = __webpack_require__(9748);

function flip_sign(n) {
  n = clean(n);
  const s = sign(n);
  if (s === "") {
    return n;
  } else if (s === "-") {
    return absolute(n);
  } else if (s === "+") {
    return "-" + n;
  }

  return undefined;
}

module.exports = flip_sign;
module.exports["default"] = flip_sign;


/***/ }),

/***/ 5203:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const absolute = __webpack_require__(6752);
const clean = __webpack_require__(6468);
const long_addition = __webpack_require__(5590);
const sign = __webpack_require__(9748);

function floor(n) {
  n = clean(n);

  const idot = n.indexOf(".");

  // if not a decimal number
  // return the original number
  if (idot === -1) return n;

  const nsign = sign(n);

  // convert n to an absolute integer
  n = absolute(n).split(".")[0];

  if (nsign === "+") {
    // like 1.5 => 1
    return n;
  } else if (nsign === "-") {
    if (n === "0" || n === "") {
      // like -0.5
      return "-1";
    } else {
      // like -1.5 => -2
      return "-" + long_addition(n, "1");
    }
  }
}

module.exports = floor;
module.exports["default"] = floor;


/***/ }),

/***/ 9007:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const count_decimal_digits = __webpack_require__(6859);

/**
 * @private
 * @param {String} n - decimal string
 * @returns {Array.<string>} n - fraction like ["123", "100"] (meaning 123/100)
 */
function fraction(n) {
  const decimal_digits = count_decimal_digits(n);

  const numerator = n.replace(/\./g, "").replace(/^0/, "");
  const denominator = 1 + "0".repeat(decimal_digits);

  return [numerator, denominator];
}

module.exports = fraction;
module.exports["default"] = fraction;


/***/ }),

/***/ 5353:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const square = __webpack_require__(7794);
const square_root = __webpack_require__(8329);
const sum = __webpack_require__(1566);

function hypotenuse() {
  const args = Array.from(arguments);
  const options = typeof args[args.length - 1] === "object" ? args[args.length - 1] : undefined;
  const nums = Array.isArray(args[0]) ? args[0] : options ? args.slice(0, args.length - 1) : args;
  const squares = nums.map(n => square(n));
  return square_root(sum(squares), options);
}

module.exports = hypotenuse;
module.exports["default"] = hypotenuse;


/***/ }),

/***/ 3036:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const clean = __webpack_require__(6468);
const is_integer = __webpack_require__(6776);

function is_even(n) {
  n = clean(n);

  if (!is_integer(n)) throw new Error("can't call is_even on decimal");

  return ["0", "2", "4", "6", "8"].includes(n.charAt(n.length - 1));
}

module.exports = is_even;
module.exports["default"] = is_even;


/***/ }),

/***/ 9053:
/***/ ((module) => {

"use strict";


function is_factorial(n) {
  return !!n.match(/^\d+!$/i);
}

module.exports = is_factorial;
module.exports["default"] = is_factorial;


/***/ }),

/***/ 1598:
/***/ ((module) => {

"use strict";


/**
 * @param {String} n
 * @returns {Boolean} result
 */
function is_fraction(n) {
  return n.includes("/");
}

module.exports = is_fraction;
module.exports["default"] = is_fraction;


/***/ }),

/***/ 8219:
/***/ ((module) => {

"use strict";


function is_imaginary(n) {
  return n.includes("i");
}

module.exports = is_imaginary;
module.exports["default"] = is_imaginary;


/***/ }),

/***/ 1128:
/***/ ((module) => {

"use strict";


function is_infinity(n) {
  return !!n.match(/^(|-|\+)inf(inity)?$/i);
}

module.exports = is_infinity;
module.exports["default"] = is_infinity;


/***/ }),

/***/ 6776:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const clean = __webpack_require__(6468);
const is_infinity = __webpack_require__(1128);

function is_integer(n) {
  if (is_infinity(n)) return false;
  n = clean(n);
  return !n.includes(".") && !n.includes("/");
}

module.exports = is_integer;
module.exports["default"] = is_integer;


/***/ }),

/***/ 6755:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const clean = __webpack_require__(6468);

function is_negative(n) {
  n = clean(n);
  return n[0] === "-";
}

module.exports = is_negative;
module.exports["default"] = is_negative;


/***/ }),

/***/ 9630:
/***/ ((module) => {

"use strict";


function is_negative_infinity(n) {
  return !!n.match(/^-inf(inity)?$/i);
}

module.exports = is_negative_infinity;
module.exports["default"] = is_negative_infinity;


/***/ }),

/***/ 4595:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const clean = __webpack_require__(6468);
const is_integer = __webpack_require__(6776);

function is_odd(n) {
  n = clean(n);

  if (!is_integer(n)) throw new Error("can't call is_odd on decimal");

  return ["1", "3", "5", "7", "9"].includes(n.charAt(n.length - 1));
}

module.exports = is_odd;
module.exports["default"] = is_odd;


/***/ }),

/***/ 1046:
/***/ ((module) => {

"use strict";


function is_positive_infinity(n) {
  return !!n.match(/^\+?inf(inity)?$/i);
}

module.exports = is_positive_infinity;
module.exports["default"] = is_positive_infinity;


/***/ }),

/***/ 8534:
/***/ ((module) => {

"use strict";


function is_zero(n) {
  return /^[-+]?0(\.0+)?(e[\.\d]+)?$/.test(n);
}

module.exports = is_zero;
module.exports["default"] = is_zero;


/***/ }),

/***/ 5590:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const { MAX_SAFE_INTEGER_LENGTH } = __webpack_require__(7243);

// assumes both numbers are positive numbers
function long_addition(a, b) {
  const alen = a.length;
  const blen = b.length;

  const aidx = a.indexOf(".");
  const bidx = b.indexOf(".");

  // basically where would the dot be
  // if we add a dot at the end of integers
  // like 123.
  const a_adjusted_dot_index = aidx === -1 ? alen : aidx;
  const b_adjusted_dot_index = bidx === -1 ? blen : bidx;

  // just use floating point arithmetic for small integers
  if (aidx === -1 && bidx === -1 && alen < MAX_SAFE_INTEGER_LENGTH && blen < MAX_SAFE_INTEGER_LENGTH) {
    return (Number(a) + Number(b)).toFixed();
  }

  // how much you need to shift the second number
  // to line up the decimal with the first
  //        0.12345
  //    12345.0

  const offset = a_adjusted_dot_index - b_adjusted_dot_index;

  let left = Math.max(a_adjusted_dot_index, b_adjusted_dot_index);

  let right = Math.max(alen - a_adjusted_dot_index - 1, blen - b_adjusted_dot_index - 1);

  let aoffset = offset < 0 ? -1 * offset : 0;
  let boffset = offset <= 0 ? 0 : offset;

  let imax = left + 1 + right - 1; // -1 for zero-index

  let result = "";

  let carried = 0;

  // to the right of the period
  //        0.12345
  //    12345.0
  let i = imax;
  if (right > 0) {
    while (i > imax - right) {
      const achar = a[i - aoffset] || "0";
      const bchar = b[i - boffset] || "0";
      let n = Number(achar) + Number(bchar) + carried;
      if (n >= 10) {
        n -= 10;
        carried = 1;
      } else {
        carried = 0;
      }
      if (result !== "" || n !== 0) {
        result = n + result;
      }
      i--;
    }
    if (result) result = "." + result;
    i--; // substract 1 for dot
  }

  if (left > 0) {
    while (i >= 0) {
      const achar = a[i - aoffset] || "0";
      const bchar = b[i - boffset] || "0";
      let n = Number(achar) + Number(bchar) + carried;
      if (n >= 10) {
        n -= 10;
        carried = 1;
      } else {
        carried = 0;
      }
      result = n + result;
      i--;
    }
  }

  if (carried === 1) {
    result = carried + result;
  }

  if (result[0] === ".") result = "0" + result;

  return result;
}

module.exports = long_addition;
module.exports["default"] = long_addition;


/***/ }),

/***/ 7909:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const compare_positive = __webpack_require__(6154);
const add = __webpack_require__(3954);
const subtract = __webpack_require__(8945);
const round_last_decimal = __webpack_require__(5764);

// given dividend and divisor are positive numberical strings
function long_division(dividend, divisor, { format = "string", max_decimal_digits = 100, ellipsis = false } = {}) {
  // remove unnecessary starting zeros
  // ex: 0.5 => .5
  if (dividend[0] === "0") dividend = dividend.substring(1);
  if (divisor[0] === "0") divisor = divisor.substring(1);

  const dividend_index_of_dot = dividend.indexOf(".");
  const divisor_index_of_dot = divisor.indexOf(".");

  const adjusted_dividend_index_of_dot = dividend_index_of_dot === -1 ? dividend.length : dividend_index_of_dot;
  const divisor_num_decimal_places = divisor_index_of_dot === -1 ? 0 : divisor.length - 1 - divisor_index_of_dot;

  // whether the result has a repeating decimal
  // e.g. 1/3 is repeating as in "0.333..."
  let repeating = false;

  // remove decimals
  dividend = dividend.replace(/\./, "");
  divisor = divisor.replace(/\./, "");

  const dividend_length = dividend.length;

  let current = "";
  let quotient = "";
  let comparison;
  let offset = -1 * divisor_num_decimal_places;
  let skip = 0;
  for (let i = 0; i < dividend_length; i++) {
    const char = dividend[i];

    current += char;

    comparison = compare_positive(current, divisor);

    if (comparison === ">") {
      // same as const times = Math.floor(current / divisor);
      // but without floating point problems
      let times = 1;
      let product = add(divisor, divisor);
      let passed_product = divisor;
      while (compare_positive(product, current) !== ">") {
        times++;
        passed_product = product;
        product = add(product, divisor);
      }
      times = times.toString();

      if (quotient !== "") {
        for (let i = times.length; i <= skip; i++) quotient += "0";
      }
      quotient += times; // string concatentation

      current = subtract(current, passed_product);

      skip = 0;
    } else if (comparison === "<") {
      if (quotient === "") {
        offset++;
      }
      skip++;

      // outside greater than inside
      continue;
    } else if (comparison === "=") {
      if (quotient !== "") {
        for (let i = 0; i < skip; i++) quotient += "0";
      }
      quotient += "1";
      current = "0";
      skip = 0;
    }
  }

  if (current.match(/^0+$/g)) {
    if (comparison === "<") {
      quotient += current.substring(0, current.length - 1);
    }
  } else {
    const previous = {};

    // keep dividing until we have an answer
    // figure out current place of decimal number
    const idot = adjusted_dividend_index_of_dot - offset;
    const qlen = quotient.length;
    // add 1 extra for rounding purposes
    const imax = idot - qlen + max_decimal_digits + 1;

    // reset skip if just "" so far because don't want to count 0 in 0.
    if (quotient === "") {
      skip = 0;
    }

    for (let i = 0; i < imax; i++) {
      current += "0";
      if (ellipsis) {
        if (current in previous) {
          previous[current]++;
          if (previous[current] > 3) {
            quotient += "...";
            repeating = true;
            break;
          }
        } else {
          previous[current] = 1;
        }
      }
      const comparison = compare_positive(current, divisor);

      if (comparison === ">") {
        // inside greater than outside

        // how many times the divisor goes into the current
        let times = 1;
        let product = add(divisor, divisor);
        let passed_product = divisor;
        while (compare_positive(product, current) !== ">") {
          times++;
          passed_product = product;
          product = add(product, divisor);
        }

        times = times.toString();

        // pad left zeros
        for (let i = times.length; i <= skip; i++) quotient += "0";
        quotient += times; // string concatentation
        current = subtract(current, passed_product);

        if (current === "0") {
          break;
        }

        skip = 0;
      } else if (comparison === "<") {
        // outside greater than inside
        skip++;
        continue;
      } else if (comparison === "=") {
        // fill in previous with zeros
        for (let i = 0; i < skip; i++) quotient += "0";
        quotient += "1";
        skip = 0;
        break;
      }
    }
  }

  // reinsert decimal place

  const idot = adjusted_dividend_index_of_dot - offset;
  const qlen = quotient.length;

  let num_decimals;

  if (idot === qlen) {
    // integer number so don't do anything
    num_decimals = 0;
  } else if (idot < 0) {
    quotient = "0." + "0".repeat(Math.abs(idot)) + quotient;
    num_decimals = qlen - idot; // idot is negative, so adding
  } else if (idot > qlen) {
    // add more zeros to integer
    for (let i = qlen; i < idot; i++) quotient += "0";
    num_decimals = 0;
  } else if (idot < qlen) {
    quotient = quotient.substring(0, idot) + "." + quotient.substring(idot);
    num_decimals = qlen - idot;
  } else if (idot === 0) {
    quotient = "0." + quotient;
    num_decimals = qlen;
  }

  // remove zeros from front
  // 03938.123 => 3938.123
  quotient = quotient.replace(/^0+/, "");

  // remove extra zeros from the end
  quotient = quotient.replace(/\.\d+0+$/, "");

  const extra_decimals = num_decimals - max_decimal_digits;

  // round if necessary
  if (!repeating) {
    if (extra_decimals > 0) {
      quotient = round_last_decimal(quotient.substring(0, quotient.length - extra_decimals + 1));
    }
  }

  if (quotient[0] === ".") quotient = "0" + quotient;

  if (format === "object") {
    return { quotient, extra_decimals };
  } else {
    return quotient;
  }
}

module.exports = long_division;
module.exports["default"] = long_division;


/***/ }),

/***/ 8044:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const { MAX_SAFE_INTEGER_LENGTH } = __webpack_require__(7243);

const CHUNK_SIZE = 15;

/**
 *
 * @param {String} a - numerical string larger or equal to b
 * @param {String} b - numerical string smaller or equal to a
 * @returns {String} product - result of multiplying a with b
 */

function long_multiplication(a, b) {
  if (a === "0" || b === "0") return "0";

  const top_index_of_dot = a.indexOf(".");
  const bottom_index_of_dot = b.indexOf(".");

  const a_num_integer_places = top_index_of_dot === -1 ? a.length : top_index_of_dot;
  const b_num_integer_places = bottom_index_of_dot === -1 ? b.length : bottom_index_of_dot;
  const max_total_num_integer_places = a_num_integer_places + b_num_integer_places;

  const a_num_decimal_places = top_index_of_dot === -1 ? 0 : a.length - 1 - top_index_of_dot;
  const b_num_decimal_places = bottom_index_of_dot === -1 ? 0 : b.length - 1 - bottom_index_of_dot;

  const out_num_decimal_places = a_num_decimal_places + b_num_decimal_places;

  if (out_num_decimal_places === 0 && max_total_num_integer_places < MAX_SAFE_INTEGER_LENGTH) {
    return (Number(a) * Number(b)).toFixed(0);
  }

  // remove decimals
  const aint = a.replace(".", "");
  const bint = b.replace(".", "");

  const alen = aint.length;
  const blen = bint.length;

  const chunks = [];
  let i = alen;
  while (i >= 0) {
    const end = i;
    const start = (i -= CHUNK_SIZE);
    const str = aint.substring(start, end);
    chunks.push([Number(str), str.length]);
  }

  const partial_products = [];
  const partials = [];

  // for each number in multiplier
  for (let i = 0, ireverse = blen - 1; ireverse >= 0; ireverse--, i++) {
    const bstr = bint[ireverse];

    const bnum = Number(bstr);

    let carried = 0;
    let partial = "";
    const ichunklast = chunks.length - 1;
    chunks.forEach(([chunk, chunklen], c) => {
      const subpartial = carried + bnum * chunk;
      let subpartstr = subpartial.toString();
      const subpartcharlen = subpartstr.length;
      if (subpartcharlen > chunklen && c !== ichunklast) {
        const islice = -1 * chunklen;
        partial = subpartstr.slice(islice) + partial;
        carried = Number(subpartstr.slice(0, islice));
      } else {
        const imax = chunklen - subpartcharlen;
        for (let i = 0; i < imax; i++) {
          subpartstr = "0" + subpartstr;
        }
        carried = 0;
        partial = subpartstr + partial;
      }
    });

    // add number of zeros at end
    partial += "0".repeat(i);

    partial_products.push(partial);

    partials.push([Array.from(partial).map(char => Number(char)), partial.length]);
  }

  // back to front, iterate through columns
  // and add partial products together
  const num_partials = partial_products.length;

  const number_of_columns = partials[partials.length - 1][1] + num_partials;

  let result = "";
  let carried = 0;
  for (let icol = 0; icol < number_of_columns; icol++) {
    let sum = carried;
    const pmax = Math.min(icol, num_partials - 1);
    for (let p = 0; p <= pmax; p++) {
      const [pnums, plen] = partials[p];
      const i = plen - 1 - icol;
      if (i >= 0) {
        sum += pnums[i];
      }
    }

    if (sum >= 10) {
      sum = sum.toString();
      result = sum[sum.length - 1] + result;
      carried = Number(sum.slice(0, -1));
    } else {
      result = sum + result;
      carried = 0;
    }
  }

  // add decimal back in
  if (out_num_decimal_places === 0) {
    // integer
    // remove extra zeros
    result = result.replace(/^0+/, "");
  } else {
    // decimal number
    const idot = result.length - out_num_decimal_places;

    result = result.substring(0, idot) + "." + result.substring(idot);

    // remove zeros from front
    result = result.replace(/^0+/, "");

    // remove extra zeros from the end
    result = result.replace(/\.?0+$/, "");

    if (result[0] === ".") result = "0" + result;
  }

  return result;
}

module.exports = long_multiplication;
module.exports["default"] = long_multiplication;


/***/ }),

/***/ 6990:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


// const lookup = {};
// const vals = [undefined, 0, 1, 2, 3, 4, 5, 6, 8, 9];
// vals.forEach(top => {
//   lookup[top] = {};
//   vals.forEach(bottom => {
//     lookup[top][bottom] = (top || 0) - (bottom || 0);
//   })
// });

const { MAX_SAFE_INTEGER_LENGTH } = __webpack_require__(7243);

// assumes (1) both a and b are positive numbers
// and (2) a is larger than b
function long_subtraction(a, b) {
  const alen = a.length;
  const blen = b.length;

  const aidx = a.indexOf(".");
  const bidx = b.indexOf(".");

  // basically where would the dot be
  // if we add a dot at the end of integers
  // like 123.
  const a_adjusted_dot_index = aidx === -1 ? alen : aidx;
  const b_adjusted_dot_index = bidx === -1 ? blen : bidx;
  // console.log({a_adjusted_dot_index, b_adjusted_dot_index});

  // how much you need to shift the second number
  // to line up the decimal with the first
  //        0.12345
  //    12345.0

  // just use floating point arithmetic for small integers
  if (aidx === -1 && bidx === -1 && alen < MAX_SAFE_INTEGER_LENGTH && blen < MAX_SAFE_INTEGER_LENGTH) {
    return (Number(a) - Number(b)).toFixed();
  }

  const offset = a_adjusted_dot_index - b_adjusted_dot_index;
  // console.log("offset:", offset);

  let left = Math.max(a_adjusted_dot_index, b_adjusted_dot_index);
  // console.log("left:", left);

  let right = Math.max(alen - a_adjusted_dot_index - 1, blen - b_adjusted_dot_index - 1);
  // console.log("right:", right);

  let aoffset = offset < 0 ? -1 * offset : 0;
  let boffset = offset <= 0 ? 0 : offset;
  // console.log({aoffset, boffset});

  let imax = left + 1 + right - 1; // -1 for zero-index
  // console.log({imax});

  let result = "";

  // number of borrowings
  let borrowed = 0;

  // to the right of the period
  //  100.5  6  7
  //    2.2  9  3
  //        (-3 + 10)  4
  let i = imax;
  if (right > 0) {
    while (i > imax - right) {
      // console.log("\n\n", {i});
      let top = a[i - aoffset] || "0";
      let bottom = b[i - boffset] || "0";

      // console.log("pre borrowing", {top, bottom});
      top -= borrowed;
      borrowed = 0;

      // console.log("after borrowing", {top, bottom});
      let n = top - bottom;

      // console.log({n});
      if (n < 0) {
        while (n < 0) {
          borrowed++;
          n += 10;
        }
      } else if (borrowed) {
        borrowed--;
      }
      // console.log({n});
      if (result !== "" || n !== 0) {
        result = n + result;
      }
      i--;
    }
    if (result !== "") {
      result = "." + result;
    }
    i--; // substract 1 for dot
  }

  // console.log({result});

  if (left > 0) {
    while (i > 0) {
      // console.log("\n\n", {i});
      let top = a[i - aoffset] || "0";
      let bottom = b[i - boffset] || "0";

      // console.log("pre borrowing", {top, bottom});
      top -= borrowed;
      borrowed = 0;

      // console.log("after borrowing", {top, bottom});
      let n = top - bottom;

      // console.log({n});
      if (n < 0) {
        while (n < 0) {
          borrowed++;
          n += 10;
        }
      } else if (borrowed) {
        borrowed--;
      }
      // console.log({n});
      result = n + result;
      i--;
    }

    // console.log({borrowed});
    // special rule for last one
    const achar = a[0 - aoffset] || "0";
    const bchar = b[0 - boffset] || "0";
    let n = Number(achar) - (borrowed > 0 ? 1 : 0) - Number(bchar);
    if (n !== 0) {
      result = n + result;
    }

    // remove any zeros in front like in 0123
    result = result.replace(/^0+/, "");
  }

  // if decimal number add zero
  if (result[0] === ".") result = "0" + result;

  return result;
}

module.exports = long_subtraction;
module.exports["default"] = long_subtraction;


/***/ }),

/***/ 9667:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const clean = __webpack_require__(6468);
const compare = __webpack_require__(4122);

function max(nums) {
  // called like max(n1, n2, n3...)
  if (typeof nums === "string") nums = Array.prototype.slice.call(arguments);
  let result = clean(nums[0]);
  const len = nums.length;
  for (let i = 1; i < len; i++) {
    const n = nums[i];
    if (compare(n, result) === ">") {
      result = n;
    }
  }
  return result;
}

module.exports = max;
module.exports["default"] = max;


/***/ }),

/***/ 2572:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const add = __webpack_require__(3954);
const divide = __webpack_require__(9108);

function mean(nums, options) {
  let count = 0;
  let total = "0";
  for (let num of nums) {
    count++;
    total = add(total, num);
  }
  return divide(total, count.toString(), options);
}

module.exports = mean;
module.exports["default"] = mean;


/***/ }),

/***/ 3905:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const clean = __webpack_require__(6468);
const compare = __webpack_require__(4122);

function min(nums) {
  // called like min(n1, n2, n3...)
  if (typeof nums === "string") nums = Array.prototype.slice.call(arguments);
  let result = clean(nums[0]);
  const len = nums.length;
  for (let i = 1; i < len; i++) {
    const n = nums[i];
    if (compare(n, result) === "<") {
      result = n;
    }
  }
  return result;
}

module.exports = min;
module.exports["default"] = min;


/***/ }),

/***/ 405:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const multiply_array = __webpack_require__(5459);

function multiply() {
  const args = Array.from(arguments);
  const options = typeof args[args.length - 1] === "object" ? args[args.length - 1] : undefined;
  const nums = Array.isArray(args[0]) ? args[0] : options ? args.slice(0, args.length - 1) : args;
  return multiply_array(nums, options);
}

module.exports = multiply;
module.exports["default"] = multiply;


/***/ }),

/***/ 5459:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const is_imaginary = __webpack_require__(8219);
const is_infinity = __webpack_require__(1128);
const is_odd = __webpack_require__(4595);
const is_zero = __webpack_require__(8534);
const multiply_rational = __webpack_require__(5298);
const sign_nonzero = __webpack_require__(4542);

/**
 * @name multiply_array
 * @private
 * @description Multiply an array of numbers together
 * @param {Array.<String>} nums - array of numerical strings
 * @returns {String} product as a numerical string
 */
function multiply_array(nums, { max_decimal_digits, infinity_times_zero = "NaN" } = {}) {
  const has_inf = nums.some(n => is_infinity(n));
  const has_zero = nums.some(n => is_zero(n));

  if (has_inf && has_zero) {
    return infinity_times_zero;
  } else if (has_inf) {
    const ct = nums.filter(n => sign_nonzero(n) === "-").length;
    return ct % 2 === 0 ? "Infinity" : "-Infinity";
  } else if (has_zero) {
    return "0";
  }

  const imaginary = is_odd(nums.filter(n => is_imaginary(n)).length.toString());
  let product = multiply_rational(
    nums.map(n => n.replace(/i$/, "")),
    { max_decimal_digits }
  );
  if (imaginary) product += "i";
  return product;
}

module.exports = multiply_array;
module.exports["default"] = multiply_array;


/***/ }),

/***/ 2387:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const compare_positive = __webpack_require__(6154);
const is_zero = __webpack_require__(8534);
const long_multiplication = __webpack_require__(8044);
const long_addition = __webpack_require__(5590);

function multiply_range(min, max, step = "1") {
  if (is_zero(min)) return "0";
  let product = min;
  let n = min;
  while (compare_positive(n, max) === "<") {
    n = long_addition(n, step);
    product = long_multiplication(product, n);
  }

  return product;
}

module.exports = multiply_range;
module.exports["default"] = multiply_range;


/***/ }),

/***/ 5298:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const absolute = __webpack_require__(6752);
const clean = __webpack_require__(6468);
const compare_positive = __webpack_require__(6154);
const long_multiplication = __webpack_require__(8044);
const round = __webpack_require__(5877);

/**
 * @name multiply
 * @returns {String} product
 */
function multiply_rational(nums, { max_decimal_digits } = {}) {
  let product = clean(nums[0]);
  let product_absolute = absolute(product);
  let product_sign = product[0] === "-" ? "-" : "";

  const imax = nums.length;
  for (let i = 1; i < imax; i++) {
    const current = clean(nums[i]);
    const current_sign = current[0] === "-" ? "-" : "";
    const current_absolute = absolute(current);
    product_sign = product_sign !== current_sign ? "-" : "";

    const comparison = compare_positive(product_absolute, current_absolute);

    product_absolute = comparison === "<" ? long_multiplication(current_absolute, product_absolute) : long_multiplication(product_absolute, current_absolute);

    product = product_sign + product_absolute;
  }
  if (typeof max_decimal_digits === "number") product = round(product, { digits: max_decimal_digits });
  return product;
}

module.exports = multiply_rational;
module.exports["default"] = multiply_rational;


/***/ }),

/***/ 6814:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const add = __webpack_require__(3954);
const long_addition = __webpack_require__(5590);
const divide = __webpack_require__(9108);
const multiply_rational = __webpack_require__(5298);

// calculate PI using Nilakantha Series
function nilakantha(steps = 100, { divide_options } = {}) {
  let sign = "+";
  let pi = "3";
  let a = "2";
  let b = "3";
  let c = "4";
  for (let i = 1; i < steps; i++) {
    const divisor = multiply_rational([a, b, c]);

    const part = sign + divide("4", divisor, divide_options);

    pi = add(pi, part);

    // flip sign
    sign = sign === "-" ? "+" : "-";

    a = c;
    b = long_addition(c, "1");
    c = long_addition(b, "1");
  }
  return pi;
}

module.exports = nilakantha;
module.exports["default"] = nilakantha;


/***/ }),

/***/ 6993:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const add = __webpack_require__(3954);
const divide = __webpack_require__(9108);
const multiply_rational = __webpack_require__(5298);
const round = __webpack_require__(5877);
const subtract = __webpack_require__(8945);
const square = __webpack_require__(7794);

function ols(points, options) {
  const number_of_points = points.length;
  let sum_of_x = "0";
  let sum_of_x_squares = "0";
  let sum_of_y = "0";
  let sum_of_y_squares = "0";

  if (number_of_points === 0) throw Error("[preciso] zero points passed to linear_regression");

  for (let i = 0; i < number_of_points; i++) {
    const [x, y] = points[i];
    sum_of_x = add(sum_of_x, x);
    sum_of_x_squares = add(sum_of_x_squares, square(x));
    sum_of_y = add(sum_of_y, y);
    sum_of_y_squares = add(sum_of_y_squares, square(y));
  }

  const number_of_points_as_string = number_of_points.toString();
  const x_mean = divide(sum_of_x, number_of_points_as_string);
  const y_mean = divide(sum_of_y, number_of_points_as_string);

  // second pass to calculate errors
  let sum_of_errors = "0";
  let sum_of_residual_squares = "0";
  for (let i = 0; i < number_of_points; i++) {
    const [x, y] = points[i];

    const x_error = subtract(x, x_mean);
    const y_error = subtract(y, y_mean);
    const xy_error = multiply_rational([x_error, y_error]);
    sum_of_errors = add(sum_of_errors, xy_error);

    const x_error_square = square(x_error);
    sum_of_residual_squares = add(sum_of_residual_squares, x_error_square);
  }

  // y = m * x + b
  let m = divide(sum_of_errors, sum_of_residual_squares);
  let b = subtract(y_mean, multiply_rational(m, x_mean));

  if (options && typeof options.max_decimal_digits === "number") {
    m = round(m, { digits: options.max_decimal_digits });
    b = round(b, { digits: options.max_decimal_digits });
  }

  return { m, b };
}

module.exports = ols;
module.exports["default"] = ols;


/***/ }),

/***/ 5427:
/***/ ((module) => {

"use strict";


function parse_fraction(n) {
  return n.split("/");
}

module.exports = parse_fraction;
module.exports["default"] = parse_fraction;


/***/ }),

/***/ 2555:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const absolute = __webpack_require__(6752);
const clean = __webpack_require__(6468);
const divide = __webpack_require__(9108);
const fraction = __webpack_require__(9007);
const is_integer = __webpack_require__(6776);
const is_imaginary = __webpack_require__(8219);
const is_odd = __webpack_require__(4595);
const is_zero = __webpack_require__(8534);
const multiply = __webpack_require__(405);
const pow_positive = __webpack_require__(5745);
const reciprocal = __webpack_require__(2125);
const root = __webpack_require__(6353);
const round = __webpack_require__(5877);
const sign = __webpack_require__(9748);
const simplify_fraction = __webpack_require__(6723);

function pow(
  base,
  exponent,
  {
    zero_to_the_power_of_zero = "1",
    // passed to divide then long_division
    ellipsis = false,
    imaginary = true,
    max_decimal_digits = 100,
    fraction: use_fraction = false
  } = {}
) {
  base = clean(base);
  exponent = clean(exponent);

  const base_is_imaginary = imaginary && is_imaginary(base);
  if (base_is_imaginary) base = base.replace(/i$/, "");

  const base_is_zero = is_zero(base);
  const exponent_is_zero = is_zero(exponent);

  if (base_is_zero && exponent_is_zero) {
    // https://en.wikipedia.org/wiki/Zero_to_the_power_of_zero
    return zero_to_the_power_of_zero;
  }

  if (exponent_is_zero) {
    return "1";
  }

  // const sign_of_base = sign(base);
  const sign_of_exponent = sign(exponent);

  if (base_is_zero) {
    if (sign_of_exponent === "+") {
      return "0";
    } else if (sign_of_exponent === "-") {
      return "Infinity";
    }
  }

  const exponent_is_integer = is_integer(exponent);

  if (sign_of_exponent === "+" && exponent_is_integer) {
    let product = pow_positive(base, exponent);
    if (typeof max_decimal_digits === "number") {
      product = round(product, { digits: max_decimal_digits });
    }
    if (base_is_imaginary && is_odd(exponent)) product += "i";
    return product;
  }

  if (sign_of_exponent === "-" && exponent_is_integer) {
    // e.g. pow(7, -2) => 1 / pow(7, 2)
    const numerator = "1";
    const denominator = pow_positive(base, absolute(exponent));
    return divide(numerator, denominator, { ellipsis, max_decimal_digits });
  }

  if (!exponent_is_integer) {
    exponent = absolute(exponent);

    let [numerator, denominator] = exponent.includes("/") ? exponent.split("/") : fraction(exponent);

    [numerator, denominator] = simplify_fraction(numerator, denominator);

    // base could be an integer or decimal
    // denominator is an integer
    let inner = root(base, denominator, { imaginary });

    let result = multiply(numerator, inner);
    // console.log({ sign_of_exponent, base, exponent, numerator, denominator, inner, result, max_decimal_digits })

    if (typeof max_decimal_digits === "number") result = round(result, { digits: max_decimal_digits });
    // console.log("rounded:", result);

    if (sign_of_exponent === "-") {
      result = reciprocal(result, { fraction: use_fraction, max_decimal_digits });
    }

    return result;
  }
}

module.exports = pow;
module.exports["default"] = pow;


/***/ }),

/***/ 5745:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const multiply_rational = __webpack_require__(5298);

// assuming:
// - base and exponent are clean
// - exponent is a positive integer
function pow_positive(base, exponent) {
  const imax = Number(exponent);
  let product = base;
  for (let i = 1; i < imax; i++) {
    product = multiply_rational([product, base]);
  }
  return product;
}

module.exports = pow_positive;
module.exports["default"] = pow_positive;


/***/ }),

/***/ 7422:
/***/ ((module, exports, __webpack_require__) => {

"use strict";
var __WEBPACK_AMD_DEFINE_RESULT__;

/* global define */
const absolute = __webpack_require__(6752);
const add = __webpack_require__(3954);
const binomial_coefficient = __webpack_require__(4314);
const ceil = __webpack_require__(8876);
const clean = __webpack_require__(6468);
const compare = __webpack_require__(4122);
const compare_positive = __webpack_require__(6154);
const constants = __webpack_require__(5591);
const cosine_radians = __webpack_require__(559);
const count_decimal_digits = __webpack_require__(6859);
const count_integer_digits = __webpack_require__(9304);
const cube = __webpack_require__(1908);
const cube_root = __webpack_require__(9767);
const divide = __webpack_require__(9108);
const eulers_number = __webpack_require__(8591);
const exp = __webpack_require__(2110);
const expand = __webpack_require__(2705);
const factorial = __webpack_require__(1298);
const flip_sign = __webpack_require__(1804);
const floor = __webpack_require__(5203);
const fraction = __webpack_require__(9007);
// const gregory_leibniz = require("./gregory_leibniz.js");
const hypotenuse = __webpack_require__(5353);
const is_factorial = __webpack_require__(9053);
const is_infinity = __webpack_require__(1128);
const is_integer = __webpack_require__(6776);
const is_negative_infinity = __webpack_require__(9630);
const is_positive_infinity = __webpack_require__(1046);
const is_zero = __webpack_require__(8534);
const long_addition = __webpack_require__(5590);
const long_division = __webpack_require__(7909);
const long_multiplication = __webpack_require__(8044);
const long_subtraction = __webpack_require__(6990);
const max = __webpack_require__(9667);
const mean = __webpack_require__(2572);
const min = __webpack_require__(3905);
const multiply = __webpack_require__(405);
const multiply_array = __webpack_require__(5459);
const multiply_range = __webpack_require__(2387);
const nilakantha = __webpack_require__(6814);
const ols = __webpack_require__(6993);
const pow = __webpack_require__(2555);
const pow_positive = __webpack_require__(5745);
const primes = __webpack_require__(8673);
const reciprocal = __webpack_require__(2125);
const remainder = __webpack_require__(2426);
const root = __webpack_require__(6353);
const root_integer_digits = __webpack_require__(841);
const round = __webpack_require__(5877);
const round_last_decimal = __webpack_require__(5764);
const sign = __webpack_require__(9748);
const sign_nonzero = __webpack_require__(4542);
const simplify_fraction = __webpack_require__(6723);
const sine_radians = __webpack_require__(5017);
const softmax = __webpack_require__(2023);
const sort = __webpack_require__(6125);
const square = __webpack_require__(7794);
const square_root = __webpack_require__(8329);
const subtract = __webpack_require__(8945);
const sum = __webpack_require__(1566);
const truncate = __webpack_require__(9503);

const module_exports = {
  absolute,
  add,
  binomial_coefficient,
  ceil,
  clean,
  compare,
  compare_positive,
  constants,
  cosine_radians,
  count_decimal_digits,
  count_integer_digits,
  cube,
  cube_root,
  divide,
  eulers_number,
  exp,
  expand,
  factorial,
  flip_sign,
  floor,
  fraction,
  // gregory_leibniz,
  hypotenuse,
  is_infinity,
  is_integer,
  is_factorial,
  is_negative_infinity,
  is_positive_infinity,
  is_zero,
  long_addition,
  long_division,
  long_multiplication,
  long_subtraction,
  mean,
  max,
  min,
  multiply,
  multiply_array,
  multiply_range,
  nilakantha,
  ols,
  pow,
  pow_positive,
  primes,
  reciprocal,
  remainder,
  root,
  root_integer_digits,
  round,
  round_last_decimal,
  sign,
  sign_nonzero,
  simplify_fraction,
  sine_radians,
  softmax,
  sort,
  square,
  square_root,
  subtract,
  sum,
  truncate
};

if (true)
  !(__WEBPACK_AMD_DEFINE_RESULT__ = (function () {
    return module_exports;
  }).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
if (true) {
  module.exports = module_exports;
  module.exports["default"] = module_exports;
}
if (typeof window === "object") window.preciso = module_exports;
if (typeof self === "object") self.preciso = module_exports;


/***/ }),

/***/ 8673:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const compare_positive = __webpack_require__(6154);
const divide = __webpack_require__(9108);
const is_integer = __webpack_require__(6776);
const long_addition = __webpack_require__(5590);

/**
 *
 * @param {String} start - numerical string
 * @param {String} end - numerical end
 * @returns {Array.<string>} primes - array of prime numbers as strings
 */
function primes(start = "0", end = "100") {
  const prime_single_digits = ["2", "3", "5", "7", "11"];
  const results = prime_single_digits.filter(n => compare_positive(n, start) !== "<" && compare_positive(n, end) !== ">");

  let num = "13";

  while (compare_positive(num, end) !== ">") {
    // don't even bother checking if ends with 5 or all one number
    if (!(/^\d+5/.test(num) || /^(\d)\1+/.test(num))) {
      if (["9", "7", "3"].every(digit => !is_integer(divide(num, digit)))) {
        results.push(num);
      }
    }
    num = long_addition(num, "2");
  }
  return results;
}

module.exports = primes;
module.exports["default"] = primes;


/***/ }),

/***/ 2125:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const divide = __webpack_require__(9108);
const is_fraction = __webpack_require__(1598);
const parse_fraction = __webpack_require__(5427);

function reciprocal(n, { max_decimal_digits = 100, fraction = false } = {}) {
  if (is_fraction(n)) {
    const [numerator, denominator] = parse_fraction(n);
    if (fraction) {
      return denominator + "/" + numerator;
    } else {
      return divide(denominator, numerator, { max_decimal_digits });
    }
  } else {
    if (fraction) {
      return "1/" + n;
    } else {
      return divide("1", n, { max_decimal_digits });
    }
  }
}

module.exports = reciprocal;
module.exports["default"] = reciprocal;


/***/ }),

/***/ 2426:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const absolute = __webpack_require__(6752);
const clean = __webpack_require__(6468);
const compare_positive = __webpack_require__(6154);
const long_division = __webpack_require__(7909);
const multiply = __webpack_require__(405);
const subtract = __webpack_require__(8945);
const truncate = __webpack_require__(9503);

function remainder(dividend, divisor) {
  // console.log("\n\nremainder");
  dividend = clean(dividend);
  divisor = clean(divisor);

  const sign = dividend[0] === "-" ? "-" : "";

  dividend = absolute(dividend);
  divisor = absolute(divisor);

  const comparison = compare_positive(dividend, divisor);
  if (comparison === "=") return "0";

  // if dividend is less than the divisor, just return the dividend
  if (comparison === "<") {
    if (dividend[0] === ".") dividend = "0" + dividend;
    return sign + dividend;
  }

  // can use long_division because know that
  // dividend and divisor are positive numerical strings
  const quotient = long_division(dividend, divisor, { max_decimal_places: 0 });

  const times = truncate(quotient);

  const product = multiply(divisor, times);

  return sign + subtract(dividend, product);
}

module.exports = remainder;
module.exports["default"] = remainder;


/***/ }),

/***/ 6353:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const absolute = __webpack_require__(6752);
const clean = __webpack_require__(6468);
const compare_positive = __webpack_require__(6154);
const is_even = __webpack_require__(3036);
const is_integer = __webpack_require__(6776);
const is_negative = __webpack_require__(6755);
const pow_positive = __webpack_require__(5745);
const root_integer_digits = __webpack_require__(841);

/**
 *
 * @param {String} radicand
 * @param {String} index
 * @param {Object} options
 * @param {Boolean} options.imaginary - imaginary numbers are supported
 * @param {Number} options.max_decimal_digits - maximum number of decimal digits allowed in the result
 * @returns {String} result
 */
function root(radicand, index, { imaginary = true, max_decimal_digits = 100 } = {}) {
  radicand = clean(radicand);
  index = clean(index);

  if (index === "1") return radicand;
  if (radicand === "1") return "1";

  if (!is_integer(index)) throw new Error("[preciso] can't find fractional roots");
  if (is_negative(index)) throw new Error("[preciso] can't find root of negative indexes");

  const rad = absolute(radicand);

  const radicand_is_negative = is_negative(radicand);
  const index_is_even = is_even(index);

  const has_imaginary = radicand_is_negative && index_is_even;
  if (has_imaginary && !imaginary) throw new Error("[preciso] root has an imaginary number");

  const out_sign = radicand_is_negative && !index_is_even ? "-" : "";

  const count_of_integer_places = root_integer_digits(rad, index);

  const digits = ["9", "8", "7", "6", "5", "4", "3", "2", "1", "0"];

  let left = "";

  for (let i = 0; i < count_of_integer_places; i++) {
    for (let ii = 0; ii < digits.length; ii++) {
      const digit = digits[ii];
      const test_start = left + digit;
      let test_base = test_start + "0".repeat(count_of_integer_places - i - 1);
      const test_res = pow_positive(test_base, index);
      const comparison = compare_positive(test_res, rad);
      if (comparison === "=") {
        if (has_imaginary) test_base += "i";
        return out_sign + test_base;
      } else if (comparison === "<") {
        left = test_start;
        break;
      }
    }
  }

  let base = left + ".";

  for (let i = 0; i < max_decimal_digits; i++) {
    let added = false;
    for (let ii = 0; ii < digits.length; ii++) {
      const digit = digits[ii];
      let test_base = base + digit;
      const test_res = pow_positive(test_base, index);
      const comparison = compare_positive(test_res, rad);
      if (comparison === "=") {
        if (has_imaginary) test_base += "i";
        return out_sign + test_base;
      } else if (comparison === "<") {
        base = test_base;
        added = true;
        break;
      }
    }
    if (!added) break;
  }

  if (has_imaginary) base += "i";

  return out_sign + base;
}

module.exports = root;
module.exports["default"] = root;


/***/ }),

/***/ 841:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const ceil = __webpack_require__(8876);
const count_integer_digits = __webpack_require__(9304);
const divide = __webpack_require__(9108);

/**
 * @description returns the number of integer digits for a given nth root
 * @param {*} radicand
 * @param {*} index
 * @returns {String} the number of integer digits
 */
function root_integer_digits(radicand, index) {
  const digits = count_integer_digits(radicand);
  if (digits === "0") return "0";
  return ceil(divide(digits, index, { max_decimal_digits: 1 }));
}

module.exports = root_integer_digits;
module.exports["default"] = root_integer_digits;


/***/ }),

/***/ 5877:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const is_imaginary = __webpack_require__(8219);
const round_rational = __webpack_require__(1170);

function round(n, { digits = 0 } = {}) {
  // in case you pass in a numerical string for digits
  digits = Number(digits);

  if (is_imaginary(n)) {
    return round_rational(n.substring(0, n.length - 1), { digits }) + "i";
  } else {
    return round_rational(n, { digits });
  }
}

module.exports = round;
module.exports["default"] = round;


/***/ }),

/***/ 5764:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const add = __webpack_require__(3954);
const truncate_decimal = __webpack_require__(4403);

// given n is a positive decimal number
const up = ["5", "6", "7", "8", "9"];

function round_last_decimal(n) {
  // will round up to an integer
  if (n.match(/\.9+$/)) {
    return add(truncate_decimal(n), "1");
  }

  // remove + from beginning
  if (n[0] === "+") n = n.substring(1);

  //console.log("rounding:", {n});
  const len = n.length;
  //console.log({len});
  let result = "";

  const last_char = n[n.length - 1];
  //console.log({last_char});

  if (up.includes(last_char)) {
    let i;
    for (i = len - 2; i >= 0; i--) {
      const char = n[i];
      //console.log({char});
      // skip over . or -
      if (char === "." || char === "-") continue;

      const nchar = Number(char) + 1;
      //console.log({nchar});

      if (nchar === 10) {
        result = "0" + result;
        // keep rounding up
      } else {
        result = nchar + result;
        break;
      }
    }
    //console.log({i});
    if (i > 0) result = n.substring(0, i) + result;
  } else {
    result = n.substring(0, len - 1);
  }

  if (result[result.length - 1] === ".") result = result.substring(0, result.length - 1);

  // remove trailing zeros in decimal number
  // 0.50 => 0.5
  if (result.indexOf(".") > -1) result = result.replace(/0+$/, "");

  return result;
}

module.exports = round_last_decimal;
module.exports["default"] = round_last_decimal;


/***/ }),

/***/ 1170:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const clean = __webpack_require__(6468);
const count_decimal_digits = __webpack_require__(6859);
const absolute = __webpack_require__(6752);
const is_negative = __webpack_require__(6755);
const round_last_decimal = __webpack_require__(5764);

const UP = ["5", "6", "7", "8", "9"];

function round_rational(n, { digits = 0 } = { digits: 0 }) {
  n = clean(n);

  const orig = n;

  const sign = is_negative(n) ? "-" : "";

  // convert to positive because
  // round_last_decimal only works on positive decimals
  n = absolute(n);

  const idec = n.indexOf(".");

  // integer, already rounded
  if (idec === -1) return orig;

  // decimal, but already rounded enough
  if (count_decimal_digits(n) <= digits) return orig;

  const v = n[idec + digits + 1];

  if (UP.includes(v)) {
    const clip = n.substring(0, idec + digits + 2);
    return sign + round_last_decimal(clip);
  } else if (digits === 0) {
    return sign + n.substring(0, idec);
  } else {
    const clip = n.substring(0, idec + digits + 1);
    return sign + clip;
  }
}

module.exports = round_rational;
module.exports["default"] = round_rational;


/***/ }),

/***/ 9748:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const is_zero = __webpack_require__(8534);
const sign_nonzero = __webpack_require__(4542);

function sign(n) {
  return is_zero(n) ? "" : sign_nonzero(n);
}

module.exports = sign;
module.exports["default"] = sign;


/***/ }),

/***/ 4542:
/***/ ((module) => {

"use strict";


// assume n is not zero
function sign_nonzero(n) {
  return n[0] === "-" ? "-" : "+";
}

module.exports = sign_nonzero;
module.exports["default"] = sign_nonzero;


/***/ }),

/***/ 6723:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const divide = __webpack_require__(9108);
const is_even = __webpack_require__(3036);
const min = __webpack_require__(3905);
const primes = __webpack_require__(8673);

function simplify_fraction(numerator, denominator) {
  // divide by prime numbers up to 1000
  const digits = primes("2", min(["1000", denominator, denominator]));

  // shave off excess zeros
  while (numerator.endsWith("0") && denominator.endsWith("0")) {
    numerator = numerator.substring(0, numerator.length - 1);
    denominator = denominator.substring(0, denominator.length - 1);
  }

  while (is_even(numerator) && is_even(denominator)) {
    numerator = divide(numerator, "2");
    denominator = divide(denominator, "2");
  }

  let proceed = true;
  while (proceed) {
    proceed = false;

    // attempt to divide numerator and denominator by the same digit
    for (let i = 0; i < digits.length; i++) {
      const digit = digits[i];
      const digit_length = digit.length;
      const max_decimal_digits = digit_length + 1;
      const numerator_divided = divide(numerator, digit, { ellipsis: true, max_decimal_digits });
      if (numerator_divided.indexOf(".") === -1) {
        const denominator_divided = divide(denominator, digit, { ellipsis: true, max_decimal_digits });
        if (denominator_divided.indexOf(".") === -1) {
          // console.log(`both "${numerator} and ${denominator} are evenly divisible by "${digit}"`);
          numerator = numerator_divided;
          denominator = denominator_divided;
          proceed = true;
          break;
        }
      }
    }
  }

  return [numerator, denominator];
}

module.exports = simplify_fraction;
module.exports["default"] = simplify_fraction;


/***/ }),

/***/ 5017:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const add = __webpack_require__(3954);
const is_zero = __webpack_require__(8534);
const square = __webpack_require__(7794);
const multiply_rational = __webpack_require__(5298);
const divide = __webpack_require__(9108);

function sine_radians(n, { steps = 100, max_decimal_digits = 100 } = {}) {
  if (is_zero(n)) return "0";

  let sign = "-";
  let result = n;
  let imax = steps;
  let nsquare = square(n);
  let numerator = n;
  let denominator = "1";
  let f1;
  let f2 = "1";
  for (let i = 0; i < imax; i++) {
    f1 = add(f2, "1");
    f2 = add(f1, "1");

    // same as increasing the power by 2
    numerator = multiply_rational([numerator, nsquare], { max_decimal_digits });
    denominator = multiply_rational([denominator, f1, f2], { max_decimal_digits });
    const diff = divide(numerator, denominator, { max_decimal_digits });
    // console.log({ f1, f2, sign, numerator, denominator, diff });

    result = add(result, sign + diff);

    sign = sign === "-" ? "+" : "-";
  }
  return result;
}

module.exports = sine_radians;
module.exports["default"] = sine_radians;


/***/ }),

/***/ 2023:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const divide = __webpack_require__(9108);
const exp = __webpack_require__(2110);
const sum = __webpack_require__(1566);

function softmax(vector, { max_decimal_digits }) {
  vector = vector.map(n => exp(n, { max_decimal_digits }));

  const total = sum(vector);

  return vector.map(n => divide(n, total, { max_decimal_digits, ellipsis: false }));
}

module.exports = softmax;
module.exports["default"] = softmax;


/***/ }),

/***/ 6125:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const compare = __webpack_require__(4122);

function sort(nums, { direction = "ascending" } = { direction: "ascending" }) {
  const op = direction === "desc" || direction === "descending" ? "<" : ">";
  return nums.sort((a, b) => (compare(a, b) === op ? 1 : -1));
}

module.exports = sort;
module.exports["default"] = sort;


/***/ }),

/***/ 7794:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const pow = __webpack_require__(2555);

/**
 *
 * @param {String} base - numerical string
 * @returns {String} square as a numerical string
 */
function square(base, options) {
  return pow(base, "2", options);
}

module.exports = square;
module.exports["default"] = square;


/***/ }),

/***/ 8329:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const root = __webpack_require__(6353);

function square_root(radicand, options) {
  return root(radicand, "2", options);
}

module.exports = square_root;
module.exports["default"] = square_root;


/***/ }),

/***/ 8945:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const clean = __webpack_require__(6468);
const compare_positive = __webpack_require__(6154);
const is_infinity = __webpack_require__(1128);
const long_addition = __webpack_require__(5590);
const long_subtraction = __webpack_require__(6990);

function subtract(a, b, { infinity_minus_infinity = "NaN" } = {}) {
  a = clean(a);
  b = clean(b);

  const a_is_negative = a[0] === "-";
  const b_is_negative = b[0] === "-";

  const a_is_positive = !a_is_negative;
  const b_is_positive = !b_is_negative;

  const ainf = is_infinity(a);
  const binf = is_infinity(b);

  if (ainf && binf) {
    if (a_is_positive === b_is_positive) {
      return infinity_minus_infinity;
    } else if (a_is_positive) {
      return "Infinity"; // inf - -inf
    } else if (b_is_positive) {
      return "-Infinity"; // -inf - inf
    }
  } else if (ainf) {
    return a;
  } else if (binf) {
    return b_is_positive ? "-Infinity" : "Infinity";
  }

  if (a_is_positive) {
    if (b_is_positive) {
      const comparison = compare_positive(a, b);
      if (comparison === ">") {
        return long_subtraction(a, b);
      } else if (comparison === "<") {
        return "-" + long_subtraction(b, a);
      } else {
        return "0";
      }
    } else {
      return long_addition(a, b.substring(1));
    }
  } else if (b_is_positive) {
    return "-" + long_addition(a.substring(1), b);
  } else {
    a = a.substring(1);
    b = b.substring(1);
    const comparison = compare_positive(a, b);
    if (comparison === ">") {
      return "-" + long_subtraction(a, b);
    } else if (comparison === "<") {
      return long_subtraction(b, a);
    } else {
      return "0";
    }
  }
}

module.exports = subtract;
module.exports["default"] = subtract;


/***/ }),

/***/ 1566:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


const add = __webpack_require__(3954);

function sum(nums) {
  let total = "0";
  // using iterator protocol
  for (let num of nums) {
    total = add(total, num);
  }
  return total;
}

module.exports = sum;
module.exports["default"] = sum;


/***/ }),

/***/ 9503:
/***/ ((module) => {

"use strict";


function truncate(n) {
  const i = n.indexOf(".");
  if (i === -1) return n;
  else return n.substring(0, i);
}

module.exports = truncate;
module.exports["default"] = truncate;


/***/ }),

/***/ 4403:
/***/ ((module) => {

"use strict";


// given n is a decimal number
function truncate_decimal(n) {
  return n.substring(0, n.indexOf("."));
}

module.exports = truncate_decimal;
module.exports["default"] = truncate_decimal;


/***/ }),

/***/ 5267:
/***/ ((module) => {

module.exports = {
  "1": function ({ point }) { const parent = this.data; const index = point[this.d0v0]; return { parent, index, value: parent[index] }; },
  "2": function ({ point }) { const parent = this.data; const index = this.m0v0*point[this.d0v0]+this.m0v1*point[this.d0v1]; return { parent, index, value: parent[index] }; },
  "3": function ({ point }) { const parent = this.data; const index = this.m0v0*point[this.d0v0]+this.m0v1*point[this.d0v1]+this.m0v2*point[this.d0v2]; return { parent, index, value: parent[index] }; },
  "4": function ({ point }) { const parent = this.data; const index = this.m0v0*point[this.d0v0]+this.m0v1*point[this.d0v1]+this.m0v2*point[this.d0v2]+this.m0v3*point[this.d0v3]; return { parent, index, value: parent[index] }; },
  "5": function ({ point }) { const parent = this.data; const index = this.m0v0*point[this.d0v0]+this.m0v1*point[this.d0v1]+this.m0v2*point[this.d0v2]+this.m0v3*point[this.d0v3]+this.m0v4*point[this.d0v4]; return { parent, index, value: parent[index] }; },
  "1,1": function ({ point }) { const parent = this.data[point[this.d0v0]]; const index = point[this.d1v0]; return { parent, index, value: parent[index] }; },
  "1,2": function ({ point }) { const parent = this.data[point[this.d0v0]]; const index = this.m1v0*point[this.d1v0]+this.m1v1*point[this.d1v1]; return { parent, index, value: parent[index] }; },
  "1,3": function ({ point }) { const parent = this.data[point[this.d0v0]]; const index = this.m1v0*point[this.d1v0]+this.m1v1*point[this.d1v1]+this.m1v2*point[this.d1v2]; return { parent, index, value: parent[index] }; },
  "1,4": function ({ point }) { const parent = this.data[point[this.d0v0]]; const index = this.m1v0*point[this.d1v0]+this.m1v1*point[this.d1v1]+this.m1v2*point[this.d1v2]+this.m1v3*point[this.d1v3]; return { parent, index, value: parent[index] }; },
  "1,5": function ({ point }) { const parent = this.data[point[this.d0v0]]; const index = this.m1v0*point[this.d1v0]+this.m1v1*point[this.d1v1]+this.m1v2*point[this.d1v2]+this.m1v3*point[this.d1v3]+this.m1v4*point[this.d1v4]; return { parent, index, value: parent[index] }; },
  "1,1,1": function ({ point }) { const parent = this.data[point[this.d0v0]][point[this.d1v0]]; const index = point[this.d2v0]; return { parent, index, value: parent[index] }; },
  "1,1,2": function ({ point }) { const parent = this.data[point[this.d0v0]][point[this.d1v0]]; const index = this.m2v0*point[this.d2v0]+this.m2v1*point[this.d2v1]; return { parent, index, value: parent[index] }; },
  "1,1,3": function ({ point }) { const parent = this.data[point[this.d0v0]][point[this.d1v0]]; const index = this.m2v0*point[this.d2v0]+this.m2v1*point[this.d2v1]+this.m2v2*point[this.d2v2]; return { parent, index, value: parent[index] }; },
  "1,1,4": function ({ point }) { const parent = this.data[point[this.d0v0]][point[this.d1v0]]; const index = this.m2v0*point[this.d2v0]+this.m2v1*point[this.d2v1]+this.m2v2*point[this.d2v2]+this.m2v3*point[this.d2v3]; return { parent, index, value: parent[index] }; },
  "1,1,5": function ({ point }) { const parent = this.data[point[this.d0v0]][point[this.d1v0]]; const index = this.m2v0*point[this.d2v0]+this.m2v1*point[this.d2v1]+this.m2v2*point[this.d2v2]+this.m2v3*point[this.d2v3]+this.m2v4*point[this.d2v4]; return { parent, index, value: parent[index] }; },
  "1,1,1,1": function ({ point }) { const parent = this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]]; const index = point[this.d3v0]; return { parent, index, value: parent[index] }; },
  "1,1,1,2": function ({ point }) { const parent = this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]]; const index = this.m3v0*point[this.d3v0]+this.m3v1*point[this.d3v1]; return { parent, index, value: parent[index] }; },
  "1,1,1,3": function ({ point }) { const parent = this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]]; const index = this.m3v0*point[this.d3v0]+this.m3v1*point[this.d3v1]+this.m3v2*point[this.d3v2]; return { parent, index, value: parent[index] }; },
  "1,1,1,4": function ({ point }) { const parent = this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]]; const index = this.m3v0*point[this.d3v0]+this.m3v1*point[this.d3v1]+this.m3v2*point[this.d3v2]+this.m3v3*point[this.d3v3]; return { parent, index, value: parent[index] }; },
  "1,1,1,5": function ({ point }) { const parent = this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]]; const index = this.m3v0*point[this.d3v0]+this.m3v1*point[this.d3v1]+this.m3v2*point[this.d3v2]+this.m3v3*point[this.d3v3]+this.m3v4*point[this.d3v4]; return { parent, index, value: parent[index] }; },
  "1,1,1,1,1": function ({ point }) { const parent = this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]][point[this.d3v0]]; const index = point[this.d4v0]; return { parent, index, value: parent[index] }; },
  "1,1,1,1,2": function ({ point }) { const parent = this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]][point[this.d3v0]]; const index = this.m4v0*point[this.d4v0]+this.m4v1*point[this.d4v1]; return { parent, index, value: parent[index] }; },
  "1,1,1,1,3": function ({ point }) { const parent = this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]][point[this.d3v0]]; const index = this.m4v0*point[this.d4v0]+this.m4v1*point[this.d4v1]+this.m4v2*point[this.d4v2]; return { parent, index, value: parent[index] }; },
  "1,1,1,1,4": function ({ point }) { const parent = this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]][point[this.d3v0]]; const index = this.m4v0*point[this.d4v0]+this.m4v1*point[this.d4v1]+this.m4v2*point[this.d4v2]+this.m4v3*point[this.d4v3]; return { parent, index, value: parent[index] }; },
  "1,1,1,1,5": function ({ point }) { const parent = this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]][point[this.d3v0]]; const index = this.m4v0*point[this.d4v0]+this.m4v1*point[this.d4v1]+this.m4v2*point[this.d4v2]+this.m4v3*point[this.d4v3]+this.m4v4*point[this.d4v4]; return { parent, index, value: parent[index] }; }
}

/***/ }),

/***/ 5206:
/***/ ((module) => {

module.exports = {
  "1": function ({ point, value }) { this.data[point[this.d0v0]] = value; },
  "2": function ({ point, value }) { this.data[this.m0v0*point[this.d0v0]+this.m0v1*point[this.d0v1]] = value; },
  "3": function ({ point, value }) { this.data[this.m0v0*point[this.d0v0]+this.m0v1*point[this.d0v1]+this.m0v2*point[this.d0v2]] = value; },
  "4": function ({ point, value }) { this.data[this.m0v0*point[this.d0v0]+this.m0v1*point[this.d0v1]+this.m0v2*point[this.d0v2]+this.m0v3*point[this.d0v3]] = value; },
  "5": function ({ point, value }) { this.data[this.m0v0*point[this.d0v0]+this.m0v1*point[this.d0v1]+this.m0v2*point[this.d0v2]+this.m0v3*point[this.d0v3]+this.m0v4*point[this.d0v4]] = value; },
  "1,1": function ({ point, value }) { this.data[point[this.d0v0]][point[this.d1v0]] = value; },
  "1,2": function ({ point, value }) { this.data[point[this.d0v0]][this.m1v0*point[this.d1v0]+this.m1v1*point[this.d1v1]] = value; },
  "1,3": function ({ point, value }) { this.data[point[this.d0v0]][this.m1v0*point[this.d1v0]+this.m1v1*point[this.d1v1]+this.m1v2*point[this.d1v2]] = value; },
  "1,4": function ({ point, value }) { this.data[point[this.d0v0]][this.m1v0*point[this.d1v0]+this.m1v1*point[this.d1v1]+this.m1v2*point[this.d1v2]+this.m1v3*point[this.d1v3]] = value; },
  "1,5": function ({ point, value }) { this.data[point[this.d0v0]][this.m1v0*point[this.d1v0]+this.m1v1*point[this.d1v1]+this.m1v2*point[this.d1v2]+this.m1v3*point[this.d1v3]+this.m1v4*point[this.d1v4]] = value; },
  "1,1,1": function ({ point, value }) { this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]] = value; },
  "1,1,2": function ({ point, value }) { this.data[point[this.d0v0]][point[this.d1v0]][this.m2v0*point[this.d2v0]+this.m2v1*point[this.d2v1]] = value; },
  "1,1,3": function ({ point, value }) { this.data[point[this.d0v0]][point[this.d1v0]][this.m2v0*point[this.d2v0]+this.m2v1*point[this.d2v1]+this.m2v2*point[this.d2v2]] = value; },
  "1,1,4": function ({ point, value }) { this.data[point[this.d0v0]][point[this.d1v0]][this.m2v0*point[this.d2v0]+this.m2v1*point[this.d2v1]+this.m2v2*point[this.d2v2]+this.m2v3*point[this.d2v3]] = value; },
  "1,1,5": function ({ point, value }) { this.data[point[this.d0v0]][point[this.d1v0]][this.m2v0*point[this.d2v0]+this.m2v1*point[this.d2v1]+this.m2v2*point[this.d2v2]+this.m2v3*point[this.d2v3]+this.m2v4*point[this.d2v4]] = value; },
  "1,1,1,1": function ({ point, value }) { this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]][point[this.d3v0]] = value; },
  "1,1,1,2": function ({ point, value }) { this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]][this.m3v0*point[this.d3v0]+this.m3v1*point[this.d3v1]] = value; },
  "1,1,1,3": function ({ point, value }) { this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]][this.m3v0*point[this.d3v0]+this.m3v1*point[this.d3v1]+this.m3v2*point[this.d3v2]] = value; },
  "1,1,1,4": function ({ point, value }) { this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]][this.m3v0*point[this.d3v0]+this.m3v1*point[this.d3v1]+this.m3v2*point[this.d3v2]+this.m3v3*point[this.d3v3]] = value; },
  "1,1,1,5": function ({ point, value }) { this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]][this.m3v0*point[this.d3v0]+this.m3v1*point[this.d3v1]+this.m3v2*point[this.d3v2]+this.m3v3*point[this.d3v3]+this.m3v4*point[this.d3v4]] = value; },
  "1,1,1,1,1": function ({ point, value }) { this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]][point[this.d3v0]][point[this.d4v0]] = value; },
  "1,1,1,1,2": function ({ point, value }) { this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]][point[this.d3v0]][this.m4v0*point[this.d4v0]+this.m4v1*point[this.d4v1]] = value; },
  "1,1,1,1,3": function ({ point, value }) { this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]][point[this.d3v0]][this.m4v0*point[this.d4v0]+this.m4v1*point[this.d4v1]+this.m4v2*point[this.d4v2]] = value; },
  "1,1,1,1,4": function ({ point, value }) { this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]][point[this.d3v0]][this.m4v0*point[this.d4v0]+this.m4v1*point[this.d4v1]+this.m4v2*point[this.d4v2]+this.m4v3*point[this.d4v3]] = value; },
  "1,1,1,1,5": function ({ point, value }) { this.data[point[this.d0v0]][point[this.d1v0]][point[this.d2v0]][point[this.d3v0]][this.m4v0*point[this.d4v0]+this.m4v1*point[this.d4v1]+this.m4v2*point[this.d4v2]+this.m4v3*point[this.d4v3]+this.m4v4*point[this.d4v4]] = value; }
}

/***/ }),

/***/ 4307:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const layoutCache = {};
const { wrapNextFunction } = __webpack_require__(8060);
const preparedSelectFunctions = __webpack_require__(5267);
const preparedUpdateFunctions = __webpack_require__(5206);

const ARRAY_TYPES = {
  Array,
  Int8Array,
  Uint8Array,
  Uint8ClampedArray,
  Int16Array,
  Uint16Array,
  Float32Array,
  Float64Array
};

try {
  ARRAY_TYPES.BigInt64Array = BigInt64Array;
  ARRAY_TYPES.BigUint64Array = BigUint64Array;
} catch (error) {
  // pass
}

function parseDimensions(str) {
  const dims = {};
  const re = /[A-Za-z]+/g;
  let arr;
  while ((arr = re.exec(str)) !== null) {
    const [match] = arr;
    dims[match] = {
      name: match
    };
  }
  return dims;
}

function normalizeLayoutString(str) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let i = 0;
  return str.replace(/[A-Za-z]+/g, () => alphabet[i++]);
}

const parseVectors = str => str.match(/\[[^\]]+\]/g);

// "[row]" to "row"
const removeBraces = str => (str.startsWith("[") && str.endsWith("]") ? str.substring(1, str.length - 1) : str);

// "(row)" to "row"
const removeParentheses = str => (str.startsWith("(") && str.endsWith(")") ? str.substring(1, str.length - 1) : str);

// sort of like parsing a CSV except instead of " for quotes use (
const matchSequences = str => str.match(/(\(.*?\)|[^\(,\s]+)(?=\s*,|\s*$)/g);

const parseSequences = str => {
  // unwrap [...]
  str = removeBraces(str);

  // unwrap (...)
  str = removeParentheses(str);

  const seqs = matchSequences(str);

  if (seqs.length === 1) {
    return {
      type: "Vector",
      dim: seqs[0]
    };
  } else {
    return {
      type: "Matrix",
      parts: seqs.map(parseSequences)
    };
  }
};

function checkValidity(str) {
  const invalid = str.match(/[^ A-Za-z,\[\]]/g);
  if (invalid) {
    throw new Error("The following invalid characters were used: " + invalid.map(c => `"${c}"`).join(", "));
  } else {
    return true;
  }
}

function parse(str, { useLayoutCache = true } = { useLayoutCache: true }) {
  if (useLayoutCache && str in layoutCache) return layoutCache[str];

  checkValidity(str);

  const vectors = parseVectors(str);
  const dims = vectors.map(parseSequences);
  const result = {
    type: "Layout",
    summary: dims.map(it => (it.type === "Matrix" ? it.parts.length : 1)),
    dims
  };

  if (useLayoutCache) layoutCache[str] = result;

  return result;
}

function update({ useLayoutCache = true, data, layout, point, sizes = {}, value }) {
  if (typeof layout === "string") layout = parse(layout, { useLayoutCache });

  const { dims } = layout;
  for (let idim = 0; idim < dims.length; idim++) {
    const last = idim === dims.length - 1;
    const arr = dims[idim];
    let offset;
    if (arr.type === "Vector") {
      offset = point[arr.dim];
    } else {
      // arr.type assumed to be "Matrix"
      const { parts } = arr;
      offset = 0;
      let multiplier = 1;
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i];
        const { dim } = part;
        offset += multiplier * point[dim];
        if (i > 0) {
          if (!(dim in sizes)) throw new Error(`you cannot calculate the location without knowing the size of the "${dim}" dimension.`);
          multiplier *= sizes[dim];
        }
      }
    }
    if (last) {
      data[offset] = value;
    } else {
      data = data[offset];
    }
  }
}

function prepareUpdate({ useLayoutCache = true, data, layout, sizes = {} }) {
  if (typeof layout === "string") {
    layout = parse(layout, { useLayoutCache });
  }
  const { dims } = layout;
  const numDims = dims.length;
  const multipliers = getMultipliers({ useLayoutCache, layout, sizes });
  const end = numDims - 1;

  const key = layout.summary.toString();
  if (key in preparedUpdateFunctions) {
    const _this = { data };
    layout.dims.map((it, depth) => {
      if (it.type === "Vector") {
        _this[`d${depth}v0`] = it.dim;
      } else if (it.type === "Matrix") {
        it.parts.forEach((part, ipart) => {
          _this[`d${depth}v${ipart}`] = part.dim;
          _this[`m${depth}v${ipart}`] = multipliers[part.dim];
        });
      }
    });

    return preparedUpdateFunctions[key].bind(_this);
  }

  return ({ point, value }) => {
    let currentData = data;
    for (let idim = 0; idim < numDims; idim++) {
      const last = idim === end;
      const arr = dims[idim];
      let offset;
      if (arr.type === "Vector") {
        offset = point[arr.dim];
      } else {
        // arr.type assumed to be "Matrix"
        offset = arr.parts.reduce((acc, { dim }) => acc + multipliers[dim] * point[dim], 0);
      }
      if (last) {
        currentData[offset] = value;
      } else {
        currentData = currentData[offset];
      }
    }
  };
}

function iterClip({ data, layout, order, rect = {}, sizes = {}, useLayoutCache = true }) {
  if (!data) throw new Error("[xdim] must specify data");
  if (!layout) throw new Error("[xdim] must specify layout");
  const points = iterPoints({ order, sizes, rect });
  return wrapNextFunction(function next() {
    const { value: point, done } = points.next();
    if (done) {
      return { done: true };
    } else {
      const { value } = select({ data, layout, point, sizes, useLayoutCache });
      return { done: false, value };
    }
  });
}

function validateRect({ rect = {} }) {
  if (rect) {
    for (let key in rect) {
      const value = rect[key];
      if (value.length !== 2) throw new Error(`[xdim] uh oh. invalid hyper-rectangle`);
      const [start, end] = value;
      if (start > end) throw new Error(`[xdim] uh oh. invalid range for "${key}".  Start of ${start} can't be greater than end of ${end}.`);
      if (start < 0) throw new Error(`[xdim] uh oh. invalid hyper-rectangle with start ${start}`);
    }
  }
}

function clip({ useLayoutCache = true, data, layout, rect, sizes = {}, flat = false, validate = true }) {
  if (validate) validateRect({ rect });

  if (typeof layout === "string") layout = parse(layout, { useLayoutCache });

  let datas = [data];

  layout.dims.forEach(arr => {
    let new_datas = [];
    datas.forEach(data => {
      if (arr.type === "Vector") {
        const [start, end] = rect[arr.dim];
        new_datas = new_datas.concat(data.slice(start, end + 1));
      } else {
        // only 2 types so must be arr.type === "Matrix"
        const { parts } = arr;
        let offsets = [0];
        let multiplier = 1;
        for (let i = parts.length - 1; i >= 0; i--) {
          const part = parts[i];
          // assume part.type === "Vector"
          const { dim } = part;
          const [start, end] = rect[dim];
          const new_offsets = [];
          for (let n = start; n <= end; n++) {
            offsets.forEach(offset => {
              new_offsets.push(offset + multiplier * n);
            });
          }
          offsets = new_offsets;
          multiplier *= sizes[dim];
        }
        offsets.forEach(offset => {
          new_datas.push(data[offset]);
        });
      }
    });
    datas = new_datas;
  });

  if (flat) {
    return {
      data: datas
    };
  }

  // prepareResult
  const out_sizes = Object.fromEntries(Object.entries(rect).map(([dim, [start, end]]) => [dim, end - start + 1]));

  const { data: out_data } = prepareData({
    layout,
    sizes: out_sizes
  });

  const max_depth = layout.dims.length;

  const step = (arr, depth) => {
    if (depth === max_depth) {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = datas.shift();
      }
    } else {
      arr.forEach(sub => step(sub, depth + 1));
    }
  };
  step(out_data, 1);

  return { data: out_data };
}

function getMultipliers({ useLayoutCache = true, layout, sizes }) {
  if (typeof layout === "string") {
    layout = parse(layout, { useLayoutCache });
  }
  const { dims } = layout;
  const numDims = dims.length;
  let multipliers = {};
  for (let idim = 0; idim < numDims; idim++) {
    const arr = dims[idim];
    if (arr.type === "Vector") {
      multipliers[arr.dim] = 1;
    } else {
      // arr.type assumed to be "Matrix"
      const { parts } = arr;
      let multiplier = 1;
      for (let i = parts.length - 1; i >= 0; i--) {
        const { dim } = parts[i];
        multipliers[dim] = multiplier;
        multiplier *= sizes[parts[i].dim];
      }
    }
  }
  return multipliers;
}

function prepareSelect({ useLayoutCache = true, data, layout, sizes = {} }) {
  if (typeof layout === "string") {
    layout = parse(layout, { useLayoutCache });
  }
  const { dims } = layout;
  const numDims = dims.length;
  const multipliers = getMultipliers({ useLayoutCache, layout, sizes });
  const end = numDims - 1;

  const key = layout.summary.toString();
  if (key in preparedSelectFunctions) {
    const _this = { data };
    layout.dims.map((it, depth) => {
      if (it.type === "Vector") {
        _this[`d${depth}v0`] = it.dim;
      } else if (it.type === "Matrix") {
        it.parts.forEach((part, ipart) => {
          _this[`d${depth}v${ipart}`] = part.dim;
          _this[`m${depth}v${ipart}`] = multipliers[part.dim];
        });
      }
    });

    return preparedSelectFunctions[key].bind(_this);
  }

  return ({ point }) => {
    let currentData = data;
    for (let idim = 0; idim < numDims; idim++) {
      const last = idim === end;
      const arr = dims[idim];
      let offset;
      if (arr.type === "Vector") {
        offset = point[arr.dim];
      } else {
        // arr.type assumed to be "Matrix"
        offset = arr.parts.reduce((acc, { dim }) => acc + multipliers[dim] * point[dim], 0);
      }
      if (last) {
        return {
          index: offset,
          parent: currentData,
          value: currentData[offset]
        };
      } else {
        currentData = currentData[offset];
      }
    }
  };
}

function select({ useLayoutCache = true, data, layout, point, sizes = {} }) {
  // converts layout expression to a layout object
  if (typeof layout === "string") {
    layout = parse(layout, { useLayoutCache });
  }

  let parent;
  let index;
  let value = data;
  // dims are arrays
  const { dims } = layout;
  const len = dims.length;
  for (let idim = 0; idim < len; idim++) {
    const arr = dims[idim];
    if (arr.type === "Vector") {
      const i = point[arr.dim];
      parent = value;
      index = i;
      value = value[i];
    } else {
      // only 2 types so must be a Matrix
      const { parts } = arr;
      let offset = 0;
      let multiplier = 1;
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i];
        if (part.type === "Vector") {
          const { dim } = part;
          offset += multiplier * point[dim];
          if (i > 0) {
            if (!(dim in sizes)) throw new Error(`you cannot calculate the location without knowing the size of the "${dim}" dimension.`);
            multiplier *= sizes[dim];
          }
        }
      }
      parent = value;
      index = offset;
      value = value[offset];
    }
  }

  return { index, value, parent };
}

// add dimensions to an array until the limit reaches zero
function addDims({ arr, fill = undefined, lens, arrayTypes }) {
  // no new dimensions to add
  if (lens.length === 0) return arr;

  const len = lens[0];
  if (lens.length === 1) {
    const lastArrayType = arrayTypes ? arrayTypes[arrayTypes.length - 1] : "Array";
    for (let i = 0; i < arr.length; i++) {
      arr[i] = new ARRAY_TYPES[lastArrayType](len).fill(fill);
    }
  } else {
    for (let i = 0; i < arr.length; i++) {
      const sub = new Array(len).fill(fill);
      arr[i] = sub;
      addDims({ arr: sub, fill, lens: lens.slice(1), arrayTypes });
    }
  }
  return arr;
}

// to-do: maybe only call fill if not undefined or default typed array value?
function createMatrix({ fill = undefined, shape, arrayTypes }) {
  const len = shape[0];
  if (shape.length === 1) {
    if (Array.isArray(arrayTypes) && arrayTypes.length !== 1) throw new Error("[xdim] shape and arrayTypes have different lengths");
    const arrayType = Array.isArray(arrayTypes) ? arrayTypes[0] : "Array";
    return new ARRAY_TYPES[arrayType](len).fill(fill);
  }
  const arr = new Array(len).fill(fill);
  return addDims({ arr, fill, lens: shape.slice(1), arrayTypes });
}

// generates an in-memory data structure to hold the data
function prepareData({ fill = undefined, layout, useLayoutCache = true, sizes, arrayTypes }) {
  if (typeof layout === "string") layout = parse(layout, { useLayoutCache });

  // console.log("layout:", layout);
  const shape = layout.dims.map(it => {
    if (it.type === "Vector") {
      return sizes[it.dim];
    } else if (it.type === "Matrix") {
      return it.parts.reduce((total, part) => {
        if (!(part.dim in sizes)) throw new Error(`[xdim] could not find "${part.dim}" in sizes: { ${Object.keys(sizes).join(", ")} }`);
        return total * sizes[part.dim];
      }, 1);
    }
  });

  const data = createMatrix({ fill, shape, arrayTypes });

  return { data, shape, arrayTypes };
}

// assume positive step
function iterRange({ start = 0, end = 100 }) {
  let i = start - 1;
  end = end + 1;
  return wrapNextFunction(function next() {
    i++;
    if (i === end) {
      return { done: true };
    } else {
      return { done: false, value: i };
    }
  });
}

// iterate over all the points, saving memory vs array
function iterPoints({ order, sizes, rect = {} }) {
  // names sorted by shortest dimension to longest dimension
  const names = Array.isArray(order) ? order : Object.keys(sizes).sort((a, b) => sizes[a] - sizes[b]);

  const iters = new Array(names.length);
  const current = {};
  for (let i = 0; i < names.length - 1; i++) {
    const name = names[i];
    const [start, end] = rect[name] || [0, sizes[name] - 1];
    iters[i] = iterRange({ start: start + 1, end });
    current[name] = start;
  }
  const lastName = names[names.length - 1];
  const [start, end] = rect[lastName] || [0, sizes[lastName] - 1];
  iters[iters.length - 1] = iterRange({ start: start, end });
  current[lastName] = start - 1;

  // permutate
  return wrapNextFunction(function next() {
    for (let i = iters.length - 1; i >= 0; i--) {
      const { value, done } = iters[i].next();

      if (done) {
        if (i === 0) {
          // we have exhausted all of the permutations
          return { done: true };
        }
      } else {
        // add iters for the remaining dims
        for (let ii = i + 1; ii < iters.length; ii++) {
          const nameii = names[ii];
          const [start, end] = rect[nameii] || [0, sizes[nameii] - 1];
          iters[ii] = iterRange({ start: start + 1, end });
          current[nameii] = start;
        }

        current[names[i]] = value;

        return { value: current, done: false };
      }
    }
  });
}

function transform({ data, fill = undefined, from, to, sizes, useLayoutCache = true }) {
  if (typeof from === "string") from = parse(from, { useLayoutCache });
  if (typeof to === "string") to = parse(to, { useLayoutCache });

  const { data: out_data } = prepareData({ fill, layout: to, sizes });

  const update = prepareUpdate({
    useLayoutCache,
    data: out_data,
    layout: to,
    sizes
  });

  const points = iterPoints({ sizes });

  for (point of points) {
    const { value } = select({
      data,
      layout: from,
      point,
      sizes
    });

    // insert into new frame
    update({
      point,
      value
    });
  }

  return { data: out_data };
}

module.exports = {
  addDims,
  checkValidity,
  createMatrix,
  iterClip,
  iterRange,
  iterPoints,
  matchSequences,
  parse,
  parseDimensions,
  parseSequences,
  parseVectors,
  prepareData,
  prepareSelect,
  prepareUpdate,
  removeBraces,
  removeParentheses,
  select,
  transform,
  update,
  clip,
  validateRect
};


/***/ }),

/***/ 2634:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 1677:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 76:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 5248:
/***/ (() => {

/* (ignored) */

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".georaster.browser.bundle.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/harmony module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.hmd = (module) => {
/******/ 			module = Object.create(module);
/******/ 			if (!module.children) module.children = [];
/******/ 			Object.defineProperty(module, 'exports', {
/******/ 				enumerable: true,
/******/ 				set: () => {
/******/ 					throw new Error('ES Modules may not assign module.exports or exports.*, Use ESM export syntax, instead: ' + module.id);
/******/ 				}
/******/ 			});
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		var inProgress = {};
/******/ 		var dataWebpackPrefix = "GeoRaster:";
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key, chunkId) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.setAttribute("data-webpack", dataWebpackPrefix + key);
/******/ 		
/******/ 				script.src = url;
/******/ 			}
/******/ 			inProgress[url] = [done];
/******/ 			var onScriptComplete = (prev, event) => {
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode && script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach((fn) => (fn(event)));
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
/******/ 			script.onerror = onScriptComplete.bind(null, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(null, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/node module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.nmd = (module) => {
/******/ 			module.paths = [];
/******/ 			if (!module.children) module.children = [];
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript)
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && (!scriptUrl || !/^http(s?):/.test(scriptUrl))) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			792: 0
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				var installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 				if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 					// a Promise means "currently loading".
/******/ 					if(installedChunkData) {
/******/ 						promises.push(installedChunkData[2]);
/******/ 					} else {
/******/ 						if(true) { // all chunks have JS
/******/ 							// setup Promise in chunk cache
/******/ 							var promise = new Promise((resolve, reject) => (installedChunkData = installedChunks[chunkId] = [resolve, reject]));
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										var realSrc = event && event.target && event.target.src;
/******/ 										error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										installedChunkData[1](error);
/******/ 									}
/******/ 								}
/******/ 							};
/******/ 							__webpack_require__.l(url, loadingEnded, "chunk-" + chunkId, chunkId);
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 		
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = Object(typeof self !== 'undefined' ? self : this)["webpackChunkGeoRaster"] = Object(typeof self !== 'undefined' ? self : this)["webpackChunkGeoRaster"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	__webpack_require__(9251);
/******/ 	var __webpack_exports__ = __webpack_require__(4617);
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
});