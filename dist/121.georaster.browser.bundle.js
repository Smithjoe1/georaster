"use strict";
(Object(typeof self !== 'undefined' ? self : this)["webpackChunkGeoRaster"] = Object(typeof self !== 'undefined' ? self : this)["webpackChunkGeoRaster"] || []).push([[121],{

/***/ 2132:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  A: () => (/* binding */ BaseDecoder)
});

;// CONCATENATED MODULE: ./node_modules/geotiff/dist-module/predictor.js
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
      row[(bytesPerSample * i) + b] = copy[((bytesPerSample - b - 1) * wc) + i];
    }
  }
}

function applyPredictor(block, predictor, width, height, bitsPerSample,
  planarConfiguration) {
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
    if (predictor === 2) { // horizontal prediction
      switch (bitsPerSample[0]) {
        case 8:
          row = new Uint8Array(
            block, i * stride * width * bytesPerSample, stride * width * bytesPerSample,
          );
          break;
        case 16:
          row = new Uint16Array(
            block, i * stride * width * bytesPerSample, stride * width * bytesPerSample / 2,
          );
          break;
        case 32:
          row = new Uint32Array(
            block, i * stride * width * bytesPerSample, stride * width * bytesPerSample / 4,
          );
          break;
        default:
          throw new Error(`Predictor 2 not allowed with ${bitsPerSample[0]} bits per sample.`);
      }
      decodeRowAcc(row, stride, bytesPerSample);
    } else if (predictor === 3) { // horizontal floating point
      row = new Uint8Array(
        block, i * stride * width * bytesPerSample, stride * width * bytesPerSample,
      );
      decodeRowFloatingPoint(row, stride, bytesPerSample);
    }
  }
  return block;
}

;// CONCATENATED MODULE: ./node_modules/geotiff/dist-module/compression/basedecoder.js


class BaseDecoder {
  async decode(fileDirectory, buffer) {
    const decoded = await this.decodeBlock(buffer);
    const predictor = fileDirectory.Predictor || 1;
    if (predictor !== 1) {
      const isTiled = !fileDirectory.StripOffsets;
      const tileWidth = isTiled ? fileDirectory.TileWidth : fileDirectory.ImageWidth;
      const tileHeight = isTiled ? fileDirectory.TileLength : (
        fileDirectory.RowsPerStrip || fileDirectory.ImageLength
      );
      return applyPredictor(
        decoded, predictor, tileWidth, tileHeight, fileDirectory.BitsPerSample,
        fileDirectory.PlanarConfiguration,
      );
    }
    return decoded;
  }
}


/***/ }),

/***/ 5121:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ RawDecoder)
/* harmony export */ });
/* harmony import */ var _basedecoder_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2132);


class RawDecoder extends _basedecoder_js__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .A {
  decodeBlock(buffer) {
    return buffer;
  }
}


/***/ })

}]);