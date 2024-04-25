(Object(typeof self !== 'undefined' ? self : this)["webpackChunkGeoRaster"] = Object(typeof self !== 'undefined' ? self : this)["webpackChunkGeoRaster"] || []).push([[18],{

/***/ 1084:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ LercDecoder),
/* harmony export */   zstd: () => (/* binding */ zstd)
/* harmony export */ });
/* harmony import */ var pako__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1668);
/* harmony import */ var pako__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(pako__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var lerc__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4827);
/* harmony import */ var lerc__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(lerc__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var zstddec__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(5802);
/* harmony import */ var _basedecoder_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(3668);
/* harmony import */ var _globals_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(167);





const zstd = new zstddec__WEBPACK_IMPORTED_MODULE_3__/* .ZSTDDecoder */ .A();
class LercDecoder extends _basedecoder_js__WEBPACK_IMPORTED_MODULE_4__/* ["default"] */ .A {
  constructor(fileDirectory) {
    super();
    this.planarConfiguration = typeof fileDirectory.PlanarConfiguration !== 'undefined' ? fileDirectory.PlanarConfiguration : 1;
    this.samplesPerPixel = typeof fileDirectory.SamplesPerPixel !== 'undefined' ? fileDirectory.SamplesPerPixel : 1;
    this.addCompression = fileDirectory.LercParameters[_globals_js__WEBPACK_IMPORTED_MODULE_2__.LercParameters.AddCompression];
  }
  decodeBlock(buffer) {
    switch (this.addCompression) {
      case _globals_js__WEBPACK_IMPORTED_MODULE_2__.LercAddCompression.None:
        break;
      case _globals_js__WEBPACK_IMPORTED_MODULE_2__.LercAddCompression.Deflate:
        buffer = (0,pako__WEBPACK_IMPORTED_MODULE_0__.inflate)(new Uint8Array(buffer)).buffer; // eslint-disable-line no-param-reassign, prefer-destructuring
        break;
      case _globals_js__WEBPACK_IMPORTED_MODULE_2__.LercAddCompression.Zstandard:
        buffer = zstd.decode(new Uint8Array(buffer)).buffer; // eslint-disable-line no-param-reassign, prefer-destructuring
        break;
      default:
        throw new Error(`Unsupported LERC additional compression method identifier: ${this.addCompression}`);
    }
    const lercResult = lerc__WEBPACK_IMPORTED_MODULE_1___default().decode(buffer, {
      returnPixelInterleavedDims: this.planarConfiguration === 1
    });
    const lercData = lercResult.pixels[0];
    return lercData.buffer;
  }
}

/***/ }),

/***/ 5982:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 9718:
/***/ (() => {

/* (ignored) */

/***/ })

}]);