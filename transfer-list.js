module.exports = function extractTransferList(o) {
  var transferables = [];

  if (isTransferable(o)) {
    return [o];
  }

  traverse(o);

  return transferables;

  function traverse(o) {
    // check if it's an array or object

    // if it's a plain object
    if (typeof o === 'object' && o.constructor === Object) {
      Object.keys(o).forEach(function (key) {
        if (isTransferable(o[key])) {
          transferables.push(o[key]);
        }
        if(isTypedArray(o[key])){
          transferables.push(o[key].buffer);
        }
        if (isTraversable(o[key])) traverse(o[key]);
      })
    }

    // if it's an array
    if (Array.isArray(o)) {
      o.forEach(function (item) {
        if (isTransferable(item)) transferables.push(item);
        if (isTraversable(item)) traverse(item);
      })
    }
  }
}

function isTransferable(o) {
  // @TODO: make sure MessagePort and ImageBitmap exist;
  return o instanceof ArrayBuffer || o instanceof MessagePort || o instanceof ImageBitmap;
}

function isTraversable(o) {
  return Array.isArray(o) || typeof o == 'object' && o.constructor == Object;
}

function isTypedArray(o) {
  // @TODO: complete list
  return o instanceof Float64Array || o instanceof Float32Array || o instanceof Uint8Array || o instanceof Uint16Array;

}
function getTypedArrayClass(o) {
  if (o instanceof Float64Array) return 'Float64Array';

  return 'TypedArray';
  // @TODO: implement other classes
}