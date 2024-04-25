"use strict";
(Object(typeof self !== 'undefined' ? self : this)["webpackChunkGeoRaster"] = Object(typeof self !== 'undefined' ? self : this)["webpackChunkGeoRaster"] || []).push([[417],{

/***/ 3417:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ DeflateDecoder)
/* harmony export */ });
/* harmony import */ var pako__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1668);
/* harmony import */ var pako__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(pako__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _basedecoder_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3668);


class DeflateDecoder extends _basedecoder_js__WEBPACK_IMPORTED_MODULE_1__/* ["default"] */ .A {
  decodeBlock(buffer) {
    return (0,pako__WEBPACK_IMPORTED_MODULE_0__.inflate)(new Uint8Array(buffer)).buffer;
  }
}

/***/ })

}]);