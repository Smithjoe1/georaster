"use strict";
(Object(typeof self !== 'undefined' ? self : this)["webpackChunkGeoRaster"] = Object(typeof self !== 'undefined' ? self : this)["webpackChunkGeoRaster"] || []).push([[424],{

/***/ 424:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ DeflateDecoder)
/* harmony export */ });
/* harmony import */ var pako__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9969);
/* harmony import */ var _basedecoder_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2132);



class DeflateDecoder extends _basedecoder_js__WEBPACK_IMPORTED_MODULE_1__/* ["default"] */ .A {
  decodeBlock(buffer) {
    return (0,pako__WEBPACK_IMPORTED_MODULE_0__/* .inflate */ .UD)(new Uint8Array(buffer)).buffer;
  }
}


/***/ })

}]);