"use strict";
(Object(typeof self !== 'undefined' ? self : this)["webpackChunkGeoRaster"] = Object(typeof self !== 'undefined' ? self : this)["webpackChunkGeoRaster"] || []).push([[913],{

/***/ 7913:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ PackbitsDecoder)
/* harmony export */ });
/* harmony import */ var _basedecoder_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3668);

class PackbitsDecoder extends _basedecoder_js__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .A {
  decodeBlock(buffer) {
    const dataView = new DataView(buffer);
    const out = [];
    for (let i = 0; i < buffer.byteLength; ++i) {
      let header = dataView.getInt8(i);
      if (header < 0) {
        const next = dataView.getUint8(i + 1);
        header = -header;
        for (let j = 0; j <= header; ++j) {
          out.push(next);
        }
        i += 1;
      } else {
        for (let j = 0; j <= header; ++j) {
          out.push(dataView.getUint8(i + j + 1));
        }
        i += header + 1;
      }
    }
    return new Uint8Array(out).buffer;
  }
}

/***/ })

}]);