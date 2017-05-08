'use strict';

var isPromise = require('is-promise');
var getTransferList = require('./transfer-list');

function parseJsonSafely(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return false;
  }
}

function registerPromiseWorker(callback, useTransferList) {

  function postOutgoingMessage(e, messageId, error, result) {
    function postMessage(msg, transferList) {
      /* istanbul ignore if */
      if (typeof self.postMessage !== 'function') { // service worker
        e.ports[0].postMessage(msg, transferList || []);
      } else { // web worker
        self.postMessage(msg, transferList || []);
      }
    }

    if (error) {
      /* istanbul ignore else */
      if (typeof console !== 'undefined' && 'error' in console) {
        // This is to make errors easier to debug. I think it's important
        // enough to just leave here without giving the user an option
        // to silence it.
        console.error('Worker caught an error:', error);
      }
      postMessage([messageId, {
        message: error.message
      }]);
    } else {
      // @TODO: extract all array buffers from the message
      // and put them in the transferList to transfer ownership
      var transferList = useTransferList ? getTransferList(result) : [];
      postMessage([messageId, null, result, useTransferList], transferList);
    }
  }

  function tryCatchFunc(callback, message) {
    try {
      return {res: callback(message)};
    } catch (e) {
      return {err: e};
    }
  }

  function handleIncomingMessage(e, callback, messageId, message) {

    var result = tryCatchFunc(callback, message);

    if (result.err) {
      postOutgoingMessage(e, messageId, result.err);
    } else if (!isPromise(result.res)) {
      postOutgoingMessage(e, messageId, null, result.res);
    } else {
      result.res.then(function (finalResult) {
        postOutgoingMessage(e, messageId, null, finalResult);
      }, function (finalError) {
        postOutgoingMessage(e, messageId, finalError);
      });
    }
  }

  function onIncomingMessage(e) {
    var payload = parseJsonSafely(e.data);
    if (!payload) {
      // message isn't stringified json; ignore
      return;
    }
    var messageId = payload[0];
    var message = payload[1];

    if (typeof callback !== 'function') {
      postOutgoingMessage(e, messageId, new Error(
        'Please pass a function into register().'));
    } else {
      handleIncomingMessage(e, callback, messageId, message);
    }
  }

  self.addEventListener('message', onIncomingMessage);
}


module.exports = registerPromiseWorker;