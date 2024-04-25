"use strict";
(Object(typeof self !== 'undefined' ? self : this)["webpackChunkGeoRaster"] = Object(typeof self !== 'undefined' ? self : this)["webpackChunkGeoRaster"] || []).push([[578],{

/***/ 9578:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   create: () => (/* binding */ create)
/* harmony export */ });
/* harmony import */ var _compression_index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9594);
/* global globalThis */
/* eslint-disable import/no-mutable-exports */

const worker = globalThis;
worker.addEventListener('message', async e => {
  const {
    id,
    fileDirectory,
    buffer
  } = e.data;
  const decoder = await (0,_compression_index_js__WEBPACK_IMPORTED_MODULE_0__/* .getDecoder */ .f)(fileDirectory);
  const decoded = await decoder.decode(fileDirectory, buffer);
  worker.postMessage({
    decoded,
    id
  }, [decoded]);
});
let create;

/***/ })

}]);