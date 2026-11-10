// constants
const OPENMPT_MODULE_RENDER_STEREOSEPARATION_PERCENT = 2
const OPENMPT_MODULE_RENDER_INTERPOLATIONFILTER_LENGTH = 3
const OPENMPT_SUPPORTED_EXTENSIONS = [
  'mptm', 'mod', 's3m', 'xm', 'it', '667', '669', 'amf', 'ams', 'c67', 'cba', 'dbm', 'digi', 'dmf',
  'dsm', 'dsym', 'dtm', 'etx', 'far', 'fc', 'fc13', 'fc14', 'fmt', 'fst', 'ftm', 'imf', 'ims', 'ice',
  'j2b', 'm15', 'mdl', 'med', 'mms', 'mt2', 'mtm', 'mus', 'nst', 'okt', 'plm', 'psm', 'pt36', 'ptm',
  'puma', 'rtm', 'sfx', 'sfx2', 'smod', 'st26', 'stk', 'stm', 'stx', 'stp', 'symmod', 'tcb', 'gmc',
  'gtk', 'gt2', 'ult', 'unic', 'wow', 'xmf', 'gdm', 'mo3', 'oxm', 'umx', 'xpk', 'ppm', 'mmcmp'
];

// audio context
var ChiptuneAudioContext = window['AudioContext'] || window['webkitAudioContext'];

function getLibopenmptHeapU8() {
  return globalThis.HEAPU8 || (libopenmpt && libopenmpt.HEAPU8) || null;
}

function getLibopenmptHeapF32() {
  if (globalThis.HEAPF32) return globalThis.HEAPF32;
  if (libopenmpt && libopenmpt.HEAPF32) return libopenmpt.HEAPF32;
  return null;
}

function getLibopenmptFloatView(ptr, length) {
  const heap = getLibopenmptHeapU8();
  if (!heap || ptr === 0 || ptr == null || !Number.isFinite(length) || length <= 0) {
    return new Float32Array(0);
  }
  return new Float32Array(heap.buffer, ptr, length);
}

function getLibopenmptUtf8ToString() {
  if (globalThis.UTF8ToString) return globalThis.UTF8ToString.bind(globalThis);
  if (libopenmpt && libopenmpt.UTF8ToString) return libopenmpt.UTF8ToString.bind(libopenmpt);
  return function(ptr, maxBytesToRead, ignoreNul) {
    if (!ptr) return '';
    const heap = getLibopenmptHeapU8();
    if (!heap) return '';
    const max = maxBytesToRead ? maxBytesToRead : heap.length - ptr;
    let end = ptr;
    while (end < heap.length && end < ptr + max && (ignoreNul || heap[end] !== 0)) end++;
    return new TextDecoder().decode(heap.slice(ptr, end));
  };
}

function writeAsciiToMemory(string, pointer) {
  if (typeof globalThis.writeAsciiToMemory === 'function' && globalThis.writeAsciiToMemory !== writeAsciiToMemory) {
    return globalThis.writeAsciiToMemory(string, pointer);
  }
  if (libopenmpt && typeof libopenmpt.writeAsciiToMemory === 'function' && libopenmpt.writeAsciiToMemory !== writeAsciiToMemory) {
    return libopenmpt.writeAsciiToMemory(string, pointer);
  }
  const heap = getLibopenmptHeapU8();
  if (!heap || pointer === 0 || pointer === null || typeof string === 'undefined') return;
  const bytes = new TextEncoder().encode(String(string) + '\0');
  if (pointer + bytes.length > heap.length) return;
  heap.set(bytes, pointer);
}

// config
var ChiptuneJsConfig = function (repeatCount, stereoSeparation, interpolationFilter, context, volume)
{
  this.repeatCount = repeatCount;
  this.stereoSeparation = stereoSeparation;
  this.interpolationFilter = interpolationFilter;
  this.context = context;
  this.volume = volume || 1;
}

ChiptuneJsConfig.prototype.constructor = ChiptuneJsConfig;

// player
var ChiptuneJsPlayer = function (config) {
  this.config = config;
  this.context = config.context || new ChiptuneAudioContext();
  this.currentPlayingNode = null;
  this.handlers = [];
  this.touchLocked = true;
}

ChiptuneJsPlayer.prototype.constructor = ChiptuneJsPlayer;

// event handlers section
ChiptuneJsPlayer.prototype.fireEvent = function (eventName, response) {
  var  handlers = this.handlers;
  if (handlers.length) {
    handlers.forEach(function (handler) {
      if (handler.eventName === eventName) {
        handler.handler(response);
      }
    })
  }
}

ChiptuneJsPlayer.prototype.addHandler = function (eventName, handler) {
  this.handlers.push({eventName: eventName, handler: handler});
}

ChiptuneJsPlayer.prototype.onEnded = function (handler) {
  this.addHandler('onEnded', handler);
}

ChiptuneJsPlayer.prototype.onError = function (handler) {
  this.addHandler('onError', handler);
}

ChiptuneJsPlayer.prototype.getFileExtension = function (filename) {
  if (!filename) {
    return '';
  }

  var trimmed = filename.split('?')[0].split('#')[0];
  var pieces = trimmed.split('.');
  if (pieces.length < 2) {
    return '';
  }

  return pieces.pop().toLowerCase();
};

ChiptuneJsPlayer.prototype.isSupportedExtension = function (filename) {
  var extension = this.getFileExtension(filename);
  if (!extension) {
    return true;
  }

  return OPENMPT_SUPPORTED_EXTENSIONS.indexOf(extension) !== -1;
};

ChiptuneJsPlayer.prototype.validateFileInput = function (filename) {
  if (!this.isSupportedExtension(filename)) {
    var extension = this.getFileExtension(filename);
    this.fireEvent('onError', {
      type: 'unsupportedExtension',
      extension: extension,
      supportedExtensions: OPENMPT_SUPPORTED_EXTENSIONS.slice()
    });
    return false;
  }

  return true;
};

// metadata
ChiptuneJsPlayer.prototype.duration = function() {
  return libopenmpt._openmpt_module_get_duration_seconds(this.currentPlayingNode.modulePtr);
}

ChiptuneJsPlayer.prototype.getCurrentRow = function() {
  return libopenmpt._openmpt_module_get_current_row(this.currentPlayingNode.modulePtr);  
}

ChiptuneJsPlayer.prototype.getCurrentPattern = function() {
  return libopenmpt._openmpt_module_get_current_pattern(this.currentPlayingNode.modulePtr);  
}

ChiptuneJsPlayer.prototype.getCurrentOrder = function() {
  return libopenmpt._openmpt_module_get_current_order(this.currentPlayingNode.modulePtr);  
}

ChiptuneJsPlayer.prototype.getCurrentTime = function () {
  return libopenmpt._openmpt_module_get_position_seconds(this.currentPlayingNode.modulePtr);
};

ChiptuneJsPlayer.prototype.seekTo = function (seconds) {
  return libopenmpt._openmpt_module_set_position_seconds(this.currentPlayingNode.modulePtr, seconds);
};

ChiptuneJsPlayer.prototype.getTotalOrder = function () {
  return libopenmpt._openmpt_module_get_num_orders(this.currentPlayingNode.modulePtr);
};

ChiptuneJsPlayer.prototype.getTotalPatterns = function () {
  return libopenmpt._openmpt_module_get_num_patterns(this.currentPlayingNode.modulePtr);
};

ChiptuneJsPlayer.prototype.metadata = function() {
  if (!this.currentPlayingNode || !this.currentPlayingNode.modulePtr) {
    return {};
  }

  var data = {};
  var utf8ToString = getLibopenmptUtf8ToString();
  var keys = utf8ToString(libopenmpt._openmpt_module_get_metadata_keys(this.currentPlayingNode.modulePtr)).split(';');
  var keyNameBuffer = 0;
  for (var i = 0; i < keys.length; i++) {
    if (!keys[i]) continue;
    keyNameBuffer = libopenmpt._malloc(keys[i].length + 1);
    writeAsciiToMemory(keys[i], keyNameBuffer);
    data[keys[i]] = utf8ToString(libopenmpt._openmpt_module_get_metadata(this.currentPlayingNode.modulePtr, keyNameBuffer));
    libopenmpt._free(keyNameBuffer);
  }
  return data;
}

ChiptuneJsPlayer.prototype.module_ctl_set = function(ctl, value) {
  if (!this.currentPlayingNode || !this.currentPlayingNode.modulePtr) {
    return false;
  }
  return libopenmpt._openmpt_module_ctl_set(this.currentPlayingNode.modulePtr, ctl, value) === 1;
}

ChiptuneJsPlayer.prototype.setVolume = function(volume) {
  if (this.currentPlayingNode) {
    this.currentPlayingNode.volume = volume;
  }
}

// playing, etc
ChiptuneJsPlayer.prototype.unlock = function() {

  var context = this.context;
  if (context && typeof context.resume === 'function' && context.state === 'suspended') {
    context.resume().catch(function() {});
  }

  if (context && context.destination) {
    try {
      var buffer = context.createBuffer(1, 1, 22050);
      var unlockSource = context.createBufferSource();

      unlockSource.buffer = buffer;
      unlockSource.connect(context.destination);
      unlockSource.start(0);
    } catch (err) {
      // ignore: browser may reject an unlock tone when the context is already active
    }
  }

  this.touchLocked = false;
}

ChiptuneJsPlayer.prototype.load = function(input, callback) {

  if (this.touchLocked) {
    this.unlock();
  }

  var player = this;
  var filename = input instanceof File ? input.name : (typeof input === 'string' ? input : '');
  if (!this.validateFileInput(filename)) {
    return false;
  }

  if (input instanceof File) {
    var reader = new FileReader();
    reader.onload = function() {
      return callback(reader.result); // no error
    }.bind(this);
    reader.readAsArrayBuffer(input);
  } else {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', input, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(e) {
      if (xhr.status === 200) {
        return callback(xhr.response); // no error
      } else {
        player.fireEvent('onError', {type: 'onxhr'});
      }
    }.bind(this);
    xhr.onerror = function() {
      player.fireEvent('onError', {type: 'onxhr'});
    };
    xhr.onabort = function() {
      player.fireEvent('onError', {type: 'onxhr'});
    };
    xhr.send();
  }
}

ChiptuneJsPlayer.prototype.play = function(buffer) {
  if (this.touchLocked) {
    this.unlock();
  }

  if (this.context && typeof this.context.resume === 'function' && this.context.state === 'suspended') {
    this.context.resume().catch(function() {});
  }

  this.stop();
  var processNode = this.createLibopenmptNode(buffer, this.config);
  if (processNode == null || processNode.modulePtr === 0) {
    this.fireEvent('onError', {type: 'openmpt'});
    return;
  }

  // set config options on module
  libopenmpt._openmpt_module_set_repeat_count(processNode.modulePtr, this.config.repeatCount);
  libopenmpt._openmpt_module_set_render_param(processNode.modulePtr, OPENMPT_MODULE_RENDER_STEREOSEPARATION_PERCENT, this.config.stereoSeparation);
  libopenmpt._openmpt_module_set_render_param(processNode.modulePtr, OPENMPT_MODULE_RENDER_INTERPOLATIONFILTER_LENGTH, this.config.interpolationFilter);

  this.currentPlayingNode = processNode;
  if (this.context && this.context.destination) {
    processNode.connect(this.context.destination);
  }
}

ChiptuneJsPlayer.prototype.stop = function() {
  if (this.currentPlayingNode != null) {
    this.currentPlayingNode.disconnect();
    this.currentPlayingNode.cleanup();
    this.currentPlayingNode = null;
  }
}

ChiptuneJsPlayer.prototype.togglePause = function() {
	if (this.currentPlayingNode != null) {
    this.currentPlayingNode.togglePause();
  }
}

ChiptuneJsPlayer.prototype.createLibopenmptNode = function(buffer, config) {
  // TODO error checking in this whole function

  var maxFramesPerChunk = 4096;
  var processNode = this.context.createScriptProcessor(2048, 0, 2);
  processNode.config = config;
  processNode.player = this;
  processNode.volume = config.volume;
  var byteArray = new Int8Array(buffer);
  var ptrToFile = libopenmpt._malloc(byteArray.byteLength);
  var heapU8 = getLibopenmptHeapU8();
  if (heapU8) {
    heapU8.set(byteArray, ptrToFile);
  }
  processNode.modulePtr = libopenmpt._openmpt_module_create_from_memory(ptrToFile, byteArray.byteLength, 0, 0, 0);
  libopenmpt._free(ptrToFile);

  if (processNode.modulePtr === 0) {
    processNode.cleanup = function() {};
    processNode.disconnect();
    return null;
  }

  processNode.paused = false;
  processNode.leftBufferPtr  = libopenmpt._malloc(4 * maxFramesPerChunk);
  processNode.rightBufferPtr = libopenmpt._malloc(4 * maxFramesPerChunk);
  processNode.cleanup = function() {
    if (this.modulePtr != 0) {
      libopenmpt._openmpt_module_destroy(this.modulePtr);
      this.modulePtr = 0;
    }
    if (this.leftBufferPtr != 0) {
      libopenmpt._free(this.leftBufferPtr);
      this.leftBufferPtr = 0;
    }
    if (this.rightBufferPtr != 0) {
      libopenmpt._free(this.rightBufferPtr);
      this.rightBufferPtr = 0;
    }
  }
  processNode.stop = function() {
    this.disconnect();
    this.cleanup();
  }
  processNode.pause = function() {
    this.paused = true;
  }
  processNode.unpause = function() {
    this.paused = false;
  }
  processNode.togglePause = function() {
    this.paused = !this.paused;
  }
  processNode.onaudioprocess = function(e) {
    var outputL = e.outputBuffer.getChannelData(0);
    var outputR = e.outputBuffer.getChannelData(1);
    var framesToRender = outputL.length;
    if (this.modulePtr == 0) {
      for (var i = 0; i < framesToRender; ++i) {
        outputL[i] = 0;
        outputR[i] = 0;
      }
      this.disconnect();
      this.cleanup();
      return;
    }
    if (this.paused) {
      for (var i = 0; i < framesToRender; ++i) {
        outputL[i] = 0;
        outputR[i] = 0;
      }
      return;
    }
    var framesRendered = 0;
    var ended = false;
    var error = false;
    while (framesToRender > 0) {
      var framesPerChunk = Math.min(framesToRender, maxFramesPerChunk);
      var actualFramesPerChunk = libopenmpt._openmpt_module_read_float_stereo(this.modulePtr, this.context.sampleRate, framesPerChunk, this.leftBufferPtr, this.rightBufferPtr);
      if (actualFramesPerChunk == 0) {
        ended = true;
        // modulePtr will be 0 on openmpt: error: openmpt_module_read_float_stereo: ERROR: module * not valid or other openmpt error
        error = !this.modulePtr;
      }
      var heapF32 = getLibopenmptHeapF32();
      var rawAudioLeft = heapF32
        ? heapF32.subarray(this.leftBufferPtr >> 2, (this.leftBufferPtr >> 2) + actualFramesPerChunk)
        : getLibopenmptFloatView(this.leftBufferPtr, actualFramesPerChunk);
      var rawAudioRight = heapF32
        ? heapF32.subarray(this.rightBufferPtr >> 2, (this.rightBufferPtr >> 2) + actualFramesPerChunk)
        : getLibopenmptFloatView(this.rightBufferPtr, actualFramesPerChunk);
      for (var i = 0; i < actualFramesPerChunk; ++i) {
        outputL[framesRendered + i] = rawAudioLeft[i] * this.volume;
        outputR[framesRendered + i] = rawAudioRight[i] * this.volume;
      }
      for (var i = actualFramesPerChunk; i < framesPerChunk; ++i) {
        outputL[framesRendered + i] = 0;
        outputR[framesRendered + i] = 0;
      }
      framesToRender -= framesPerChunk;
      framesRendered += framesPerChunk;
    }
    if (ended) {
      this.disconnect();
      this.cleanup();
      error ? processNode.player.fireEvent('onError', {type: 'openmpt'}) : processNode.player.fireEvent('onEnded');
    }
  }
  return processNode;
}

