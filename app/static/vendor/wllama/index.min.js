var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : Symbol.for("Symbol." + name);
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var __await = function(promise, isYieldStar) {
  this[0] = promise;
  this[1] = isYieldStar;
};
var __asyncGenerator = (__this, __arguments, generator) => {
  var resume = (k, v, yes, no) => {
    try {
      var x = generator[k](v), isAwait = (v = x.value) instanceof __await, done = x.done;
      Promise.resolve(isAwait ? v[0] : v).then((y) => isAwait ? resume(k === "return" ? k : "next", v[1] ? { done: y.done, value: y.value } : y, yes, no) : yes({ value: y, done })).catch((e) => resume("throw", e, yes, no));
    } catch (e) {
      no(e);
    }
  }, method = (k) => it[k] = (x) => new Promise((yes, no) => resume(k, x, yes, no)), it = {};
  return generator = generator.apply(__this, __arguments), it[__knownSymbol("asyncIterator")] = () => it, method("next"), method("throw"), method("return"), it;
};
var __forAwait = (obj, it, method) => (it = obj[__knownSymbol("asyncIterator")]) ? it.call(obj) : (obj = obj[__knownSymbol("iterator")](), it = {}, method = (key, fn) => (fn = obj[key]) && (it[key] = (arg) => new Promise((yes, no, done) => (arg = fn.call(obj, arg), done = arg.done, Promise.resolve(arg.value).then((value) => yes({ value, done }), no)))), method("next"), method("return"), it);

// src/glue/messages.ts
var GLUE_VERSION = 1;
var GLUE_MESSAGE_PROTOTYPES = {
  "erro_evt": {
    "name": "erro_evt",
    "structName": "glue_msg_error",
    "className": "GlueMsgError",
    "fields": [
      {
        "type": "str",
        "name": "message",
        "isNullable": false
      }
    ]
  },
  "load_req": {
    "name": "load_req",
    "structName": "glue_msg_load_req",
    "className": "GlueMsgLoadReq",
    "fields": [
      {
        "type": "arr_str",
        "name": "model_paths",
        "isNullable": false
      },
      {
        "type": "str",
        "name": "mmproj_path",
        "isNullable": true
      },
      {
        "type": "bool",
        "name": "n_ctx_auto",
        "isNullable": false
      },
      {
        "type": "bool",
        "name": "use_mmap",
        "isNullable": false
      },
      {
        "type": "bool",
        "name": "use_mlock",
        "isNullable": false
      },
      {
        "type": "int",
        "name": "n_gpu_layers",
        "isNullable": false
      },
      {
        "type": "int",
        "name": "n_ctx",
        "isNullable": false
      },
      {
        "type": "int",
        "name": "n_threads",
        "isNullable": false
      },
      {
        "type": "str",
        "name": "model_alias",
        "isNullable": true
      },
      {
        "type": "int",
        "name": "log_level",
        "isNullable": true
      },
      {
        "type": "bool",
        "name": "embeddings",
        "isNullable": true
      },
      {
        "type": "bool",
        "name": "offload_kqv",
        "isNullable": true
      },
      {
        "type": "int",
        "name": "n_batch",
        "isNullable": true
      },
      {
        "type": "int",
        "name": "n_ubatch",
        "isNullable": true
      },
      {
        "type": "int",
        "name": "n_parallel",
        "isNullable": true
      },
      {
        "type": "str",
        "name": "pooling_type",
        "isNullable": true
      },
      {
        "type": "str",
        "name": "rope_scaling_type",
        "isNullable": true
      },
      {
        "type": "float",
        "name": "rope_freq_base",
        "isNullable": true
      },
      {
        "type": "float",
        "name": "rope_freq_scale",
        "isNullable": true
      },
      {
        "type": "float",
        "name": "yarn_ext_factor",
        "isNullable": true
      },
      {
        "type": "float",
        "name": "yarn_attn_factor",
        "isNullable": true
      },
      {
        "type": "float",
        "name": "yarn_beta_fast",
        "isNullable": true
      },
      {
        "type": "float",
        "name": "yarn_beta_slow",
        "isNullable": true
      },
      {
        "type": "int",
        "name": "yarn_orig_ctx",
        "isNullable": true
      },
      {
        "type": "str",
        "name": "cache_type_k",
        "isNullable": true
      },
      {
        "type": "str",
        "name": "cache_type_v",
        "isNullable": true
      },
      {
        "type": "bool",
        "name": "kv_unified",
        "isNullable": true
      },
      {
        "type": "bool",
        "name": "flash_attn",
        "isNullable": true
      },
      {
        "type": "bool",
        "name": "swa_full",
        "isNullable": true
      },
      {
        "type": "int",
        "name": "n_ctx_checkpoints",
        "isNullable": true
      },
      {
        "type": "int",
        "name": "checkpoint_min_step",
        "isNullable": true
      },
      {
        "type": "str",
        "name": "chat_template",
        "isNullable": true
      },
      {
        "type": "bool",
        "name": "jinja",
        "isNullable": true
      },
      {
        "type": "arr_str",
        "name": "default_template_kwargs_keys",
        "isNullable": true
      },
      {
        "type": "arr_str",
        "name": "default_template_kwargs_vals",
        "isNullable": true
      },
      {
        "type": "bool",
        "name": "reasoning",
        "isNullable": true
      },
      {
        "type": "int",
        "name": "image_min_tokens",
        "isNullable": true
      },
      {
        "type": "int",
        "name": "image_max_tokens",
        "isNullable": true
      },
      {
        "type": "bool",
        "name": "warmup",
        "isNullable": true
      },
      {
        "type": "bool",
        "name": "no_kv_offload",
        "isNullable": true
      },
      {
        "type": "bool",
        "name": "mmproj_offload",
        "isNullable": true
      },
      {
        "type": "bool",
        "name": "cont_batching",
        "isNullable": true
      },
      {
        "type": "int",
        "name": "n_keep",
        "isNullable": true
      },
      {
        "type": "bool",
        "name": "ctx_shift",
        "isNullable": true
      },
      {
        "type": "bool",
        "name": "cache_idle_slots",
        "isNullable": true
      },
      {
        "type": "int",
        "name": "n_cache_reuse",
        "isNullable": true
      },
      {
        "type": "arr_str",
        "name": "lora_paths",
        "isNullable": true
      },
      {
        "type": "arr_float",
        "name": "lora_scales",
        "isNullable": true
      },
      {
        "type": "bool",
        "name": "lora_init_without_apply",
        "isNullable": true
      },
      {
        "type": "str",
        "name": "spec_draft_model",
        "isNullable": true
      },
      {
        "type": "int",
        "name": "spec_draft_ngl",
        "isNullable": true
      },
      {
        "type": "int",
        "name": "spec_draft_n_max",
        "isNullable": true
      },
      {
        "type": "int",
        "name": "spec_draft_n_min",
        "isNullable": true
      },
      {
        "type": "float",
        "name": "spec_draft_p_min",
        "isNullable": true
      },
      {
        "type": "int",
        "name": "spec_draft_threads",
        "isNullable": true
      },
      {
        "type": "int",
        "name": "spec_draft_threads_batch",
        "isNullable": true
      },
      {
        "type": "arr_str",
        "name": "kv_overrides_keys",
        "isNullable": true
      },
      {
        "type": "arr_str",
        "name": "kv_overrides_vals",
        "isNullable": true
      },
      {
        "type": "int",
        "name": "reasoning_budget_tokens",
        "isNullable": true
      },
      {
        "type": "str",
        "name": "reasoning_budget_message",
        "isNullable": true
      },
      {
        "type": "str",
        "name": "reasoning_format",
        "isNullable": true
      },
      {
        "type": "bool",
        "name": "skip_chat_parsing",
        "isNullable": true
      },
      {
        "type": "bool",
        "name": "prefill_assistant",
        "isNullable": true
      }
    ]
  },
  "load_res": {
    "name": "load_res",
    "structName": "glue_msg_load_res",
    "className": "GlueMsgLoadRes",
    "fields": [
      {
        "type": "bool",
        "name": "success",
        "isNullable": false
      },
      {
        "type": "int",
        "name": "n_ctx",
        "isNullable": false
      },
      {
        "type": "int",
        "name": "n_batch",
        "isNullable": false
      },
      {
        "type": "int",
        "name": "n_ubatch",
        "isNullable": false
      },
      {
        "type": "int",
        "name": "n_vocab",
        "isNullable": false
      },
      {
        "type": "int",
        "name": "n_ctx_train",
        "isNullable": false
      },
      {
        "type": "int",
        "name": "n_embd",
        "isNullable": false
      },
      {
        "type": "int",
        "name": "n_layer",
        "isNullable": false
      },
      {
        "type": "arr_str",
        "name": "metadata_key",
        "isNullable": false
      },
      {
        "type": "arr_str",
        "name": "metadata_val",
        "isNullable": false
      },
      {
        "type": "int",
        "name": "token_bos",
        "isNullable": false
      },
      {
        "type": "int",
        "name": "token_eos",
        "isNullable": false
      },
      {
        "type": "int",
        "name": "token_eot",
        "isNullable": false
      },
      {
        "type": "arr_int",
        "name": "list_tokens_eog",
        "isNullable": false
      },
      {
        "type": "bool",
        "name": "add_bos_token",
        "isNullable": false
      },
      {
        "type": "bool",
        "name": "add_eos_token",
        "isNullable": false
      },
      {
        "type": "bool",
        "name": "has_encoder",
        "isNullable": false
      },
      {
        "type": "int",
        "name": "token_decoder_start",
        "isNullable": false
      },
      {
        "type": "str",
        "name": "media_marker",
        "isNullable": false
      },
      {
        "type": "bool",
        "name": "has_image_input",
        "isNullable": false
      },
      {
        "type": "bool",
        "name": "has_audio_input",
        "isNullable": false
      }
    ]
  },
  "cmpl_req": {
    "name": "cmpl_req",
    "structName": "glue_msg_completion_req",
    "className": "GlueMsgCompletionReq",
    "fields": [
      {
        "type": "bool",
        "name": "is_chat",
        "isNullable": false
      },
      {
        "type": "str",
        "name": "data_json",
        "isNullable": false
      },
      {
        "type": "arr_raw",
        "name": "files",
        "isNullable": false
      }
    ]
  },
  "cmpl_res": {
    "name": "cmpl_res",
    "structName": "glue_msg_completion_res",
    "className": "GlueMsgCompletionRes",
    "fields": [
      {
        "type": "bool",
        "name": "success",
        "isNullable": false
      }
    ]
  },
  "embd_req": {
    "name": "embd_req",
    "structName": "glue_msg_embedding_req",
    "className": "GlueMsgEmbeddingReq",
    "fields": [
      {
        "type": "str",
        "name": "data_json",
        "isNullable": false
      },
      {
        "type": "arr_raw",
        "name": "files",
        "isNullable": false
      }
    ]
  },
  "embd_res": {
    "name": "embd_res",
    "structName": "glue_msg_embedding_res",
    "className": "GlueMsgEmbeddingRes",
    "fields": [
      {
        "type": "bool",
        "name": "success",
        "isNullable": false
      }
    ]
  },
  "rrnk_req": {
    "name": "rrnk_req",
    "structName": "glue_msg_rerank_req",
    "className": "GlueMsgRerankReq",
    "fields": [
      {
        "type": "str",
        "name": "data_json",
        "isNullable": false
      }
    ]
  },
  "rrnk_res": {
    "name": "rrnk_res",
    "structName": "glue_msg_rerank_res",
    "className": "GlueMsgRerankRes",
    "fields": [
      {
        "type": "bool",
        "name": "success",
        "isNullable": false
      }
    ]
  },
  "gres_req": {
    "name": "gres_req",
    "structName": "glue_msg_get_result_req",
    "className": "GlueMsgGetResultReq",
    "fields": []
  },
  "gres_res": {
    "name": "gres_res",
    "structName": "glue_msg_get_result_res",
    "className": "GlueMsgGetResultRes",
    "fields": [
      {
        "type": "bool",
        "name": "success",
        "isNullable": false
      },
      {
        "type": "bool",
        "name": "has_more",
        "isNullable": false
      },
      {
        "type": "bool",
        "name": "is_error",
        "isNullable": false
      },
      {
        "type": "str",
        "name": "data_json",
        "isNullable": false
      }
    ]
  }
};

// src/glue/glue.ts
var GLUE_MAGIC = new Uint8Array([71, 76, 85, 69]);
var GLUE_DTYPE_NULL = 0;
var GLUE_DTYPE_BOOL = 1;
var GLUE_DTYPE_INT = 2;
var GLUE_DTYPE_FLOAT = 3;
var GLUE_DTYPE_STRING = 4;
var GLUE_DTYPE_RAW = 5;
var GLUE_DTYPE_ARRAY_BOOL = 6;
var GLUE_DTYPE_ARRAY_INT = 7;
var GLUE_DTYPE_ARRAY_FLOAT = 8;
var GLUE_DTYPE_ARRAY_STRING = 9;
var GLUE_DTYPE_ARRAY_RAW = 10;
var TYPE_MAP = {
  str: GLUE_DTYPE_STRING,
  int: GLUE_DTYPE_INT,
  float: GLUE_DTYPE_FLOAT,
  bool: GLUE_DTYPE_BOOL,
  raw: GLUE_DTYPE_RAW,
  arr_str: GLUE_DTYPE_ARRAY_STRING,
  arr_int: GLUE_DTYPE_ARRAY_INT,
  arr_float: GLUE_DTYPE_ARRAY_FLOAT,
  arr_bool: GLUE_DTYPE_ARRAY_BOOL,
  arr_raw: GLUE_DTYPE_ARRAY_RAW,
  null: GLUE_DTYPE_NULL
};
function glueDeserialize(buf) {
  let offset = 0;
  const view = new DataView(buf.buffer);
  const readUint32 = () => {
    const value = view.getUint32(offset, true);
    offset += 4;
    return value;
  };
  const readInt32 = () => {
    const value = view.getInt32(offset, true);
    offset += 4;
    return value;
  };
  const readFloat = () => {
    const value = view.getFloat32(offset, true);
    offset += 4;
    return value;
  };
  const readBool = () => {
    return readUint32() !== 0;
  };
  const readString = (customLen) => {
    const length = customLen != null ? customLen : readUint32();
    const value = new TextDecoder().decode(buf.slice(offset, offset + length));
    offset += length;
    return value;
  };
  const readRaw = () => {
    const length = readUint32();
    const value = buf.slice(offset, offset + length);
    offset += length;
    return value;
  };
  const readArray = (readItem) => {
    const length = readUint32();
    const value = new Array(length);
    for (let i = 0; i < length; i++) {
      value[i] = readItem();
    }
    return value;
  };
  const readNull = () => null;
  const readField = (field) => {
    switch (field.type) {
      case "str":
        return readString();
      case "int":
        return readInt32();
      case "float":
        return readFloat();
      case "bool":
        return readBool();
      case "raw":
        return readRaw();
      case "arr_str":
        return readArray(readString);
      case "arr_int":
        return readArray(readInt32);
      case "arr_float":
        return readArray(readFloat);
      case "arr_bool":
        return readArray(readBool);
      case "arr_raw":
        return readArray(readRaw);
      case "null":
        return readNull();
    }
  };
  const magicValid = buf[0] === GLUE_MAGIC[0] && buf[1] === GLUE_MAGIC[1] && buf[2] === GLUE_MAGIC[2] && buf[3] === GLUE_MAGIC[3];
  offset += 4;
  if (!magicValid) {
    throw new Error("Invalid magic number");
  }
  const version = readUint32();
  if (version !== GLUE_VERSION) {
    throw new Error("Invalid version number");
  }
  const name = readString(8);
  const msgProto = GLUE_MESSAGE_PROTOTYPES[name];
  if (!msgProto) {
    throw new Error(`Unknown message name: ${name}`);
  }
  const output = { _name: name };
  for (const field of msgProto.fields) {
    const readType = readUint32();
    if (readType === GLUE_DTYPE_NULL) {
      if (!field.isNullable) {
        throw new Error(
          `${name}: Expect field ${field.name} to be non-nullable`
        );
      }
      output[field.name] = null;
      continue;
    }
    if (readType !== TYPE_MAP[field.type]) {
      throw new Error(
        `${name}: Expect field ${field.name} to have type ${field.type}`
      );
    }
    output[field.name] = readField(field);
  }
  return output;
}
function glueSerialize(msg) {
  const msgProto = GLUE_MESSAGE_PROTOTYPES[msg._name];
  if (!msgProto) {
    throw new Error(`Unknown message name: ${msg._name}`);
  }
  const bufs = [];
  const writeUint32 = (value) => {
    const buf = new ArrayBuffer(4);
    new DataView(buf).setUint32(0, value, true);
    bufs.push(new Uint8Array(buf));
  };
  const writeInt32 = (value) => {
    const buf = new ArrayBuffer(4);
    new DataView(buf).setInt32(0, value, true);
    bufs.push(new Uint8Array(buf));
  };
  const writeFloat = (value) => {
    const buf = new ArrayBuffer(4);
    new DataView(buf).setFloat32(0, value, true);
    bufs.push(new Uint8Array(buf));
  };
  const writeBool = (value) => {
    writeUint32(value ? 1 : 0);
  };
  const writeString = (value) => {
    const utf8 = new TextEncoder().encode(value);
    writeUint32(utf8.byteLength);
    bufs.push(utf8);
  };
  const writeRaw = (value) => {
    writeUint32(value.byteLength);
    bufs.push(value);
  };
  const writeArray = (value, writeItem) => {
    writeUint32(value.length);
    for (const item of value) {
      writeItem(item);
    }
  };
  const writeNull = () => {
  };
  bufs.push(GLUE_MAGIC);
  writeUint32(GLUE_VERSION);
  {
    const utf8 = new TextEncoder().encode(msg._name);
    bufs.push(utf8);
  }
  for (const field of msgProto.fields) {
    const val = msg[field.name];
    if (!field.isNullable && (val === null || val === void 0)) {
      throw new Error(
        `${msg._name}: Expect field ${field.name} to be non-nullable`
      );
    }
    if (val === null || val === void 0) {
      writeUint32(GLUE_DTYPE_NULL);
      continue;
    }
    writeUint32(TYPE_MAP[field.type]);
    switch (field.type) {
      case "str":
        writeString(val);
        break;
      case "int":
        writeInt32(val);
        break;
      case "float":
        writeFloat(val);
        break;
      case "bool":
        writeBool(val);
        break;
      case "raw":
        writeRaw(val);
        break;
      case "arr_str":
        writeArray(val, writeString);
        break;
      case "arr_int":
        writeArray(val, writeInt32);
        break;
      case "arr_float":
        writeArray(val, writeFloat);
        break;
      case "arr_bool":
        writeArray(val, writeBool);
        break;
      case "arr_raw":
        writeArray(val, writeRaw);
        break;
      case "null":
        writeNull();
        break;
    }
  }
  const totalLength = bufs.reduce((acc, buf) => acc + buf.byteLength, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const buf of bufs) {
    output.set(buf, offset);
    offset += buf.byteLength;
  }
  return output;
}

// src/wasm/source-map.ts
var WASM_SOURCE_MAP = {
  "default": "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",
  "compat": "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"
};

// src/debug.ts
var cache = /* @__PURE__ */ new Map();
function loadMap(buildKey) {
  return __async(this, null, function* () {
    if (cache.has(buildKey)) return cache.get(buildKey);
    const b64 = WASM_SOURCE_MAP[buildKey];
    if (!b64) throw new Error(`No source map for build "${buildKey}"`);
    const gzipped = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ds = new DecompressionStream("gzip");
    const writer = ds.writable.getWriter();
    writer.write(gzipped);
    writer.close();
    const buf = yield new Response(ds.readable).arrayBuffer();
    const dv = new DataView(buf);
    const bytes = new Uint8Array(buf);
    const firstId = dv.getUint32(0, true);
    const funcCount = dv.getUint32(4, true);
    const numNames = dv.getUint32(8, true);
    const td = new TextDecoder();
    const names = [];
    let pos = 12;
    for (let i = 0; i < numNames; i++) {
      const len = bytes[pos++];
      names.push(td.decode(bytes.subarray(pos, pos + len)));
      pos += len;
    }
    const funcNames = [];
    for (let i = 0; i < funcCount; i++) {
      const idx = dv.getUint16(pos, true);
      pos += 2;
      funcNames.push(idx === 65535 ? null : names[idx]);
    }
    const entry = { firstId, funcNames };
    cache.set(buildKey, entry);
    return entry;
  });
}
var Debug = {
  /**
   * Resolves a list of wasm function indices to their cleaned symbol names.
   */
  decodeFuncIds: (funcIds, isCompatBuild) => __async(void 0, null, function* () {
    const buildKey = isCompatBuild ? "compat" : "default";
    const { firstId, funcNames } = yield loadMap(buildKey);
    return funcIds.map((funcId) => {
      const i = funcId - firstId;
      const name = i >= 0 && i < funcNames.length && funcNames[i] ? funcNames[i] : "(unknown)";
      return { funcId, name };
    });
  }),
  /**
   * Annotates a wasm stack trace string with resolved function names.
   *
   * Example input from Chrome:
   *   at http://localhost:8080/esm/wasm/wllama.wasm:wasm-function[775]:0x74251
   *   at async blob:http://localhost:8080/53a863cc-7227-45cc-8594-ddbbf5257f20:317:28
   *
   * Example input from Firefox:
   *   @http://localhost:8080/esm/wasm/wllama.wasm:wasm-function[796]:0x7dfe2
   *       at wModuleInit/WebAssembly.promising/< (9b6a2acd-d909-44e2-b021-d42fb9087cfb:15:32) index.js:1433:45
   *
   * Example input from Safari:
   *   2441@wasm-function[2441]
   *       at wrapper (d746f19e-4523-4f36-ba06-d0969acc0b05:22:126009)
   *
   * Example output:
   *   wasm-func[775] (server_response::send)
   */
  decodeStackTrace: (stack, isCompatBuild) => __async(void 0, null, function* () {
    const re = /wasm-function\[(\d+)\]/g;
    const funcIds = [
      ...new Set([...stack.matchAll(re)].map((m) => parseInt(m[1])))
    ];
    if (funcIds.length === 0) return stack;
    const resolved = yield Debug.decodeFuncIds(funcIds, isCompatBuild);
    return resolved.map((r) => {
      if (r.name === "(unknown)") {
        return `    wasm-func[${r.funcId}] (unknown)`;
      }
      return `    wasm-func[${r.funcId}] (${r.name})`;
    }).join("\n");
  })
};

// src/utils.ts
var textDecoder = new TextDecoder();
var URL_PARTS_REGEX = /-(\d{5})-of-(\d{5})\.gguf(?:\?.*)?$/;
var parseShardNumber = (fnameOrUrl) => {
  const matches = fnameOrUrl.match(URL_PARTS_REGEX);
  if (!matches) {
    return {
      baseURL: fnameOrUrl,
      current: 1,
      total: 1
    };
  } else {
    return {
      baseURL: fnameOrUrl.replace(URL_PARTS_REGEX, ""),
      current: parseInt(matches[1]),
      total: parseInt(matches[2])
    };
  }
};
var sortFileByShard = (blobs) => {
  const isFiles = blobs.every((b) => !!b.name);
  if (isFiles && blobs.length > 1) {
    const files = blobs;
    files.sort((a, b) => {
      const infoA = parseShardNumber(a.name);
      const infoB = parseShardNumber(b.name);
      return infoA.current - infoB.current;
    });
  }
};
var isMmproj = (blob) => __async(void 0, null, function* () {
  const META_NAME = "general.architecture";
  const META_VAL = "clip";
  const tmp = blob.slice(0, 128 * 1024);
  const header = yield tmp.arrayBuffer();
  const buf = new Uint8Array(header);
  const nameBytes = new TextEncoder().encode(META_NAME);
  const valBytes = new TextEncoder().encode(META_VAL);
  let offset = -1;
  outer: for (let i = 0; i <= buf.length - nameBytes.length; i++) {
    for (let j = 0; j < nameBytes.length; j++) {
      if (buf[i + j] !== nameBytes[j]) continue outer;
    }
    offset = i;
    break;
  }
  if (offset === -1) return false;
  if (offset + 8 * 4 + 4 > buf.length) return false;
  const view = new DataView(header);
  const valLen = view.getBigUint64(offset + 8 * 3, true);
  if (valLen !== /* @__PURE__ */ BigInt("4")) return false;
  for (let i = 0; i < valBytes.length; i++) {
    if (buf[offset + 8 * 4 + i] !== valBytes[i]) return false;
  }
  return true;
});
var absoluteUrl = (relativePath) => new URL(relativePath, document.baseURI).href;
var padDigits = (number, digits) => {
  return Array(Math.max(digits - String(number).length + 1, 0)).join("0") + number;
};
var sumArr = (arr) => arr.reduce((prev, curr) => prev + curr, 0);
var isString = (value) => !!(value == null ? void 0 : value.startsWith);
var MMPROJ_FILE_NAME = "mmproj.gguf";
var prepareBlobs = (blobsInp) => __async(void 0, null, function* () {
  const blobs = [];
  let blobMmproj = null;
  for (const blob of blobsInp) {
    if (yield isMmproj(blob)) {
      blobMmproj = blob;
    } else {
      blobs.push(blob);
    }
  }
  sortFileByShard(blobs);
  const result = blobs.map((blob, i) => ({
    blob,
    name: `model-${padDigits(i + 1, 5)}-of-${padDigits(blobs.length, 5)}.gguf`
  }));
  if (blobMmproj) {
    result.push({
      blob: blobMmproj,
      name: MMPROJ_FILE_NAME
    });
  }
  return {
    llm: result.filter((f) => f.name !== MMPROJ_FILE_NAME),
    mmproj: blobMmproj ? { blob: blobMmproj, name: MMPROJ_FILE_NAME } : null,
    all: result
  };
});
var isSupportMultiThread = () => ((e) => __async(void 0, null, function* () {
  try {
    return "undefined" != typeof MessageChannel && new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)), WebAssembly.validate(e);
  } catch (e2) {
    return false;
  }
}))(
  new Uint8Array([
    0,
    97,
    115,
    109,
    1,
    0,
    0,
    0,
    1,
    4,
    1,
    96,
    0,
    0,
    3,
    2,
    1,
    0,
    5,
    4,
    1,
    3,
    1,
    1,
    10,
    11,
    1,
    9,
    0,
    65,
    0,
    254,
    16,
    2,
    0,
    26,
    11
  ])
);
var isSupportExceptions = () => __async(void 0, null, function* () {
  return WebAssembly.validate(
    new Uint8Array([
      0,
      97,
      115,
      109,
      1,
      0,
      0,
      0,
      1,
      4,
      1,
      96,
      0,
      0,
      3,
      2,
      1,
      0,
      10,
      8,
      1,
      6,
      0,
      6,
      64,
      25,
      11,
      11
    ])
  );
});
var isSupportSIMD = () => __async(void 0, null, function* () {
  return WebAssembly.validate(
    new Uint8Array([
      0,
      97,
      115,
      109,
      1,
      0,
      0,
      0,
      1,
      5,
      1,
      96,
      0,
      1,
      123,
      3,
      2,
      1,
      0,
      10,
      10,
      1,
      8,
      0,
      65,
      0,
      253,
      15,
      253,
      98,
      11
    ])
  );
});
var isSupportJSPI = () => {
  return !!WebAssembly.Suspending;
};
var isSupportWebGPU = () => {
  return !!navigator.gpu;
};
var isSupportMem64 = () => {
  try {
    new WebAssembly.Memory({
      address: "i64",
      initial: /* @__PURE__ */ BigInt("1")
      // 1 page (64 KiB)
    });
    return true;
  } catch (e) {
    return false;
  }
};
var checkEnvironmentCompatible = () => __async(void 0, null, function* () {
  if (!(yield isSupportExceptions())) {
    throw new Error("WebAssembly runtime does not support exception handling");
  }
  if (!(yield isSupportSIMD())) {
    throw new Error("WebAssembly runtime does not support SIMD");
  }
});
var isFirefox = () => {
  return !!navigator.userAgent.match(/Firefox\/([0-9\.]+)(?:\s|$)/);
};
var GGUF_FILE_REGEX = /^.*\.gguf(?:\?.*)?$/;
var isValidGgufFile = (path) => {
  return GGUF_FILE_REGEX.test(path);
};
var isSafariMobile = () => {
  return !!navigator.userAgent.match(/Version\/([0-9\._]+).*Mobile.*Safari.*/);
};
var createWorker = (workerCode) => {
  const workerURL = URL.createObjectURL(
    isString(workerCode) ? new Blob([workerCode], { type: "text/javascript" }) : workerCode
  );
  return new Worker(workerURL, { type: "module" });
};
var cbToAsyncIter = (fn) => (...args) => {
  let values = [];
  let resolve;
  let reject;
  values.push(
    new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    })
  );
  fn(...args, (val, done, err) => {
    if (err) {
      reject(err);
      return;
    }
    resolve([val, done]);
    values.push(
      new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      })
    );
  });
  return function() {
    return __asyncGenerator(this, null, function* () {
      let val;
      for (let i = 0, done = false; !done; i++) {
        [val, done] = yield new __await(values[i]);
        delete values[i];
        if (val !== void 0) yield val;
      }
    });
  }();
};
var canUseAsyncFileRead = (compat) => isSupportJSPI() || compat;
var needCompat = () => !isSupportJSPI() || !isSupportMem64();

// src/workers-code/generated.ts
var LIBLLAMA_VERSION = "b9425-0821c5f";
var LLAMA_CPP_WORKER_CODE = "// Start the main llama.cpp\nlet wllamaMalloc;\nlet wllamaStart;\nlet wllamaAction;\nlet wllamaExit;\nlet wllamaDebug;\n\nlet Module = null;\nlet isCompat = false;\nlet lastStack = '';\nlet isAborted = false;\nlet hasMultithread = false;\n\n//////////////////////////////////////////////////////////////\n// UTILS\n//////////////////////////////////////////////////////////////\n\n// send message back to main thread\nconst msg = (data, transfer) => postMessage(data, transfer);\n\n// Convert CPP log into JS log\nconst cppLogToJSLog = (line) => {\n  const matched = line.match(/@@(DEBUG|INFO|WARN|ERROR)@@(.*)/);\n  return !!matched\n    ? {\n        level: (matched[1] === 'INFO' ? 'debug' : matched[1]).toLowerCase(),\n        text: matched[2],\n      }\n    : { level: 'log', text: line };\n};\n\nconst getHeapU8 = () => {\n  const buffer = Module.wasmMemory.buffer;\n  return new Uint8Array(buffer);\n};\n\nconst toSizeT = (num) => {\n  return isCompat ? Number(num) : BigInt(num);\n};\n\n// Get module config that forwards stdout/err to main thread\nconst getWModuleConfig = (_argMainScriptBlob) => {\n  var pathConfig = RUN_OPTIONS.pathConfig;\n  var pthreadPoolSize = RUN_OPTIONS.nbThread;\n  var argMainScriptBlob = _argMainScriptBlob;\n\n  isCompat = RUN_OPTIONS.compat;\n  hasMultithread = pthreadPoolSize > 1;\n\n  msg({\n    verb: 'console.debug',\n    args: [\n      `Multithread enabled: ${hasMultithread}, pthreadPoolSize: ${pthreadPoolSize}`,\n    ],\n  });\n\n  if (!pathConfig['wllama.wasm']) {\n    throw new Error('\"wllama.wasm\" is missing in pathConfig');\n  }\n  return {\n    noInitialRun: true,\n    print: function (text) {\n      if (arguments.length > 1)\n        text = Array.prototype.slice.call(arguments).join(' ');\n      msg({ verb: 'console.log', args: [text] });\n    },\n    printErr: function (text) {\n      if (arguments.length > 1)\n        text = Array.prototype.slice.call(arguments).join(' ');\n      if (text.startsWith('@@STACK@@')) {\n        lastStack = text.slice('@@STACK@@'.length);\n        return;\n      }\n      const logLine = cppLogToJSLog(text);\n      msg({ verb: 'console.' + logLine.level, args: [logLine.text] });\n    },\n    locateFile: function (filename, basePath) {\n      const p = pathConfig[filename];\n      const truncate = (str) =>\n        str.length > 128 ? `${str.substr(0, 128)}...` : str;\n      if (filename.match(/wllama\\.worker\\.js/)) {\n        msg({\n          verb: 'console.error',\n          args: [\n            '\"wllama.worker.js\" is removed from v2.2.1. Hint: make sure to clear browser\\'s cache.',\n          ],\n        });\n      } else {\n        msg({\n          verb: 'console.debug',\n          args: [`Loading \"${filename}\" from \"${truncate(p)}\"`],\n        });\n        return p;\n      }\n    },\n    mainScriptUrlOrBlob: hasMultithread\n      ? argMainScriptBlob\n      : 'throw new Error(\"Multithreading is not enabled\")',\n    pthreadPoolSize: hasMultithread ? pthreadPoolSize : 0,\n    wasmMemory: hasMultithread ? getWasmMemory() : null,\n    onAbort: function (message) {\n      isAborted = true;\n      msg({ verb: 'signal.abort', args: ['abort', message, lastStack, null] });\n    },\n    onExit: function (code) {\n      isAborted = true;\n      const callstack = new Error().stack.toString();\n      msg({\n        verb: 'signal.abort',\n        args: ['abort', 'exit(' + code + ')', callstack, null],\n      });\n    },\n  };\n};\n\n// Get the memory to be used by wasm. (Only used in multi-thread mode)\n// Because we have a weird OOM issue on iOS, we need to try some values\n// See: https://github.com/emscripten-core/emscripten/issues/19144\n//      https://github.com/godotengine/godot/issues/70621\nconst getWasmMemory = () => {\n  let minBytes = 128 * 1024 * 1024;\n  let maxBytes = 4096 * 1024 * 1024;\n  let stepBytes = 128 * 1024 * 1024;\n  while (maxBytes > minBytes) {\n    try {\n      const wasmMemory = new WebAssembly.Memory({\n        initial: toSizeT(minBytes / 65536),\n        maximum: toSizeT(maxBytes / 65536),\n        shared: true,\n        address: isCompat ? undefined : 'i64',\n      });\n      return wasmMemory;\n    } catch (e) {\n      maxBytes -= stepBytes;\n      continue; // retry\n    }\n  }\n  throw new Error('Cannot allocate WebAssembly.Memory');\n};\n\n//////////////////////////////////////////////////////////////\n// HEAPFS PATCH\n//////////////////////////////////////////////////////////////\n\n/**\n * By default, emscripten uses memfs. The way it works is by\n * allocating new Uint8Array in javascript heap. This is not good\n * because it requires files to be copied to wasm heap each time\n * a file is read.\n *\n * HeapFS is an alternative, which resolves this problem by\n * allocating space for file directly inside wasm heap. This\n * allows us to mmap without doing any copy.\n *\n * For llama.cpp, this is great because we use MAP_SHARED\n *\n * Ref: https://github.com/ngxson/wllama/pull/39\n * Ref: https://github.com/emscripten-core/emscripten/blob/main/src/library_memfs.js\n *\n * Note 29/05/2024 @ngxson\n * Due to ftell() being limited to MAX_LONG, we cannot load files bigger than 2^31 bytes (or 2GB)\n * Ref: https://github.com/emscripten-core/emscripten/blob/main/system/lib/libc/musl/src/stdio/ftell.c\n */\n\nconst fsNameToFile = {}; // map Name => File\nconst fsIdToFile = {}; // map ID => File\nlet currFileId = 0;\n\n// Patch and redirect memfs calls to wllama\nconst patchHeapFS = () => {\n  const m = Module;\n  // save functions\n  m.MEMFS.stream_ops._read = m.MEMFS.stream_ops.read;\n  m.MEMFS.stream_ops._write = m.MEMFS.stream_ops.write;\n  m.MEMFS.stream_ops._llseek = m.MEMFS.stream_ops.llseek;\n  m.MEMFS.stream_ops._allocate = m.MEMFS.stream_ops.allocate;\n  m.MEMFS.stream_ops._mmap = m.MEMFS.stream_ops.mmap;\n  m.MEMFS.stream_ops._msync = m.MEMFS.stream_ops.msync;\n\n  const patchStream = (stream) => {\n    const name = stream.node.name;\n    if (fsNameToFile[name]) {\n      const f = fsNameToFile[name];\n      const ptr = Number(f.ptr);\n      stream.node.contents = getHeapU8().subarray(ptr, ptr + f.size);\n      stream.node.usedBytes = f.size;\n    }\n  };\n\n  // replace \"read\" functions\n  m.MEMFS.stream_ops.read = function (\n    stream,\n    buffer,\n    offset,\n    length,\n    position\n  ) {\n    patchStream(stream);\n    return m.MEMFS.stream_ops._read(stream, buffer, offset, length, position);\n  };\n  m.MEMFS.ops_table.file.stream.read = m.MEMFS.stream_ops.read;\n\n  // replace \"llseek\" functions\n  m.MEMFS.stream_ops.llseek = function (stream, offset, whence) {\n    patchStream(stream);\n    return m.MEMFS.stream_ops._llseek(stream, offset, whence);\n  };\n  m.MEMFS.ops_table.file.stream.llseek = m.MEMFS.stream_ops.llseek;\n\n  // replace \"mmap\" functions\n  m.MEMFS.stream_ops.mmap = function (stream, length, position, prot, flags) {\n    patchStream(stream);\n    const name = stream.node.name;\n    if (fsNameToFile[name]) {\n      const f = fsNameToFile[name];\n      const mmapPtr = f.ptr + toSizeT(position);\n      return {\n        ptr: mmapPtr,\n        allocated: false,\n      };\n    } else {\n      return m.MEMFS.stream_ops._mmap(stream, length, position, prot, flags);\n    }\n  };\n  m.MEMFS.ops_table.file.stream.mmap = m.MEMFS.stream_ops.mmap;\n\n  // mount FS\n  m.FS.mkdir('/models');\n  m.FS.mount(m.MEMFS, { root: '.' }, '/models');\n};\n\n// Allocate a new file in wllama heapfs, returns file ID\nconst heapfsAlloc = (name, size, allocBuffer) => {\n  if (size < 1) {\n    throw new Error('File size must be bigger than 0');\n  }\n  const m = Module;\n  const ptr = toSizeT(allocBuffer ? m.mmapAlloc(size) : 0);\n  const file = {\n    ptr: ptr,\n    size: size,\n    id: currFileId++,\n  };\n  fsIdToFile[file.id] = file;\n  fsNameToFile[name] = file;\n  return file.id;\n};\n\n// Add new file to wllama heapfs, return number of written bytes\nconst heapfsWrite = (id, buffer, offset) => {\n  if (fsIdToFile[id]) {\n    const { ptr, size } = fsIdToFile[id];\n    const afterWriteByte = offset + buffer.byteLength;\n    if (afterWriteByte > size) {\n      throw new Error(\n        `File ID ${id} write out of bound, afterWriteByte = ${afterWriteByte} while size = ${size}`\n      );\n    }\n    getHeapU8().set(buffer, Number(ptr) + offset);\n    return buffer.byteLength;\n  } else {\n    throw new Error(`File ID ${id} not found in heapfs`);\n  }\n};\n\n//////////////////////////////////////////////////////////////\n// ASYNC FILE READ\n//////////////////////////////////////////////////////////////\n\nlet isAwaitReading = false;\nlet pendingReadPromise = null;\nlet pendingReadResolve = null;\nlet pendingReadReject = null;\n\nconst _stripModelsPrefix = (path) => path.replace(/^\\/?models\\//, '');\n\n// Called from EM_ASYNC_JS stub in wllama-fs.h (path is already a JS string)\nconst _wllama_js_file_read = async (path, offset, req_size, out_ptr) => {\n  const name = _stripModelsPrefix(path);\n\n  pendingReadPromise = new Promise((res, rej) => {\n    pendingReadResolve = res;\n    pendingReadReject = rej;\n  });\n  isAwaitReading = true;\n\n  postMessage({ verb: 'fs.read_req', args: [name, offset, req_size] });\n\n  let data;\n  try {\n    data = await pendingReadPromise;\n  } finally {\n    isAwaitReading = false;\n    pendingReadResolve = null;\n    pendingReadReject = null;\n  }\n\n  const bytes = new Uint8Array(data);\n  getHeapU8().set(bytes, out_ptr);\n  return toSizeT(bytes.length);\n};\n\n//////////////////////////////////////////////////////////////\n// MAIN CODE\n//////////////////////////////////////////////////////////////\n\nconst callWrapper = (name, ret, args, isAsync) => {\n  const fn = Module.cwrap(\n    name,\n    ret,\n    args,\n    isAsync ? { async: true } : undefined\n  );\n  return async (action, req) => {\n    // console.log(`Calling ${name} with action:`, action, 'and req:', req);\n    let result;\n    try {\n      if (args.length === 2) {\n        result = isAsync ? await fn(action, req) : fn(action, req);\n      } else {\n        result = fn();\n      }\n    } catch (ex) {\n      console.error(ex);\n      throw ex;\n    }\n    return result;\n  };\n};\n\nfunction handleError(err) {\n  // If WASM already aborted, onAbort already sent signal.abort; skip to avoid\n  // re-reporting the resulting WebAssembly.RuntimeError as a JS exception.\n  if (isAborted) return;\n\n  const message = err ? err.message || String(err) : 'Unknown error';\n  const stack = err ? err.stack || String(err) : '';\n  msg({\n    verb: 'signal.abort',\n    args: ['exception', message, stack, err],\n  });\n}\n\nonmessage = async (e) => {\n  if (!e.data) return;\n  const { verb, args, callbackId } = e.data;\n\n  // fs.read_res arrives while wasm is JSPI-suspended; resolve the pending promise.\n  if (verb === 'fs.read_res') {\n    if (pendingReadResolve) {\n      pendingReadResolve(args[0]);\n    }\n    return;\n  }\n\n  // Guard: while awaiting a file read, reject any other incoming task.\n  if (isAwaitReading) {\n    if (callbackId) {\n      msg({\n        callbackId,\n        err: 'Worker is suspended waiting for file data (JSPI)',\n      });\n    }\n    return;\n  }\n\n  if (!callbackId) {\n    msg({ verb: 'console.error', args: ['callbackId is required', e.data] });\n    return;\n  }\n\n  if (verb === 'module.init') {\n    const argMainScriptBlob = args[0];\n    const argUseAsyncFile = args[1];\n    try {\n      Module = getWModuleConfig(argMainScriptBlob);\n      Module.preRun = () => {\n        if (argUseAsyncFile) {\n          Module.ENV['USE_ASYNC_FILE'] = '1';\n        }\n      };\n      Module.onRuntimeInitialized = () => {\n        // async call once module is ready\n        // init FS\n        patchHeapFS();\n        // init cwrap\n        const pointer = isCompat ? 'number' : 'bigint';\n        // TODO: note sure why emscripten cannot bind if there is only 1 argument\n        wllamaMalloc = callWrapper('wllama_malloc', pointer, [\n          'number',\n          pointer,\n        ]);\n        wllamaStart = callWrapper('wllama_start', 'string', [], true);\n        wllamaAction = callWrapper(\n          'wllama_action',\n          pointer,\n          ['string', pointer],\n          true\n        );\n        wllamaExit = callWrapper('wllama_exit', 'string', []);\n        wllamaDebug = callWrapper('wllama_debug', 'string', []);\n        msg({ callbackId, result: null });\n      };\n      wModuleInit();\n    } catch (err) {\n      handleError(err);\n    }\n    return;\n  }\n\n  if (verb === 'fs.alloc') {\n    const argFilename = args[0];\n    const argSize = args[1];\n    const argAllocBuffer = args[2];\n    try {\n      // create blank file\n      const emptyBuffer = new ArrayBuffer(0);\n      Module['FS_createDataFile'](\n        '/models',\n        argFilename,\n        emptyBuffer,\n        true,\n        true,\n        true\n      );\n      // alloc data on heap\n      const fileId = heapfsAlloc(argFilename, argSize, argAllocBuffer);\n      msg({ callbackId, result: { fileId } });\n    } catch (err) {\n      handleError(err);\n    }\n    return;\n  }\n\n  if (verb === 'fs.write') {\n    const argFileId = args[0];\n    const argBuffer = args[1];\n    const argOffset = args[2];\n    try {\n      const writtenBytes = heapfsWrite(argFileId, argBuffer, argOffset);\n      msg({ callbackId, result: { writtenBytes } });\n    } catch (err) {\n      handleError(err);\n    }\n    return;\n  }\n\n  if (verb === 'wllama.start') {\n    try {\n      const result = await wllamaStart();\n      msg({ callbackId, result });\n    } catch (err) {\n      handleError(err);\n    }\n    return;\n  }\n\n  if (verb === 'wllama.action') {\n    const argAction = args[0];\n    const argEncodedMsg = args[1];\n    try {\n      const inputPtr = await wllamaMalloc(toSizeT(argEncodedMsg.byteLength), 0);\n      // copy data to wasm heap\n      const inputBuffer = new Uint8Array(\n        getHeapU8().buffer,\n        Number(inputPtr),\n        argEncodedMsg.byteLength\n      );\n      inputBuffer.set(argEncodedMsg, 0);\n      const outputPtr = await wllamaAction(argAction, inputPtr);\n      // length of output buffer is written at the first 4 bytes of input buffer\n      const outputLen = new Uint32Array(\n        getHeapU8().buffer,\n        Number(inputPtr),\n        1\n      )[0];\n      // copy the output buffer to JS heap\n      const outputBuffer = new Uint8Array(outputLen);\n      const outputSrcView = new Uint8Array(\n        getHeapU8().buffer,\n        Number(outputPtr),\n        outputLen\n      );\n      outputBuffer.set(outputSrcView, 0); // copy it\n      msg({ callbackId, result: outputBuffer }, [outputBuffer.buffer]);\n    } catch (err) {\n      handleError(err);\n    }\n    return;\n  }\n\n  if (verb === 'wllama.exit') {\n    try {\n      const result = await wllamaExit();\n      msg({ callbackId, result });\n    } catch (err) {\n      handleError(err);\n    }\n    return;\n  }\n\n  if (verb === 'wllama.debug') {\n    try {\n      const result = await wllamaDebug();\n      msg({ callbackId, result });\n    } catch (err) {\n      handleError(err);\n    }\n    return;\n  }\n};\n";
var OPFS_UTILS_WORKER_CODE = "let accessHandle;\nlet abortController = new AbortController();\n\nasync function openFile(filename) {\n  const opfsRoot = await navigator.storage.getDirectory();\n  const cacheDir = await opfsRoot.getDirectoryHandle('cache', { create: true });\n  const fileHandler = await cacheDir.getFileHandle(filename, { create: true });\n  accessHandle = await fileHandler.createSyncAccessHandle();\n  accessHandle.truncate(0); // clear file content\n}\n\nasync function writeFile(buf) {\n  accessHandle.write(buf);\n}\n\nasync function closeFile() {\n  accessHandle.flush();\n  accessHandle.close();\n}\n\nasync function writeTextFile(filename, str) {\n  await openFile(filename);\n  await writeFile(new TextEncoder().encode(str));\n  await closeFile();\n}\n\nconst throttled = (func, delay) => {\n  let lastRun = 0;\n  return (...args) => {\n    const now = Date.now();\n    if (now - lastRun > delay) {\n      lastRun = now;\n      func.apply(null, args);\n    }\n  };\n};\n\nconst assertNonNull = (val) => {\n  if (val === null || val === undefined) {\n    throw new Error('OPFS Worker: Assertion failed');\n  }\n};\n\n// respond to main thread\nconst resOK = () => postMessage({ ok: true });\nconst resProgress = (loaded, total) =>\n  postMessage({ progress: { loaded, total } });\nconst resErr = (err) => postMessage({ err });\n\nonmessage = async (e) => {\n  try {\n    if (!e.data) return;\n\n    /**\n     * @param {Object} e.data\n     *\n     * Fine-control FS actions:\n     * - { action: 'open', filename: 'string' }\n     * - { action: 'write', buf: ArrayBuffer }\n     * - { action: 'close' }\n     *\n     * Simple write API:\n     * - { action: 'write-simple', filename: 'string', buf: ArrayBuffer }\n     *\n     * Download API:\n     * - { action: 'download', url: 'string', filename: 'string', options: Object, metadataFileName: 'string' }\n     * - { action: 'download-abort' }\n     */\n    const {\n      action,\n      filename,\n      buf,\n      url,\n      options,\n      metadataFileName,\n      metadataAdditional,\n    } = e.data;\n\n    if (action === 'open') {\n      assertNonNull(filename);\n      await openFile(filename);\n      return resOK();\n    } else if (action === 'write') {\n      assertNonNull(buf);\n      await writeFile(buf);\n      return resOK();\n    } else if (action === 'close') {\n      await closeFile();\n      return resOK();\n    } else if (action === 'write-simple') {\n      assertNonNull(filename);\n      assertNonNull(buf);\n      await openFile(filename);\n      await writeFile(buf);\n      await closeFile();\n      return resOK();\n    } else if (action === 'download') {\n      assertNonNull(url);\n      assertNonNull(filename);\n      assertNonNull(metadataFileName);\n      assertNonNull(options);\n      assertNonNull(options.aborted);\n      abortController = new AbortController();\n      if (options.aborted) abortController.abort();\n      const response = await fetch(url, {\n        ...options,\n        signal: abortController.signal,\n      });\n      const contentLength = response.headers.get('content-length');\n      const etag = (response.headers.get('etag') || '').replace(\n        /[^A-Za-z0-9]/g,\n        ''\n      );\n      const total = parseInt(contentLength, 10);\n      const reader = response.body.getReader();\n      await openFile(filename);\n      let loaded = 0;\n      const throttledProgress = throttled(resProgress, 100);\n      while (true) {\n        const { done, value } = await reader.read();\n        if (done) break;\n        loaded += value.byteLength;\n        await writeFile(value);\n        throttledProgress(loaded, total);\n      }\n      resProgress(total, total); // 100% done\n      await closeFile();\n      // make sure this is in-sync with CacheEntryMetadata\n      await writeTextFile(\n        metadataFileName,\n        JSON.stringify({\n          originalURL: url,\n          originalSize: total,\n          etag,\n          ...metadataAdditional,\n        })\n      );\n      return resOK();\n    } else if (action === 'download-abort') {\n      if (abortController) {\n        abortController.abort();\n      }\n      return;\n    }\n\n    throw new Error('OPFS Worker: Invalid action', e.data);\n  } catch (err) {\n    return resErr(err);\n  }\n};\n";
var WLLAMA_EMSCRIPTEN_CODE = 'var Module=typeof Module!="undefined"?Module:{};var ENVIRONMENT_IS_WEB=!!globalThis.window;var ENVIRONMENT_IS_WORKER=!!globalThis.WorkerGlobalScope;var ENVIRONMENT_IS_NODE=globalThis.process?.versions?.node&&globalThis.process?.type!="renderer";var ENVIRONMENT_IS_PTHREAD=ENVIRONMENT_IS_WORKER&&self.name?.startsWith("em-pthread");if(ENVIRONMENT_IS_NODE){var worker_threads=require("worker_threads");global.Worker=worker_threads.Worker;ENVIRONMENT_IS_WORKER=!worker_threads.isMainThread;ENVIRONMENT_IS_PTHREAD=ENVIRONMENT_IS_WORKER&&worker_threads["workerData"]=="em-pthread"}var arguments_=[];var thisProgram="./this.program";var quit_=(status,toThrow)=>{throw toThrow};var _scriptName=globalThis.document?.currentScript?.src;if(typeof __filename!="undefined"){_scriptName=__filename}else if(ENVIRONMENT_IS_WORKER){_scriptName=self.location.href}var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var readAsync,readBinary;if(ENVIRONMENT_IS_NODE){var fs=require("fs");scriptDirectory=__dirname+"/";readBinary=filename=>{filename=isFileURI(filename)?new URL(filename):filename;var ret=fs.readFileSync(filename);return ret};readAsync=async(filename,binary=true)=>{filename=isFileURI(filename)?new URL(filename):filename;var ret=fs.readFileSync(filename,binary?undefined:"utf8");return ret};if(process.argv.length>1){thisProgram=process.argv[1].replace(/\\\\/g,"/")}arguments_=process.argv.slice(2);if(typeof module!="undefined"){module["exports"]=Module}quit_=(status,toThrow)=>{process.exitCode=status;throw toThrow}}else if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){try{scriptDirectory=new URL(".",_scriptName).href}catch{}if(!ENVIRONMENT_IS_NODE){if(ENVIRONMENT_IS_WORKER){readBinary=url=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)}}readAsync=async url=>{if(isFileURI(url)){return new Promise((resolve,reject)=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,true);xhr.responseType="arraybuffer";xhr.onload=()=>{if(xhr.status==200||xhr.status==0&&xhr.response){resolve(xhr.response);return}reject(xhr.status)};xhr.onerror=reject;xhr.send(null)})}var response=await fetch(url,{credentials:"same-origin"});if(response.ok){return response.arrayBuffer()}throw new Error(response.status+" : "+response.url)}}}else{}var defaultPrint=console.log.bind(console);var defaultPrintErr=console.error.bind(console);if(ENVIRONMENT_IS_NODE){var utils=require("util");var stringify=a=>typeof a=="object"?utils.inspect(a):a;defaultPrint=(...args)=>fs.writeSync(1,args.map(stringify).join(" ")+"\\n");defaultPrintErr=(...args)=>fs.writeSync(2,args.map(stringify).join(" ")+"\\n")}var out=defaultPrint;var err=defaultPrintErr;var wasmBinary;var wasmModule;var ABORT=false;var EXITSTATUS;function assert(condition,text){if(!condition){abort(text)}}var isFileURI=filename=>filename.startsWith("file://");function growMemViews(){if(wasmMemory.buffer!=HEAP8.buffer){updateMemoryViews()}}if(ENVIRONMENT_IS_NODE&&ENVIRONMENT_IS_PTHREAD){var parentPort=worker_threads["parentPort"];parentPort.on("message",msg=>global.onmessage?.({data:msg}));Object.assign(globalThis,{self:global,postMessage:msg=>parentPort["postMessage"](msg)});process.on("uncaughtException",err=>{postMessage({cmd:"uncaughtException",error:err});process.exit(1)})}var startWorker;if(ENVIRONMENT_IS_PTHREAD){var initializedJS=false;self.onunhandledrejection=e=>{throw e.reason||e};async function handleMessage(e){try{var msgData=e["data"];var cmd=msgData.cmd;if(cmd==="load"){let messageQueue=[];self.onmessage=e=>messageQueue.push(e);startWorker=()=>{postMessage({cmd:"loaded"});for(let msg of messageQueue){handleMessage(msg)}self.onmessage=handleMessage};for(const handler of msgData.handlers){if(!Module[handler]||Module[handler].proxy){Module[handler]=(...args)=>{postMessage({cmd:"callHandler",handler,args})};if(handler=="print")out=Module[handler];if(handler=="printErr")err=Module[handler]}}wasmMemory=msgData.wasmMemory;updateMemoryViews();wasmModule=msgData.wasmModule;createWasm();run()}else if(cmd==="run"){establishStackSpace(msgData.pthread_ptr);__emscripten_thread_init(msgData.pthread_ptr,0,0,1,0,0);PThread.threadInitTLS();__emscripten_thread_mailbox_await(msgData.pthread_ptr);if(!initializedJS){initializedJS=true}try{await invokeEntryPoint(msgData.start_routine,msgData.arg)}catch(ex){if(ex!="unwind"){throw ex}}}else if(msgData.target==="setimmediate"){}else if(cmd==="checkMailbox"){if(initializedJS){checkMailbox()}}else if(cmd){err(`worker: received unknown command ${cmd}`);err(msgData)}}catch(ex){__emscripten_thread_crashed();throw ex}}self.onmessage=handleMessage}var HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64;var HEAP64,HEAPU64;var runtimeInitialized=false;function updateMemoryViews(){var b=wasmMemory.buffer;HEAP8=new Int8Array(b);HEAP16=new Int16Array(b);Module["HEAPU8"]=HEAPU8=new Uint8Array(b);HEAPU16=new Uint16Array(b);HEAP32=new Int32Array(b);HEAPU32=new Uint32Array(b);HEAPF32=new Float32Array(b);HEAPF64=new Float64Array(b);HEAP64=new BigInt64Array(b);HEAPU64=new BigUint64Array(b)}function initMemory(){if(ENVIRONMENT_IS_PTHREAD){return}if(Module["wasmMemory"]){wasmMemory=Module["wasmMemory"]}else{var INITIAL_MEMORY=Module["INITIAL_MEMORY"]||134217728;wasmMemory=new WebAssembly.Memory({initial:BigInt(INITIAL_MEMORY/65536),maximum:65536n,shared:true,address:"i64"})}updateMemoryViews()}function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(onPreRuns)}function initRuntime(){runtimeInitialized=true;if(ENVIRONMENT_IS_PTHREAD)return startWorker();if(!Module["noFSInit"]&&!FS.initialized)FS.init();TTY.init();wasmExports["__wasm_call_ctors"]();FS.ignorePermissions=false}function preMain(){}function postRun(){if(ENVIRONMENT_IS_PTHREAD){return}if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(onPostRuns)}function abort(what){Module["onAbort"]?.(what);what="Aborted("+what+")";err(what);ABORT=true;what+=". Build with -sASSERTIONS for more info.";if(runtimeInitialized){___trap()}var e=new WebAssembly.RuntimeError(what);throw e}var wasmBinaryFile;function findWasmBinary(){return locateFile("wllama.wasm")}function getBinarySync(file){if(file==wasmBinaryFile&&wasmBinary){return new Uint8Array(wasmBinary)}if(readBinary){return readBinary(file)}throw"both async and sync fetching of the wasm failed"}async function getWasmBinary(binaryFile){if(!wasmBinary){try{var response=await readAsync(binaryFile);return new Uint8Array(response)}catch{}}return getBinarySync(binaryFile)}async function instantiateArrayBuffer(binaryFile,imports){try{var binary=await getWasmBinary(binaryFile);var instance=await WebAssembly.instantiate(binary,imports);return instance}catch(reason){err(`failed to asynchronously prepare wasm: ${reason}`);abort(reason)}}async function instantiateAsync(binary,binaryFile,imports){if(!binary&&!isFileURI(binaryFile)&&!ENVIRONMENT_IS_NODE){try{var response=fetch(binaryFile,{credentials:"same-origin"});var instantiationResult=await WebAssembly.instantiateStreaming(response,imports);return instantiationResult}catch(reason){err(`wasm streaming compile failed: ${reason}`);err("falling back to ArrayBuffer instantiation")}}return instantiateArrayBuffer(binaryFile,imports)}function getWasmImports(){assignWasmImports();if(!wasmImports.__instrumented){wasmImports.__instrumented=true;Asyncify.instrumentWasmImports(wasmImports)}var imports={env:wasmImports,wasi_snapshot_preview1:wasmImports};return imports}async function createWasm(){function receiveInstance(instance,module){wasmExports=instance.exports;wasmExports=Asyncify.instrumentWasmExports(wasmExports);wasmExports=applySignatureConversions(wasmExports);registerTLSInit(wasmExports["_emscripten_tls_init"]);assignWasmExports(wasmExports);wasmModule=module;removeRunDependency("wasm-instantiate");return wasmExports}addRunDependency("wasm-instantiate");function receiveInstantiationResult(result){return receiveInstance(result["instance"],result["module"])}var info=getWasmImports();if(Module["instantiateWasm"]){return new Promise((resolve,reject)=>{Module["instantiateWasm"](info,(inst,mod)=>{resolve(receiveInstance(inst,mod))})})}if(ENVIRONMENT_IS_PTHREAD){var instance=new WebAssembly.Instance(wasmModule,getWasmImports());return receiveInstance(instance,wasmModule)}wasmBinaryFile??=findWasmBinary();var result=await instantiateAsync(wasmBinary,wasmBinaryFile,info);var exports=receiveInstantiationResult(result);return exports}class ExitStatus{name="ExitStatus";constructor(status){this.message=`Program terminated with exit(${status})`;this.status=status}}var terminateWorker=worker=>{worker.terminate();worker.onmessage=e=>{}};var cleanupThread=pthread_ptr=>{var worker=PThread.pthreads[pthread_ptr];PThread.returnWorkerToPool(worker)};var callRuntimeCallbacks=callbacks=>{while(callbacks.length>0){callbacks.shift()(Module)}};var onPreRuns=[];var addOnPreRun=cb=>onPreRuns.push(cb);var runDependencies=0;var dependenciesFulfilled=null;var removeRunDependency=id=>{runDependencies--;Module["monitorRunDependencies"]?.(runDependencies);if(runDependencies==0){if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback()}}};var addRunDependency=id=>{runDependencies++;Module["monitorRunDependencies"]?.(runDependencies)};var spawnThread=threadParams=>{var worker=PThread.getNewWorker();if(!worker){return 6}PThread.runningWorkers.push(worker);PThread.pthreads[threadParams.pthread_ptr]=worker;worker.pthread_ptr=threadParams.pthread_ptr;var msg={cmd:"run",start_routine:threadParams.startRoutine,arg:threadParams.arg,pthread_ptr:threadParams.pthread_ptr};if(ENVIRONMENT_IS_NODE){worker.unref()}worker.postMessage(msg,threadParams.transferList);return 0};var runtimeKeepaliveCounter=0;var keepRuntimeAlive=()=>noExitRuntime||runtimeKeepaliveCounter>0;var stackSave=()=>_emscripten_stack_get_current();var stackRestore=val=>__emscripten_stack_restore(val);var stackAlloc=sz=>__emscripten_stack_alloc(sz);var proxyToMainThread=(funcIndex,emAsmAddr,sync,...callArgs)=>{var serializedNumCallArgs=callArgs.length*2;var sp=stackSave();var args=stackAlloc(serializedNumCallArgs*8);var b=args/8;for(var i=0;i<callArgs.length;i++){var arg=callArgs[i];if(typeof arg=="bigint"){(growMemViews(),HEAP64)[b+2*i]=1n;(growMemViews(),HEAP64)[b+2*i+1]=arg}else{(growMemViews(),HEAP64)[b+2*i]=0n;(growMemViews(),HEAPF64)[b+2*i+1]=arg}}var rtn=__emscripten_run_js_on_main_thread(funcIndex,emAsmAddr,serializedNumCallArgs,args,sync);stackRestore(sp);return rtn};function _proc_exit(code){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(0,0,1,code);EXITSTATUS=code;if(!keepRuntimeAlive()){PThread.terminateAllThreads();Module["onExit"]?.(code);ABORT=true}quit_(code,new ExitStatus(code))}function exitOnMainThread(returnCode){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(1,0,0,returnCode);_exit(returnCode)}var exitJS=(status,implicit)=>{EXITSTATUS=status;if(ENVIRONMENT_IS_PTHREAD){exitOnMainThread(status);throw"unwind"}_proc_exit(status)};var _exit=exitJS;var PThread={unusedWorkers:[],runningWorkers:[],tlsInitFunctions:[],pthreads:{},init(){if(!ENVIRONMENT_IS_PTHREAD){PThread.initMainThread()}},initMainThread(){var pthreadPoolSize=Module["pthreadPoolSize"];while(pthreadPoolSize--){PThread.allocateUnusedWorker()}addOnPreRun(async()=>{var pthreadPoolReady=PThread.loadWasmModuleToAllWorkers();addRunDependency("loading-workers");await pthreadPoolReady;removeRunDependency("loading-workers")})},terminateAllThreads:()=>{for(var worker of PThread.runningWorkers){terminateWorker(worker)}for(var worker of PThread.unusedWorkers){terminateWorker(worker)}PThread.unusedWorkers=[];PThread.runningWorkers=[];PThread.pthreads={}},returnWorkerToPool:worker=>{var pthread_ptr=worker.pthread_ptr;delete PThread.pthreads[pthread_ptr];PThread.unusedWorkers.push(worker);PThread.runningWorkers.splice(PThread.runningWorkers.indexOf(worker),1);worker.pthread_ptr=0;__emscripten_thread_free_data(pthread_ptr)},threadInitTLS(){PThread.tlsInitFunctions.forEach(f=>f())},loadWasmModuleToWorker:worker=>new Promise(onFinishedLoading=>{worker.onmessage=e=>{var d=e["data"];var cmd=d.cmd;if(d.targetThread&&d.targetThread!=_pthread_self()){var targetWorker=PThread.pthreads[d.targetThread];if(targetWorker){targetWorker.postMessage(d,d.transferList)}else{err(`Internal error! Worker sent a message "${cmd}" to target pthread ${d.targetThread}, but that thread no longer exists!`)}return}if(cmd==="checkMailbox"){checkMailbox()}else if(cmd==="spawnThread"){spawnThread(d)}else if(cmd==="cleanupThread"){callUserCallback(()=>cleanupThread(d.thread))}else if(cmd==="loaded"){worker.loaded=true;if(ENVIRONMENT_IS_NODE&&!worker.pthread_ptr){worker.unref()}onFinishedLoading(worker)}else if(d.target==="setimmediate"){worker.postMessage(d)}else if(cmd==="uncaughtException"){worker.onerror(d.error)}else if(cmd==="callHandler"){Module[d.handler](...d.args)}else if(cmd){err(`worker sent an unknown command ${cmd}`)}};worker.onerror=e=>{var message="worker sent an error!";err(`${message} ${e.filename}:${e.lineno}: ${e.message}`);throw e};if(ENVIRONMENT_IS_NODE){worker.on("message",data=>worker.onmessage({data}));worker.on("error",e=>worker.onerror(e))}var handlers=[];var knownHandlers=["onExit","onAbort","print","printErr"];for(var handler of knownHandlers){if(Module.propertyIsEnumerable(handler)){handlers.push(handler)}}worker.postMessage({cmd:"load",handlers,wasmMemory,wasmModule})}),async loadWasmModuleToAllWorkers(){if(ENVIRONMENT_IS_PTHREAD){return}let pthreadPoolReady=Promise.all(PThread.unusedWorkers.map(PThread.loadWasmModuleToWorker));return pthreadPoolReady},allocateUnusedWorker(){var worker;var pthreadMainJs=_scriptName;if(Module["mainScriptUrlOrBlob"]){pthreadMainJs=Module["mainScriptUrlOrBlob"];if(typeof pthreadMainJs!="string"){pthreadMainJs=URL.createObjectURL(pthreadMainJs)}}worker=new Worker(pthreadMainJs,{workerData:"em-pthread",name:"em-pthread"});PThread.unusedWorkers.push(worker)},getNewWorker(){if(PThread.unusedWorkers.length==0){PThread.allocateUnusedWorker();PThread.loadWasmModuleToWorker(PThread.unusedWorkers[0])}return PThread.unusedWorkers.pop()}};var onPostRuns=[];var addOnPostRun=cb=>onPostRuns.push(cb);function establishStackSpace(pthread_ptr){var stackHigh=Number((growMemViews(),HEAPU64)[(pthread_ptr+88)/8]);var stackSize=Number((growMemViews(),HEAPU64)[(pthread_ptr+96)/8]);var stackLow=stackHigh-stackSize;_emscripten_stack_set_limits(stackHigh,stackLow);stackRestore(stackHigh)}var wasmTableMirror=[];var getWasmTableEntry=funcPtr=>{funcPtr=Number(funcPtr);var func=wasmTableMirror[funcPtr];if(!func){wasmTableMirror[funcPtr]=func=wasmTable.get(BigInt(funcPtr));if(Asyncify.isAsyncExport(func)){wasmTableMirror[funcPtr]=func=Asyncify.makeAsyncFunction(func)}}return func};var invokeEntryPoint=async(ptr,arg)=>{runtimeKeepaliveCounter=0;noExitRuntime=0;var result=(a1=>WebAssembly.promising(getWasmTableEntry(ptr)).call(null,BigInt(a1)))(arg);function finish(result){if(keepRuntimeAlive()){EXITSTATUS=result;return}__emscripten_thread_exit(result)}result=await result;finish(result)};invokeEntryPoint.isAsync=true;var noExitRuntime=true;var registerTLSInit=tlsInitFunc=>PThread.tlsInitFunctions.push(tlsInitFunc);var wasmMemory;function pthreadCreateProxied(pthread_ptr,attr,startRoutine,arg){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(2,0,1,pthread_ptr,attr,startRoutine,arg);return ___pthread_create_js(pthread_ptr,attr,startRoutine,arg)}var _emscripten_has_threading_support=()=>!!globalThis.SharedArrayBuffer;var INT53_MAX=9007199254740992;var INT53_MIN=-9007199254740992;var bigintToI53Checked=num=>num<INT53_MIN||num>INT53_MAX?NaN:Number(num);function ___pthread_create_js(pthread_ptr,attr,startRoutine,arg){pthread_ptr=bigintToI53Checked(pthread_ptr);attr=bigintToI53Checked(attr);startRoutine=bigintToI53Checked(startRoutine);arg=bigintToI53Checked(arg);if(!_emscripten_has_threading_support()){return 6}var transferList=[];var error=0;if(ENVIRONMENT_IS_PTHREAD&&(transferList.length===0||error)){return pthreadCreateProxied(pthread_ptr,attr,startRoutine,arg)}if(error)return error;var threadParams={startRoutine,pthread_ptr,arg,transferList};if(ENVIRONMENT_IS_PTHREAD){threadParams.cmd="spawnThread";postMessage(threadParams,transferList);return 0}return spawnThread(threadParams)}var syscallGetVarargP=()=>{var ret=Number((growMemViews(),HEAPU64)[SYSCALLS.varargs/8]);SYSCALLS.varargs+=8;return ret};var syscallGetVarargI=()=>{var ret=(growMemViews(),HEAP32)[+SYSCALLS.varargs/4];SYSCALLS.varargs+=4;return ret};var PATH={isAbs:path=>path.charAt(0)==="/",splitPath:filename=>{var splitPathRe=/^(\\/?|)([\\s\\S]*?)((?:\\.{1,2}|[^\\/]+?|)(\\.[^.\\/]*|))(?:[\\/]*)$/;return splitPathRe.exec(filename).slice(1)},normalizeArray:(parts,allowAboveRoot)=>{var up=0;for(var i=parts.length-1;i>=0;i--){var last=parts[i];if(last==="."){parts.splice(i,1)}else if(last===".."){parts.splice(i,1);up++}else if(up){parts.splice(i,1);up--}}if(allowAboveRoot){for(;up;up--){parts.unshift("..")}}return parts},normalize:path=>{var isAbsolute=PATH.isAbs(path),trailingSlash=path.slice(-1)==="/";path=PATH.normalizeArray(path.split("/").filter(p=>!!p),!isAbsolute).join("/");if(!path&&!isAbsolute){path="."}if(path&&trailingSlash){path+="/"}return(isAbsolute?"/":"")+path},dirname:path=>{var result=PATH.splitPath(path),root=result[0],dir=result[1];if(!root&&!dir){return"."}if(dir){dir=dir.slice(0,-1)}return root+dir},basename:path=>path&&path.match(/([^\\/]+|\\/)\\/*$/)[1],join:(...paths)=>PATH.normalize(paths.join("/")),join2:(l,r)=>PATH.normalize(l+"/"+r)};var initRandomFill=()=>view=>view.set(crypto.getRandomValues(new Uint8Array(view.byteLength)));var randomFill=view=>{(randomFill=initRandomFill())(view)};var PATH_FS={resolve:(...args)=>{var resolvedPath="",resolvedAbsolute=false;for(var i=args.length-1;i>=-1&&!resolvedAbsolute;i--){var path=i>=0?args[i]:FS.cwd();if(typeof path!="string"){throw new TypeError("Arguments to path.resolve must be strings")}else if(!path){return""}resolvedPath=path+"/"+resolvedPath;resolvedAbsolute=PATH.isAbs(path)}resolvedPath=PATH.normalizeArray(resolvedPath.split("/").filter(p=>!!p),!resolvedAbsolute).join("/");return(resolvedAbsolute?"/":"")+resolvedPath||"."},relative:(from,to)=>{from=PATH_FS.resolve(from).slice(1);to=PATH_FS.resolve(to).slice(1);function trim(arr){var start=0;for(;start<arr.length;start++){if(arr[start]!=="")break}var end=arr.length-1;for(;end>=0;end--){if(arr[end]!=="")break}if(start>end)return[];return arr.slice(start,end-start+1)}var fromParts=trim(from.split("/"));var toParts=trim(to.split("/"));var length=Math.min(fromParts.length,toParts.length);var samePartsLength=length;for(var i=0;i<length;i++){if(fromParts[i]!==toParts[i]){samePartsLength=i;break}}var outputParts=[];for(var i=samePartsLength;i<fromParts.length;i++){outputParts.push("..")}outputParts=outputParts.concat(toParts.slice(samePartsLength));return outputParts.join("/")}};var UTF8Decoder=globalThis.TextDecoder&&new TextDecoder;var findStringEnd=(heapOrArray,idx,maxBytesToRead,ignoreNul)=>{var maxIdx=idx+maxBytesToRead;if(ignoreNul)return maxIdx;while(heapOrArray[idx]&&!(idx>=maxIdx))++idx;return idx};var UTF8ArrayToString=(heapOrArray,idx=0,maxBytesToRead,ignoreNul)=>{var endPtr=findStringEnd(heapOrArray,idx,maxBytesToRead,ignoreNul);if(endPtr-idx>16&&heapOrArray.buffer&&UTF8Decoder){return UTF8Decoder.decode(heapOrArray.buffer instanceof ArrayBuffer?heapOrArray.subarray(idx,endPtr):heapOrArray.slice(idx,endPtr))}var str="";while(idx<endPtr){var u0=heapOrArray[idx++];if(!(u0&128)){str+=String.fromCharCode(u0);continue}var u1=heapOrArray[idx++]&63;if((u0&224)==192){str+=String.fromCharCode((u0&31)<<6|u1);continue}var u2=heapOrArray[idx++]&63;if((u0&240)==224){u0=(u0&15)<<12|u1<<6|u2}else{u0=(u0&7)<<18|u1<<12|u2<<6|heapOrArray[idx++]&63}if(u0<65536){str+=String.fromCharCode(u0)}else{var ch=u0-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023)}}return str};var FS_stdin_getChar_buffer=[];var lengthBytesUTF8=str=>{var len=0;for(var i=0;i<str.length;++i){var c=str.charCodeAt(i);if(c<=127){len++}else if(c<=2047){len+=2}else if(c>=55296&&c<=57343){len+=4;++i}else{len+=3}}return len};var stringToUTF8Array=(str,heap,outIdx,maxBytesToWrite)=>{if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.codePointAt(i);if(u<=127){if(outIdx>=endIdx)break;heap[outIdx++]=u}else if(u<=2047){if(outIdx+1>=endIdx)break;heap[outIdx++]=192|u>>6;heap[outIdx++]=128|u&63}else if(u<=65535){if(outIdx+2>=endIdx)break;heap[outIdx++]=224|u>>12;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63}else{if(outIdx+3>=endIdx)break;heap[outIdx++]=240|u>>18;heap[outIdx++]=128|u>>12&63;heap[outIdx++]=128|u>>6&63;heap[outIdx++]=128|u&63;i++}}heap[outIdx]=0;return outIdx-startIdx};var intArrayFromString=(stringy,dontAddNull,length)=>{var len=length>0?length:lengthBytesUTF8(stringy)+1;var u8array=new Array(len);var numBytesWritten=stringToUTF8Array(stringy,u8array,0,u8array.length);if(dontAddNull)u8array.length=numBytesWritten;return u8array};var FS_stdin_getChar=()=>{if(!FS_stdin_getChar_buffer.length){var result=null;if(ENVIRONMENT_IS_NODE){var BUFSIZE=256;var buf=Buffer.alloc(BUFSIZE);var bytesRead=0;var fd=process.stdin.fd;try{bytesRead=fs.readSync(fd,buf,0,BUFSIZE)}catch(e){if(e.toString().includes("EOF"))bytesRead=0;else throw e}if(bytesRead>0){result=buf.slice(0,bytesRead).toString("utf-8")}}else if(globalThis.window?.prompt){result=window.prompt("Input: ");if(result!==null){result+="\\n"}}else{}if(!result){return null}FS_stdin_getChar_buffer=intArrayFromString(result,true)}return FS_stdin_getChar_buffer.shift()};var TTY={ttys:[],init(){},shutdown(){},register(dev,ops){TTY.ttys[dev]={input:[],output:[],ops};FS.registerDevice(dev,TTY.stream_ops)},stream_ops:{open(stream){var tty=TTY.ttys[stream.node.rdev];if(!tty){throw new FS.ErrnoError(43)}stream.tty=tty;stream.seekable=false},close(stream){stream.tty.ops.fsync(stream.tty)},fsync(stream){stream.tty.ops.fsync(stream.tty)},read(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.get_char){throw new FS.ErrnoError(60)}var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=stream.tty.ops.get_char(stream.tty)}catch(e){throw new FS.ErrnoError(29)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(6)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result}if(bytesRead){stream.node.atime=Date.now()}return bytesRead},write(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.put_char){throw new FS.ErrnoError(60)}try{for(var i=0;i<length;i++){stream.tty.ops.put_char(stream.tty,buffer[offset+i])}}catch(e){throw new FS.ErrnoError(29)}if(length){stream.node.mtime=stream.node.ctime=Date.now()}return i}},default_tty_ops:{get_char(tty){return FS_stdin_getChar()},put_char(tty,val){if(val===null||val===10){out(UTF8ArrayToString(tty.output));tty.output=[]}else{if(val!=0)tty.output.push(val)}},fsync(tty){if(tty.output?.length>0){out(UTF8ArrayToString(tty.output));tty.output=[]}},ioctl_tcgets(tty){return{c_iflag:25856,c_oflag:5,c_cflag:191,c_lflag:35387,c_cc:[3,28,127,21,4,0,1,0,17,19,26,0,18,15,23,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}},ioctl_tcsets(tty,optional_actions,data){return 0},ioctl_tiocgwinsz(tty){return[24,80]}},default_tty1_ops:{put_char(tty,val){if(val===null||val===10){err(UTF8ArrayToString(tty.output));tty.output=[]}else{if(val!=0)tty.output.push(val)}},fsync(tty){if(tty.output?.length>0){err(UTF8ArrayToString(tty.output));tty.output=[]}}}};var zeroMemory=(ptr,size)=>(growMemViews(),HEAPU8).fill(0,ptr,ptr+size);var alignMemory=(size,alignment)=>Math.ceil(size/alignment)*alignment;var mmapAlloc=size=>{size=alignMemory(size,65536);var ptr=_emscripten_builtin_memalign(65536,size);if(ptr)zeroMemory(ptr,size);return ptr};var MEMFS={ops_table:null,mount(mount){return MEMFS.createNode(null,"/",16895,0)},createNode(parent,name,mode,dev){if(FS.isBlkdev(mode)||FS.isFIFO(mode)){throw new FS.ErrnoError(63)}MEMFS.ops_table||={dir:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,lookup:MEMFS.node_ops.lookup,mknod:MEMFS.node_ops.mknod,rename:MEMFS.node_ops.rename,unlink:MEMFS.node_ops.unlink,rmdir:MEMFS.node_ops.rmdir,readdir:MEMFS.node_ops.readdir,symlink:MEMFS.node_ops.symlink},stream:{llseek:MEMFS.stream_ops.llseek}},file:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:{llseek:MEMFS.stream_ops.llseek,read:MEMFS.stream_ops.read,write:MEMFS.stream_ops.write,mmap:MEMFS.stream_ops.mmap,msync:MEMFS.stream_ops.msync}},link:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,readlink:MEMFS.node_ops.readlink},stream:{}},chrdev:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:FS.chrdev_stream_ops}};var node=FS.createNode(parent,name,mode,dev);if(FS.isDir(node.mode)){node.node_ops=MEMFS.ops_table.dir.node;node.stream_ops=MEMFS.ops_table.dir.stream;node.contents={}}else if(FS.isFile(node.mode)){node.node_ops=MEMFS.ops_table.file.node;node.stream_ops=MEMFS.ops_table.file.stream;node.usedBytes=0;node.contents=null}else if(FS.isLink(node.mode)){node.node_ops=MEMFS.ops_table.link.node;node.stream_ops=MEMFS.ops_table.link.stream}else if(FS.isChrdev(node.mode)){node.node_ops=MEMFS.ops_table.chrdev.node;node.stream_ops=MEMFS.ops_table.chrdev.stream}node.atime=node.mtime=node.ctime=Date.now();if(parent){parent.contents[name]=node;parent.atime=parent.mtime=parent.ctime=node.atime}return node},getFileDataAsTypedArray(node){if(!node.contents)return new Uint8Array(0);if(node.contents.subarray)return node.contents.subarray(0,node.usedBytes);return new Uint8Array(node.contents)},expandFileStorage(node,newCapacity){var prevCapacity=node.contents?node.contents.length:0;if(prevCapacity>=newCapacity)return;var CAPACITY_DOUBLING_MAX=1024*1024;newCapacity=Math.max(newCapacity,prevCapacity*(prevCapacity<CAPACITY_DOUBLING_MAX?2:1.125)>>>0);if(prevCapacity!=0)newCapacity=Math.max(newCapacity,256);var oldContents=node.contents;node.contents=new Uint8Array(newCapacity);if(node.usedBytes>0)node.contents.set(oldContents.subarray(0,node.usedBytes),0)},resizeFileStorage(node,newSize){if(node.usedBytes==newSize)return;if(newSize==0){node.contents=null;node.usedBytes=0}else{var oldContents=node.contents;node.contents=new Uint8Array(newSize);if(oldContents){node.contents.set(oldContents.subarray(0,Math.min(newSize,node.usedBytes)))}node.usedBytes=newSize}},node_ops:{getattr(node){var attr={};attr.dev=FS.isChrdev(node.mode)?node.id:1;attr.ino=node.id;attr.mode=node.mode;attr.nlink=1;attr.uid=0;attr.gid=0;attr.rdev=node.rdev;if(FS.isDir(node.mode)){attr.size=4096}else if(FS.isFile(node.mode)){attr.size=node.usedBytes}else if(FS.isLink(node.mode)){attr.size=node.link.length}else{attr.size=0}attr.atime=new Date(node.atime);attr.mtime=new Date(node.mtime);attr.ctime=new Date(node.ctime);attr.blksize=4096;attr.blocks=Math.ceil(attr.size/attr.blksize);return attr},setattr(node,attr){for(const key of["mode","atime","mtime","ctime"]){if(attr[key]!=null){node[key]=attr[key]}}if(attr.size!==undefined){MEMFS.resizeFileStorage(node,attr.size)}},lookup(parent,name){if(!MEMFS.doesNotExistError){MEMFS.doesNotExistError=new FS.ErrnoError(44);MEMFS.doesNotExistError.stack="<generic error, no stack>"}throw MEMFS.doesNotExistError},mknod(parent,name,mode,dev){return MEMFS.createNode(parent,name,mode,dev)},rename(old_node,new_dir,new_name){var new_node;try{new_node=FS.lookupNode(new_dir,new_name)}catch(e){}if(new_node){if(FS.isDir(old_node.mode)){for(var i in new_node.contents){throw new FS.ErrnoError(55)}}FS.hashRemoveNode(new_node)}delete old_node.parent.contents[old_node.name];new_dir.contents[new_name]=old_node;old_node.name=new_name;new_dir.ctime=new_dir.mtime=old_node.parent.ctime=old_node.parent.mtime=Date.now()},unlink(parent,name){delete parent.contents[name];parent.ctime=parent.mtime=Date.now()},rmdir(parent,name){var node=FS.lookupNode(parent,name);for(var i in node.contents){throw new FS.ErrnoError(55)}delete parent.contents[name];parent.ctime=parent.mtime=Date.now()},readdir(node){return[".","..",...Object.keys(node.contents)]},symlink(parent,newname,oldpath){var node=MEMFS.createNode(parent,newname,511|40960,0);node.link=oldpath;return node},readlink(node){if(!FS.isLink(node.mode)){throw new FS.ErrnoError(28)}return node.link}},stream_ops:{read(stream,buffer,offset,length,position){var contents=stream.node.contents;if(position>=stream.node.usedBytes)return 0;var size=Math.min(stream.node.usedBytes-position,length);if(size>8&&contents.subarray){buffer.set(contents.subarray(position,position+size),offset)}else{for(var i=0;i<size;i++)buffer[offset+i]=contents[position+i]}return size},write(stream,buffer,offset,length,position,canOwn){if(buffer.buffer===(growMemViews(),HEAP8).buffer){canOwn=false}if(!length)return 0;var node=stream.node;node.mtime=node.ctime=Date.now();if(buffer.subarray&&(!node.contents||node.contents.subarray)){if(canOwn){node.contents=buffer.subarray(offset,offset+length);node.usedBytes=length;return length}else if(node.usedBytes===0&&position===0){node.contents=buffer.slice(offset,offset+length);node.usedBytes=length;return length}else if(position+length<=node.usedBytes){node.contents.set(buffer.subarray(offset,offset+length),position);return length}}MEMFS.expandFileStorage(node,position+length);if(node.contents.subarray&&buffer.subarray){node.contents.set(buffer.subarray(offset,offset+length),position)}else{for(var i=0;i<length;i++){node.contents[position+i]=buffer[offset+i]}}node.usedBytes=Math.max(node.usedBytes,position+length);return length},llseek(stream,offset,whence){var position=offset;if(whence===1){position+=stream.position}else if(whence===2){if(FS.isFile(stream.node.mode)){position+=stream.node.usedBytes}}if(position<0){throw new FS.ErrnoError(28)}return position},mmap(stream,length,position,prot,flags){if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(43)}var ptr;var allocated;var contents=stream.node.contents;if(!(flags&2)&&contents&&contents.buffer===(growMemViews(),HEAP8).buffer){allocated=false;ptr=contents.byteOffset}else{allocated=true;ptr=mmapAlloc(length);if(!ptr){throw new FS.ErrnoError(48)}if(contents){if(position>0||position+length<contents.length){if(contents.subarray){contents=contents.subarray(position,position+length)}else{contents=Array.prototype.slice.call(contents,position,position+length)}}(growMemViews(),HEAP8).set(contents,ptr)}}return{ptr,allocated}},msync(stream,buffer,offset,length,mmapFlags){MEMFS.stream_ops.write(stream,buffer,0,length,offset,false);return 0}}};var FS_modeStringToFlags=str=>{var flagModes={r:0,"r+":2,w:512|64|1,"w+":512|64|2,a:1024|64|1,"a+":1024|64|2};var flags=flagModes[str];if(typeof flags=="undefined"){throw new Error(`Unknown file open mode: ${str}`)}return flags};var FS_getMode=(canRead,canWrite)=>{var mode=0;if(canRead)mode|=292|73;if(canWrite)mode|=146;return mode};var asyncLoad=async url=>{var arrayBuffer=await readAsync(url);return new Uint8Array(arrayBuffer)};var FS_createDataFile=(...args)=>FS.createDataFile(...args);var getUniqueRunDependency=id=>id;var preloadPlugins=[];var FS_handledByPreloadPlugin=async(byteArray,fullname)=>{if(typeof Browser!="undefined")Browser.init();for(var plugin of preloadPlugins){if(plugin["canHandle"](fullname)){return plugin["handle"](byteArray,fullname)}}return byteArray};var FS_preloadFile=async(parent,name,url,canRead,canWrite,dontCreateFile,canOwn,preFinish)=>{var fullname=name?PATH_FS.resolve(PATH.join2(parent,name)):parent;var dep=getUniqueRunDependency(`cp ${fullname}`);addRunDependency(dep);try{var byteArray=url;if(typeof url=="string"){byteArray=await asyncLoad(url)}byteArray=await FS_handledByPreloadPlugin(byteArray,fullname);preFinish?.();if(!dontCreateFile){FS_createDataFile(parent,name,byteArray,canRead,canWrite,canOwn)}}finally{removeRunDependency(dep)}};var FS_createPreloadedFile=(parent,name,url,canRead,canWrite,onload,onerror,dontCreateFile,canOwn,preFinish)=>{FS_preloadFile(parent,name,url,canRead,canWrite,dontCreateFile,canOwn,preFinish).then(onload).catch(onerror)};var FS={root:null,mounts:[],devices:{},streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,filesystems:null,syncFSRequests:0,readFiles:{},ErrnoError:class{name="ErrnoError";constructor(errno){this.errno=errno}},FSStream:class{shared={};get object(){return this.node}set object(val){this.node=val}get isRead(){return(this.flags&2097155)!==1}get isWrite(){return(this.flags&2097155)!==0}get isAppend(){return this.flags&1024}get flags(){return this.shared.flags}set flags(val){this.shared.flags=val}get position(){return this.shared.position}set position(val){this.shared.position=val}},FSNode:class{node_ops={};stream_ops={};readMode=292|73;writeMode=146;mounted=null;constructor(parent,name,mode,rdev){if(!parent){parent=this}this.parent=parent;this.mount=parent.mount;this.id=FS.nextInode++;this.name=name;this.mode=mode;this.rdev=rdev;this.atime=this.mtime=this.ctime=Date.now()}get read(){return(this.mode&this.readMode)===this.readMode}set read(val){val?this.mode|=this.readMode:this.mode&=~this.readMode}get write(){return(this.mode&this.writeMode)===this.writeMode}set write(val){val?this.mode|=this.writeMode:this.mode&=~this.writeMode}get isFolder(){return FS.isDir(this.mode)}get isDevice(){return FS.isChrdev(this.mode)}},lookupPath(path,opts={}){if(!path){throw new FS.ErrnoError(44)}opts.follow_mount??=true;if(!PATH.isAbs(path)){path=FS.cwd()+"/"+path}linkloop:for(var nlinks=0;nlinks<40;nlinks++){var parts=path.split("/").filter(p=>!!p);var current=FS.root;var current_path="/";for(var i=0;i<parts.length;i++){var islast=i===parts.length-1;if(islast&&opts.parent){break}if(parts[i]==="."){continue}if(parts[i]===".."){current_path=PATH.dirname(current_path);if(FS.isRoot(current)){path=current_path+"/"+parts.slice(i+1).join("/");nlinks--;continue linkloop}else{current=current.parent}continue}current_path=PATH.join2(current_path,parts[i]);try{current=FS.lookupNode(current,parts[i])}catch(e){if(e?.errno===44&&islast&&opts.noent_okay){return{path:current_path}}throw e}if(FS.isMountpoint(current)&&(!islast||opts.follow_mount)){current=current.mounted.root}if(FS.isLink(current.mode)&&(!islast||opts.follow)){if(!current.node_ops.readlink){throw new FS.ErrnoError(52)}var link=current.node_ops.readlink(current);if(!PATH.isAbs(link)){link=PATH.dirname(current_path)+"/"+link}path=link+"/"+parts.slice(i+1).join("/");continue linkloop}}return{path:current_path,node:current}}throw new FS.ErrnoError(32)},getPath(node){var path;while(true){if(FS.isRoot(node)){var mount=node.mount.mountpoint;if(!path)return mount;return mount[mount.length-1]!=="/"?`${mount}/${path}`:mount+path}path=path?`${node.name}/${path}`:node.name;node=node.parent}},hashName(parentid,name){var hash=0;for(var i=0;i<name.length;i++){hash=(hash<<5)-hash+name.charCodeAt(i)|0}return(parentid+hash>>>0)%FS.nameTable.length},hashAddNode(node){var hash=FS.hashName(node.parent.id,node.name);node.name_next=FS.nameTable[hash];FS.nameTable[hash]=node},hashRemoveNode(node){var hash=FS.hashName(node.parent.id,node.name);if(FS.nameTable[hash]===node){FS.nameTable[hash]=node.name_next}else{var current=FS.nameTable[hash];while(current){if(current.name_next===node){current.name_next=node.name_next;break}current=current.name_next}}},lookupNode(parent,name){var errCode=FS.mayLookup(parent);if(errCode){throw new FS.ErrnoError(errCode)}var hash=FS.hashName(parent.id,name);for(var node=FS.nameTable[hash];node;node=node.name_next){var nodeName=node.name;if(node.parent.id===parent.id&&nodeName===name){return node}}return FS.lookup(parent,name)},createNode(parent,name,mode,rdev){var node=new FS.FSNode(parent,name,mode,rdev);FS.hashAddNode(node);return node},destroyNode(node){FS.hashRemoveNode(node)},isRoot(node){return node===node.parent},isMountpoint(node){return!!node.mounted},isFile(mode){return(mode&61440)===32768},isDir(mode){return(mode&61440)===16384},isLink(mode){return(mode&61440)===40960},isChrdev(mode){return(mode&61440)===8192},isBlkdev(mode){return(mode&61440)===24576},isFIFO(mode){return(mode&61440)===4096},isSocket(mode){return(mode&49152)===49152},flagsToPermissionString(flag){var perms=["r","w","rw"][flag&3];if(flag&512){perms+="w"}return perms},nodePermissions(node,perms){if(FS.ignorePermissions){return 0}if(perms.includes("r")&&!(node.mode&292)){return 2}else if(perms.includes("w")&&!(node.mode&146)){return 2}else if(perms.includes("x")&&!(node.mode&73)){return 2}return 0},mayLookup(dir){if(!FS.isDir(dir.mode))return 54;var errCode=FS.nodePermissions(dir,"x");if(errCode)return errCode;if(!dir.node_ops.lookup)return 2;return 0},mayCreate(dir,name){if(!FS.isDir(dir.mode)){return 54}try{var node=FS.lookupNode(dir,name);return 20}catch(e){}return FS.nodePermissions(dir,"wx")},mayDelete(dir,name,isdir){var node;try{node=FS.lookupNode(dir,name)}catch(e){return e.errno}var errCode=FS.nodePermissions(dir,"wx");if(errCode){return errCode}if(isdir){if(!FS.isDir(node.mode)){return 54}if(FS.isRoot(node)||FS.getPath(node)===FS.cwd()){return 10}}else{if(FS.isDir(node.mode)){return 31}}return 0},mayOpen(node,flags){if(!node){return 44}if(FS.isLink(node.mode)){return 32}else if(FS.isDir(node.mode)){if(FS.flagsToPermissionString(flags)!=="r"||flags&(512|64)){return 31}}return FS.nodePermissions(node,FS.flagsToPermissionString(flags))},checkOpExists(op,err){if(!op){throw new FS.ErrnoError(err)}return op},MAX_OPEN_FDS:4096,nextfd(){for(var fd=0;fd<=FS.MAX_OPEN_FDS;fd++){if(!FS.streams[fd]){return fd}}throw new FS.ErrnoError(33)},getStreamChecked(fd){var stream=FS.getStream(fd);if(!stream){throw new FS.ErrnoError(8)}return stream},getStream:fd=>FS.streams[fd],createStream(stream,fd=-1){stream=Object.assign(new FS.FSStream,stream);if(fd==-1){fd=FS.nextfd()}stream.fd=fd;FS.streams[fd]=stream;return stream},closeStream(fd){FS.streams[fd]=null},dupStream(origStream,fd=-1){var stream=FS.createStream(origStream,fd);stream.stream_ops?.dup?.(stream);return stream},doSetAttr(stream,node,attr){var setattr=stream?.stream_ops.setattr;var arg=setattr?stream:node;setattr??=node.node_ops.setattr;FS.checkOpExists(setattr,63);setattr(arg,attr)},chrdev_stream_ops:{open(stream){var device=FS.getDevice(stream.node.rdev);stream.stream_ops=device.stream_ops;stream.stream_ops.open?.(stream)},llseek(){throw new FS.ErrnoError(70)}},major:dev=>dev>>8,minor:dev=>dev&255,makedev:(ma,mi)=>ma<<8|mi,registerDevice(dev,ops){FS.devices[dev]={stream_ops:ops}},getDevice:dev=>FS.devices[dev],getMounts(mount){var mounts=[];var check=[mount];while(check.length){var m=check.pop();mounts.push(m);check.push(...m.mounts)}return mounts},syncfs(populate,callback){if(typeof populate=="function"){callback=populate;populate=false}FS.syncFSRequests++;if(FS.syncFSRequests>1){err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`)}var mounts=FS.getMounts(FS.root.mount);var completed=0;function doCallback(errCode){FS.syncFSRequests--;return callback(errCode)}function done(errCode){if(errCode){if(!done.errored){done.errored=true;return doCallback(errCode)}return}if(++completed>=mounts.length){doCallback(null)}}for(var mount of mounts){if(mount.type.syncfs){mount.type.syncfs(mount,populate,done)}else{done(null)}}},mount(type,opts,mountpoint){var root=mountpoint==="/";var pseudo=!mountpoint;var node;if(root&&FS.root){throw new FS.ErrnoError(10)}else if(!root&&!pseudo){var lookup=FS.lookupPath(mountpoint,{follow_mount:false});mountpoint=lookup.path;node=lookup.node;if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}if(!FS.isDir(node.mode)){throw new FS.ErrnoError(54)}}var mount={type,opts,mountpoint,mounts:[]};var mountRoot=type.mount(mount);mountRoot.mount=mount;mount.root=mountRoot;if(root){FS.root=mountRoot}else if(node){node.mounted=mount;if(node.mount){node.mount.mounts.push(mount)}}return mountRoot},unmount(mountpoint){var lookup=FS.lookupPath(mountpoint,{follow_mount:false});if(!FS.isMountpoint(lookup.node)){throw new FS.ErrnoError(28)}var node=lookup.node;var mount=node.mounted;var mounts=FS.getMounts(mount);for(var[hash,current]of Object.entries(FS.nameTable)){while(current){var next=current.name_next;if(mounts.includes(current.mount)){FS.destroyNode(current)}current=next}}node.mounted=null;var idx=node.mount.mounts.indexOf(mount);node.mount.mounts.splice(idx,1)},lookup(parent,name){return parent.node_ops.lookup(parent,name)},mknod(path,mode,dev){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);if(!name){throw new FS.ErrnoError(28)}if(name==="."||name===".."){throw new FS.ErrnoError(20)}var errCode=FS.mayCreate(parent,name);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.mknod){throw new FS.ErrnoError(63)}return parent.node_ops.mknod(parent,name,mode,dev)},statfs(path){return FS.statfsNode(FS.lookupPath(path,{follow:true}).node)},statfsStream(stream){return FS.statfsNode(stream.node)},statfsNode(node){var rtn={bsize:4096,frsize:4096,blocks:1e6,bfree:5e5,bavail:5e5,files:FS.nextInode,ffree:FS.nextInode-1,fsid:42,flags:2,namelen:255};if(node.node_ops.statfs){Object.assign(rtn,node.node_ops.statfs(node.mount.opts.root))}return rtn},create(path,mode=438){mode&=4095;mode|=32768;return FS.mknod(path,mode,0)},mkdir(path,mode=511){mode&=511|512;mode|=16384;return FS.mknod(path,mode,0)},mkdirTree(path,mode){var dirs=path.split("/");var d="";for(var dir of dirs){if(!dir)continue;if(d||PATH.isAbs(path))d+="/";d+=dir;try{FS.mkdir(d,mode)}catch(e){if(e.errno!=20)throw e}}},mkdev(path,mode,dev){if(typeof dev=="undefined"){dev=mode;mode=438}mode|=8192;return FS.mknod(path,mode,dev)},symlink(oldpath,newpath){if(!PATH_FS.resolve(oldpath)){throw new FS.ErrnoError(44)}var lookup=FS.lookupPath(newpath,{parent:true});var parent=lookup.node;if(!parent){throw new FS.ErrnoError(44)}var newname=PATH.basename(newpath);var errCode=FS.mayCreate(parent,newname);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.symlink){throw new FS.ErrnoError(63)}return parent.node_ops.symlink(parent,newname,oldpath)},rename(old_path,new_path){var old_dirname=PATH.dirname(old_path);var new_dirname=PATH.dirname(new_path);var old_name=PATH.basename(old_path);var new_name=PATH.basename(new_path);var lookup,old_dir,new_dir;lookup=FS.lookupPath(old_path,{parent:true});old_dir=lookup.node;lookup=FS.lookupPath(new_path,{parent:true});new_dir=lookup.node;if(!old_dir||!new_dir)throw new FS.ErrnoError(44);if(old_dir.mount!==new_dir.mount){throw new FS.ErrnoError(75)}var old_node=FS.lookupNode(old_dir,old_name);var relative=PATH_FS.relative(old_path,new_dirname);if(relative.charAt(0)!=="."){throw new FS.ErrnoError(28)}relative=PATH_FS.relative(new_path,old_dirname);if(relative.charAt(0)!=="."){throw new FS.ErrnoError(55)}var new_node;try{new_node=FS.lookupNode(new_dir,new_name)}catch(e){}if(old_node===new_node){return}var isdir=FS.isDir(old_node.mode);var errCode=FS.mayDelete(old_dir,old_name,isdir);if(errCode){throw new FS.ErrnoError(errCode)}errCode=new_node?FS.mayDelete(new_dir,new_name,isdir):FS.mayCreate(new_dir,new_name);if(errCode){throw new FS.ErrnoError(errCode)}if(!old_dir.node_ops.rename){throw new FS.ErrnoError(63)}if(FS.isMountpoint(old_node)||new_node&&FS.isMountpoint(new_node)){throw new FS.ErrnoError(10)}if(new_dir!==old_dir){errCode=FS.nodePermissions(old_dir,"w");if(errCode){throw new FS.ErrnoError(errCode)}}FS.hashRemoveNode(old_node);try{old_dir.node_ops.rename(old_node,new_dir,new_name);old_node.parent=new_dir}catch(e){throw e}finally{FS.hashAddNode(old_node)}},rmdir(path){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var errCode=FS.mayDelete(parent,name,true);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.rmdir){throw new FS.ErrnoError(63)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}parent.node_ops.rmdir(parent,name);FS.destroyNode(node)},readdir(path){var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;var readdir=FS.checkOpExists(node.node_ops.readdir,54);return readdir(node)},unlink(path){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;if(!parent){throw new FS.ErrnoError(44)}var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var errCode=FS.mayDelete(parent,name,false);if(errCode){throw new FS.ErrnoError(errCode)}if(!parent.node_ops.unlink){throw new FS.ErrnoError(63)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(10)}parent.node_ops.unlink(parent,name);FS.destroyNode(node)},readlink(path){var lookup=FS.lookupPath(path);var link=lookup.node;if(!link){throw new FS.ErrnoError(44)}if(!link.node_ops.readlink){throw new FS.ErrnoError(28)}return link.node_ops.readlink(link)},stat(path,dontFollow){var lookup=FS.lookupPath(path,{follow:!dontFollow});var node=lookup.node;var getattr=FS.checkOpExists(node.node_ops.getattr,63);return getattr(node)},fstat(fd){var stream=FS.getStreamChecked(fd);var node=stream.node;var getattr=stream.stream_ops.getattr;var arg=getattr?stream:node;getattr??=node.node_ops.getattr;FS.checkOpExists(getattr,63);return getattr(arg)},lstat(path){return FS.stat(path,true)},doChmod(stream,node,mode,dontFollow){FS.doSetAttr(stream,node,{mode:mode&4095|node.mode&~4095,ctime:Date.now(),dontFollow})},chmod(path,mode,dontFollow){var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node}else{node=path}FS.doChmod(null,node,mode,dontFollow)},lchmod(path,mode){FS.chmod(path,mode,true)},fchmod(fd,mode){var stream=FS.getStreamChecked(fd);FS.doChmod(stream,stream.node,mode,false)},doChown(stream,node,dontFollow){FS.doSetAttr(stream,node,{timestamp:Date.now(),dontFollow})},chown(path,uid,gid,dontFollow){var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node}else{node=path}FS.doChown(null,node,dontFollow)},lchown(path,uid,gid){FS.chown(path,uid,gid,true)},fchown(fd,uid,gid){var stream=FS.getStreamChecked(fd);FS.doChown(stream,stream.node,false)},doTruncate(stream,node,len){if(FS.isDir(node.mode)){throw new FS.ErrnoError(31)}if(!FS.isFile(node.mode)){throw new FS.ErrnoError(28)}var errCode=FS.nodePermissions(node,"w");if(errCode){throw new FS.ErrnoError(errCode)}FS.doSetAttr(stream,node,{size:len,timestamp:Date.now()})},truncate(path,len){if(len<0){throw new FS.ErrnoError(28)}var node;if(typeof path=="string"){var lookup=FS.lookupPath(path,{follow:true});node=lookup.node}else{node=path}FS.doTruncate(null,node,len)},ftruncate(fd,len){var stream=FS.getStreamChecked(fd);if(len<0||(stream.flags&2097155)===0){throw new FS.ErrnoError(28)}FS.doTruncate(stream,stream.node,len)},utime(path,atime,mtime){var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;var setattr=FS.checkOpExists(node.node_ops.setattr,63);setattr(node,{atime,mtime})},open(path,flags,mode=438){if(path===""){throw new FS.ErrnoError(44)}flags=typeof flags=="string"?FS_modeStringToFlags(flags):flags;if(flags&64){mode=mode&4095|32768}else{mode=0}var node;var isDirPath;if(typeof path=="object"){node=path}else{isDirPath=path.endsWith("/");var lookup=FS.lookupPath(path,{follow:!(flags&131072),noent_okay:true});node=lookup.node;path=lookup.path}var created=false;if(flags&64){if(node){if(flags&128){throw new FS.ErrnoError(20)}}else if(isDirPath){throw new FS.ErrnoError(31)}else{node=FS.mknod(path,mode|511,0);created=true}}if(!node){throw new FS.ErrnoError(44)}if(FS.isChrdev(node.mode)){flags&=~512}if(flags&65536&&!FS.isDir(node.mode)){throw new FS.ErrnoError(54)}if(!created){var errCode=FS.mayOpen(node,flags);if(errCode){throw new FS.ErrnoError(errCode)}}if(flags&512&&!created){FS.truncate(node,0)}flags&=~(128|512|131072);var stream=FS.createStream({node,path:FS.getPath(node),flags,seekable:true,position:0,stream_ops:node.stream_ops,ungotten:[],error:false});if(stream.stream_ops.open){stream.stream_ops.open(stream)}if(created){FS.chmod(node,mode&511)}if(Module["logReadFiles"]&&!(flags&1)){if(!(path in FS.readFiles)){FS.readFiles[path]=1}}return stream},close(stream){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(stream.getdents)stream.getdents=null;try{if(stream.stream_ops.close){stream.stream_ops.close(stream)}}catch(e){throw e}finally{FS.closeStream(stream.fd)}stream.fd=null},isClosed(stream){return stream.fd===null},llseek(stream,offset,whence){if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if(!stream.seekable||!stream.stream_ops.llseek){throw new FS.ErrnoError(70)}if(whence!=0&&whence!=1&&whence!=2){throw new FS.ErrnoError(28)}stream.position=stream.stream_ops.llseek(stream,offset,whence);stream.ungotten=[];return stream.position},read(stream,buffer,offset,length,position){if(length<0||position<0){throw new FS.ErrnoError(28)}if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===1){throw new FS.ErrnoError(8)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(31)}if(!stream.stream_ops.read){throw new FS.ErrnoError(28)}var seeking=typeof position!="undefined";if(!seeking){position=stream.position}else if(!stream.seekable){throw new FS.ErrnoError(70)}var bytesRead=stream.stream_ops.read(stream,buffer,offset,length,position);if(!seeking)stream.position+=bytesRead;return bytesRead},write(stream,buffer,offset,length,position,canOwn){if(length<0||position<0){throw new FS.ErrnoError(28)}if(FS.isClosed(stream)){throw new FS.ErrnoError(8)}if((stream.flags&2097155)===0){throw new FS.ErrnoError(8)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(31)}if(!stream.stream_ops.write){throw new FS.ErrnoError(28)}if(stream.seekable&&stream.flags&1024){FS.llseek(stream,0,2)}var seeking=typeof position!="undefined";if(!seeking){position=stream.position}else if(!stream.seekable){throw new FS.ErrnoError(70)}var bytesWritten=stream.stream_ops.write(stream,buffer,offset,length,position,canOwn);if(!seeking)stream.position+=bytesWritten;return bytesWritten},mmap(stream,length,position,prot,flags){if((prot&2)!==0&&(flags&2)===0&&(stream.flags&2097155)!==2){throw new FS.ErrnoError(2)}if((stream.flags&2097155)===1){throw new FS.ErrnoError(2)}if(!stream.stream_ops.mmap){throw new FS.ErrnoError(43)}if(!length){throw new FS.ErrnoError(28)}return stream.stream_ops.mmap(stream,length,position,prot,flags)},msync(stream,buffer,offset,length,mmapFlags){if(!stream.stream_ops.msync){return 0}return stream.stream_ops.msync(stream,buffer,offset,length,mmapFlags)},ioctl(stream,cmd,arg){if(!stream.stream_ops.ioctl){throw new FS.ErrnoError(59)}return stream.stream_ops.ioctl(stream,cmd,arg)},readFile(path,opts={}){opts.flags=opts.flags||0;opts.encoding=opts.encoding||"binary";if(opts.encoding!=="utf8"&&opts.encoding!=="binary"){abort(`Invalid encoding type "${opts.encoding}"`)}var stream=FS.open(path,opts.flags);var stat=FS.stat(path);var length=stat.size;var buf=new Uint8Array(length);FS.read(stream,buf,0,length,0);if(opts.encoding==="utf8"){buf=UTF8ArrayToString(buf)}FS.close(stream);return buf},writeFile(path,data,opts={}){opts.flags=opts.flags||577;var stream=FS.open(path,opts.flags,opts.mode);if(typeof data=="string"){data=new Uint8Array(intArrayFromString(data,true))}if(ArrayBuffer.isView(data)){FS.write(stream,data,0,data.byteLength,undefined,opts.canOwn)}else{abort("Unsupported data type")}FS.close(stream)},cwd:()=>FS.currentPath,chdir(path){var lookup=FS.lookupPath(path,{follow:true});if(lookup.node===null){throw new FS.ErrnoError(44)}if(!FS.isDir(lookup.node.mode)){throw new FS.ErrnoError(54)}var errCode=FS.nodePermissions(lookup.node,"x");if(errCode){throw new FS.ErrnoError(errCode)}FS.currentPath=lookup.path},createDefaultDirectories(){FS.mkdir("/tmp");FS.mkdir("/home");FS.mkdir("/home/web_user")},createDefaultDevices(){FS.mkdir("/dev");FS.registerDevice(FS.makedev(1,3),{read:()=>0,write:(stream,buffer,offset,length,pos)=>length,llseek:()=>0});FS.mkdev("/dev/null",FS.makedev(1,3));TTY.register(FS.makedev(5,0),TTY.default_tty_ops);TTY.register(FS.makedev(6,0),TTY.default_tty1_ops);FS.mkdev("/dev/tty",FS.makedev(5,0));FS.mkdev("/dev/tty1",FS.makedev(6,0));var randomBuffer=new Uint8Array(1024),randomLeft=0;var randomByte=()=>{if(randomLeft===0){randomFill(randomBuffer);randomLeft=randomBuffer.byteLength}return randomBuffer[--randomLeft]};FS.createDevice("/dev","random",randomByte);FS.createDevice("/dev","urandom",randomByte);FS.mkdir("/dev/shm");FS.mkdir("/dev/shm/tmp")},createSpecialDirectories(){FS.mkdir("/proc");var proc_self=FS.mkdir("/proc/self");FS.mkdir("/proc/self/fd");FS.mount({mount(){var node=FS.createNode(proc_self,"fd",16895,73);node.stream_ops={llseek:MEMFS.stream_ops.llseek};node.node_ops={lookup(parent,name){var fd=+name;var stream=FS.getStreamChecked(fd);var ret={parent:null,mount:{mountpoint:"fake"},node_ops:{readlink:()=>stream.path},id:fd+1};ret.parent=ret;return ret},readdir(){return Array.from(FS.streams.entries()).filter(([k,v])=>v).map(([k,v])=>k.toString())}};return node}},{},"/proc/self/fd")},createStandardStreams(input,output,error){if(input){FS.createDevice("/dev","stdin",input)}else{FS.symlink("/dev/tty","/dev/stdin")}if(output){FS.createDevice("/dev","stdout",null,output)}else{FS.symlink("/dev/tty","/dev/stdout")}if(error){FS.createDevice("/dev","stderr",null,error)}else{FS.symlink("/dev/tty1","/dev/stderr")}var stdin=FS.open("/dev/stdin",0);var stdout=FS.open("/dev/stdout",1);var stderr=FS.open("/dev/stderr",1)},staticInit(){FS.nameTable=new Array(4096);FS.mount(MEMFS,{},"/");FS.createDefaultDirectories();FS.createDefaultDevices();FS.createSpecialDirectories();FS.filesystems={MEMFS}},init(input,output,error){FS.initialized=true;input??=Module["stdin"];output??=Module["stdout"];error??=Module["stderr"];FS.createStandardStreams(input,output,error)},quit(){FS.initialized=false;for(var stream of FS.streams){if(stream){FS.close(stream)}}},findObject(path,dontResolveLastLink){var ret=FS.analyzePath(path,dontResolveLastLink);if(!ret.exists){return null}return ret.object},analyzePath(path,dontResolveLastLink){try{var lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});path=lookup.path}catch(e){}var ret={isRoot:false,exists:false,error:0,name:null,path:null,object:null,parentExists:false,parentPath:null,parentObject:null};try{var lookup=FS.lookupPath(path,{parent:true});ret.parentExists=true;ret.parentPath=lookup.path;ret.parentObject=lookup.node;ret.name=PATH.basename(path);lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});ret.exists=true;ret.path=lookup.path;ret.object=lookup.node;ret.name=lookup.node.name;ret.isRoot=lookup.path==="/"}catch(e){ret.error=e.errno}return ret},createPath(parent,path,canRead,canWrite){parent=typeof parent=="string"?parent:FS.getPath(parent);var parts=path.split("/").reverse();while(parts.length){var part=parts.pop();if(!part)continue;var current=PATH.join2(parent,part);try{FS.mkdir(current)}catch(e){if(e.errno!=20)throw e}parent=current}return current},createFile(parent,name,properties,canRead,canWrite){var path=PATH.join2(typeof parent=="string"?parent:FS.getPath(parent),name);var mode=FS_getMode(canRead,canWrite);return FS.create(path,mode)},createDataFile(parent,name,data,canRead,canWrite,canOwn){var path=name;if(parent){parent=typeof parent=="string"?parent:FS.getPath(parent);path=name?PATH.join2(parent,name):parent}var mode=FS_getMode(canRead,canWrite);var node=FS.create(path,mode);if(data){if(typeof data=="string"){var arr=new Array(data.length);for(var i=0,len=data.length;i<len;++i)arr[i]=data.charCodeAt(i);data=arr}FS.chmod(node,mode|146);var stream=FS.open(node,577);FS.write(stream,data,0,data.length,0,canOwn);FS.close(stream);FS.chmod(node,mode)}},createDevice(parent,name,input,output){var path=PATH.join2(typeof parent=="string"?parent:FS.getPath(parent),name);var mode=FS_getMode(!!input,!!output);FS.createDevice.major??=64;var dev=FS.makedev(FS.createDevice.major++,0);FS.registerDevice(dev,{open(stream){stream.seekable=false},close(stream){if(output?.buffer?.length){output(10)}},read(stream,buffer,offset,length,pos){var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=input()}catch(e){throw new FS.ErrnoError(29)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(6)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result}if(bytesRead){stream.node.atime=Date.now()}return bytesRead},write(stream,buffer,offset,length,pos){for(var i=0;i<length;i++){try{output(buffer[offset+i])}catch(e){throw new FS.ErrnoError(29)}}if(length){stream.node.mtime=stream.node.ctime=Date.now()}return i}});return FS.mkdev(path,mode,dev)},forceLoadFile(obj){if(obj.isDevice||obj.isFolder||obj.link||obj.contents)return true;if(globalThis.XMLHttpRequest){abort("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")}else{try{obj.contents=readBinary(obj.url)}catch(e){throw new FS.ErrnoError(29)}}},createLazyFile(parent,name,url,canRead,canWrite){class LazyUint8Array{lengthKnown=false;chunks=[];get(idx){if(idx>this.length-1||idx<0){return undefined}var chunkOffset=idx%this.chunkSize;var chunkNum=idx/this.chunkSize|0;return this.getter(chunkNum)[chunkOffset]}setDataGetter(getter){this.getter=getter}cacheLength(){var xhr=new XMLHttpRequest;xhr.open("HEAD",url,false);xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))abort("Couldn\'t load "+url+". Status: "+xhr.status);var datalength=Number(xhr.getResponseHeader("Content-length"));var header;var hasByteServing=(header=xhr.getResponseHeader("Accept-Ranges"))&&header==="bytes";var usesGzip=(header=xhr.getResponseHeader("Content-Encoding"))&&header==="gzip";var chunkSize=1024*1024;if(!hasByteServing)chunkSize=datalength;var doXHR=(from,to)=>{if(from>to)abort("invalid range ("+from+", "+to+") or no bytes requested!");if(to>datalength-1)abort("only "+datalength+" bytes available! programmer error!");var xhr=new XMLHttpRequest;xhr.open("GET",url,false);if(datalength!==chunkSize)xhr.setRequestHeader("Range","bytes="+from+"-"+to);xhr.responseType="arraybuffer";if(xhr.overrideMimeType){xhr.overrideMimeType("text/plain; charset=x-user-defined")}xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))abort("Couldn\'t load "+url+". Status: "+xhr.status);if(xhr.response!==undefined){return new Uint8Array(xhr.response||[])}return intArrayFromString(xhr.responseText||"",true)};var lazyArray=this;lazyArray.setDataGetter(chunkNum=>{var start=chunkNum*chunkSize;var end=(chunkNum+1)*chunkSize-1;end=Math.min(end,datalength-1);if(typeof lazyArray.chunks[chunkNum]=="undefined"){lazyArray.chunks[chunkNum]=doXHR(start,end)}if(typeof lazyArray.chunks[chunkNum]=="undefined")abort("doXHR failed!");return lazyArray.chunks[chunkNum]});if(usesGzip||!datalength){chunkSize=datalength=1;datalength=this.getter(0).length;chunkSize=datalength;out("LazyFiles on gzip forces download of the whole file when length is accessed")}this._length=datalength;this._chunkSize=chunkSize;this.lengthKnown=true}get length(){if(!this.lengthKnown){this.cacheLength()}return this._length}get chunkSize(){if(!this.lengthKnown){this.cacheLength()}return this._chunkSize}}if(globalThis.XMLHttpRequest){if(!ENVIRONMENT_IS_WORKER)abort("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");var lazyArray=new LazyUint8Array;var properties={isDevice:false,contents:lazyArray}}else{var properties={isDevice:false,url}}var node=FS.createFile(parent,name,properties,canRead,canWrite);if(properties.contents){node.contents=properties.contents}else if(properties.url){node.contents=null;node.url=properties.url}Object.defineProperties(node,{usedBytes:{get:function(){return this.contents.length}}});var stream_ops={};for(const[key,fn]of Object.entries(node.stream_ops)){stream_ops[key]=(...args)=>{FS.forceLoadFile(node);return fn(...args)}}function writeChunks(stream,buffer,offset,length,position){var contents=stream.node.contents;if(position>=contents.length)return 0;var size=Math.min(contents.length-position,length);if(contents.slice){for(var i=0;i<size;i++){buffer[offset+i]=contents[position+i]}}else{for(var i=0;i<size;i++){buffer[offset+i]=contents.get(position+i)}}return size}stream_ops.read=(stream,buffer,offset,length,position)=>{FS.forceLoadFile(node);return writeChunks(stream,buffer,offset,length,position)};stream_ops.mmap=(stream,length,position,prot,flags)=>{FS.forceLoadFile(node);var ptr=mmapAlloc(length);if(!ptr){throw new FS.ErrnoError(48)}writeChunks(stream,(growMemViews(),HEAP8),ptr,length,position);return{ptr,allocated:true}};node.stream_ops=stream_ops;return node}};var UTF8ToString=(ptr,maxBytesToRead,ignoreNul)=>ptr?UTF8ArrayToString((growMemViews(),HEAPU8),ptr,maxBytesToRead,ignoreNul):"";var SYSCALLS={DEFAULT_POLLMASK:5,calculateAt(dirfd,path,allowEmpty){if(PATH.isAbs(path)){return path}var dir;if(dirfd===-100){dir=FS.cwd()}else{var dirstream=SYSCALLS.getStreamFromFD(dirfd);dir=dirstream.path}if(path.length==0){if(!allowEmpty){throw new FS.ErrnoError(44)}return dir}return dir+"/"+path},writeStat(buf,stat){(growMemViews(),HEAPU32)[buf/4]=stat.dev;(growMemViews(),HEAPU32)[(buf+4)/4]=stat.mode;(growMemViews(),HEAPU64)[(buf+8)/8]=BigInt(stat.nlink);(growMemViews(),HEAPU32)[(buf+16)/4]=stat.uid;(growMemViews(),HEAPU32)[(buf+20)/4]=stat.gid;(growMemViews(),HEAPU32)[(buf+24)/4]=stat.rdev;(growMemViews(),HEAP64)[(buf+32)/8]=BigInt(stat.size);(growMemViews(),HEAP32)[(buf+40)/4]=4096;(growMemViews(),HEAP32)[(buf+44)/4]=stat.blocks;var atime=stat.atime.getTime();var mtime=stat.mtime.getTime();var ctime=stat.ctime.getTime();(growMemViews(),HEAP64)[(buf+48)/8]=BigInt(Math.floor(atime/1e3));(growMemViews(),HEAPU64)[(buf+56)/8]=BigInt(atime%1e3*1e3*1e3);(growMemViews(),HEAP64)[(buf+64)/8]=BigInt(Math.floor(mtime/1e3));(growMemViews(),HEAPU64)[(buf+72)/8]=BigInt(mtime%1e3*1e3*1e3);(growMemViews(),HEAP64)[(buf+80)/8]=BigInt(Math.floor(ctime/1e3));(growMemViews(),HEAPU64)[(buf+88)/8]=BigInt(ctime%1e3*1e3*1e3);(growMemViews(),HEAP64)[(buf+96)/8]=BigInt(stat.ino);return 0},writeStatFs(buf,stats){(growMemViews(),HEAPU32)[(buf+8)/4]=stats.bsize;(growMemViews(),HEAPU32)[(buf+72)/4]=stats.bsize;(growMemViews(),HEAP64)[(buf+16)/8]=BigInt(stats.blocks);(growMemViews(),HEAP64)[(buf+24)/8]=BigInt(stats.bfree);(growMemViews(),HEAP64)[(buf+32)/8]=BigInt(stats.bavail);(growMemViews(),HEAP64)[(buf+40)/8]=BigInt(stats.files);(growMemViews(),HEAP64)[(buf+48)/8]=BigInt(stats.ffree);(growMemViews(),HEAPU32)[(buf+56)/4]=stats.fsid;(growMemViews(),HEAPU32)[(buf+80)/4]=stats.flags;(growMemViews(),HEAPU32)[(buf+64)/4]=stats.namelen},doMsync(addr,stream,len,flags,offset){if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(43)}if(flags&2){return 0}var buffer=(growMemViews(),HEAPU8).slice(addr,addr+len);FS.msync(stream,buffer,offset,len,flags)},getStreamFromFD(fd){var stream=FS.getStreamChecked(fd);return stream},varargs:undefined,getStr(ptr){var ret=UTF8ToString(ptr);return ret}};function ___syscall_fcntl64(fd,cmd,varargs){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(3,0,1,fd,cmd,varargs);varargs=bigintToI53Checked(varargs);SYSCALLS.varargs=varargs;try{var stream=SYSCALLS.getStreamFromFD(fd);switch(cmd){case 0:{var arg=syscallGetVarargI();if(arg<0){return-28}while(FS.streams[arg]){arg++}var newStream;newStream=FS.dupStream(stream,arg);return newStream.fd}case 1:case 2:return 0;case 3:return stream.flags;case 4:{var arg=syscallGetVarargI();stream.flags|=arg;return 0}case 5:{var arg=syscallGetVarargP();var offset=0;(growMemViews(),HEAP16)[(arg+offset)/2]=2;return 0}case 6:case 7:return 0}return-28}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_fstat64(fd,buf){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(4,0,1,fd,buf);buf=bigintToI53Checked(buf);try{return SYSCALLS.writeStat(buf,FS.fstat(fd))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var stringToUTF8=(str,outPtr,maxBytesToWrite)=>stringToUTF8Array(str,(growMemViews(),HEAPU8),outPtr,maxBytesToWrite);function ___syscall_getcwd(buf,size){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(5,0,1,buf,size);buf=bigintToI53Checked(buf);size=bigintToI53Checked(size);try{if(size===0)return-28;var cwd=FS.cwd();var cwdLengthInBytes=lengthBytesUTF8(cwd)+1;if(size<cwdLengthInBytes)return-68;stringToUTF8(cwd,buf,size);return cwdLengthInBytes}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_getdents64(fd,dirp,count){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(6,0,1,fd,dirp,count);dirp=bigintToI53Checked(dirp);count=bigintToI53Checked(count);try{var stream=SYSCALLS.getStreamFromFD(fd);stream.getdents||=FS.readdir(stream.path);var struct_size=280;var pos=0;var off=FS.llseek(stream,0,1);var startIdx=Math.floor(off/struct_size);var endIdx=Math.min(stream.getdents.length,startIdx+Math.floor(count/struct_size));for(var idx=startIdx;idx<endIdx;idx++){var id;var type;var name=stream.getdents[idx];if(name==="."){id=stream.node.id;type=4}else if(name===".."){var lookup=FS.lookupPath(stream.path,{parent:true});id=lookup.node.id;type=4}else{var child;try{child=FS.lookupNode(stream.node,name)}catch(e){if(e?.errno===28){continue}throw e}id=child.id;type=FS.isChrdev(child.mode)?2:FS.isDir(child.mode)?4:FS.isLink(child.mode)?10:8}(growMemViews(),HEAP64)[(dirp+pos)/8]=BigInt(id);(growMemViews(),HEAP64)[(dirp+pos+8)/8]=BigInt((idx+1)*struct_size);(growMemViews(),HEAP16)[(dirp+pos+16)/2]=280;(growMemViews(),HEAP8)[dirp+pos+18]=type;stringToUTF8(name,dirp+pos+19,256);pos+=struct_size}FS.llseek(stream,idx*struct_size,0);return pos}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_ioctl(fd,op,varargs){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(7,0,1,fd,op,varargs);varargs=bigintToI53Checked(varargs);SYSCALLS.varargs=varargs;try{var stream=SYSCALLS.getStreamFromFD(fd);switch(op){case 21509:{if(!stream.tty)return-59;return 0}case 21505:{if(!stream.tty)return-59;if(stream.tty.ops.ioctl_tcgets){var termios=stream.tty.ops.ioctl_tcgets(stream);var argp=syscallGetVarargP();(growMemViews(),HEAP32)[argp/4]=termios.c_iflag||0;(growMemViews(),HEAP32)[(argp+4)/4]=termios.c_oflag||0;(growMemViews(),HEAP32)[(argp+8)/4]=termios.c_cflag||0;(growMemViews(),HEAP32)[(argp+12)/4]=termios.c_lflag||0;for(var i=0;i<32;i++){(growMemViews(),HEAP8)[argp+i+17]=termios.c_cc[i]||0}return 0}return 0}case 21510:case 21511:case 21512:{if(!stream.tty)return-59;return 0}case 21506:case 21507:case 21508:{if(!stream.tty)return-59;if(stream.tty.ops.ioctl_tcsets){var argp=syscallGetVarargP();var c_iflag=(growMemViews(),HEAP32)[argp/4];var c_oflag=(growMemViews(),HEAP32)[(argp+4)/4];var c_cflag=(growMemViews(),HEAP32)[(argp+8)/4];var c_lflag=(growMemViews(),HEAP32)[(argp+12)/4];var c_cc=[];for(var i=0;i<32;i++){c_cc.push((growMemViews(),HEAP8)[argp+i+17])}return stream.tty.ops.ioctl_tcsets(stream.tty,op,{c_iflag,c_oflag,c_cflag,c_lflag,c_cc})}return 0}case 21519:{if(!stream.tty)return-59;var argp=syscallGetVarargP();(growMemViews(),HEAP32)[argp/4]=0;return 0}case 21520:{if(!stream.tty)return-59;return-28}case 21537:case 21531:{var argp=syscallGetVarargP();return FS.ioctl(stream,op,argp)}case 21523:{if(!stream.tty)return-59;if(stream.tty.ops.ioctl_tiocgwinsz){var winsize=stream.tty.ops.ioctl_tiocgwinsz(stream.tty);var argp=syscallGetVarargP();(growMemViews(),HEAP16)[argp/2]=winsize[0];(growMemViews(),HEAP16)[(argp+2)/2]=winsize[1]}return 0}case 21524:{if(!stream.tty)return-59;return 0}case 21515:{if(!stream.tty)return-59;return 0}default:return-28}}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_lstat64(path,buf){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(8,0,1,path,buf);path=bigintToI53Checked(path);buf=bigintToI53Checked(buf);try{path=SYSCALLS.getStr(path);return SYSCALLS.writeStat(buf,FS.lstat(path))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_newfstatat(dirfd,path,buf,flags){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(9,0,1,dirfd,path,buf,flags);path=bigintToI53Checked(path);buf=bigintToI53Checked(buf);try{path=SYSCALLS.getStr(path);var nofollow=flags&256;var allowEmpty=flags&4096;flags=flags&~6400;path=SYSCALLS.calculateAt(dirfd,path,allowEmpty);return SYSCALLS.writeStat(buf,nofollow?FS.lstat(path):FS.stat(path))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_openat(dirfd,path,flags,varargs){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(10,0,1,dirfd,path,flags,varargs);path=bigintToI53Checked(path);varargs=bigintToI53Checked(varargs);SYSCALLS.varargs=varargs;try{path=SYSCALLS.getStr(path);path=SYSCALLS.calculateAt(dirfd,path);var mode=varargs?syscallGetVarargI():0;return FS.open(path,flags,mode).fd}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function ___syscall_stat64(path,buf){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(11,0,1,path,buf);path=bigintToI53Checked(path);buf=bigintToI53Checked(buf);try{path=SYSCALLS.getStr(path);return SYSCALLS.writeStat(buf,FS.stat(path))}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var __abort_js=()=>abort("");function __emscripten_init_main_thread_js(tb){tb=bigintToI53Checked(tb);__emscripten_thread_init(tb,!ENVIRONMENT_IS_WORKER,1,!ENVIRONMENT_IS_WEB,65536,false);PThread.threadInitTLS()}var handleException=e=>{if(e instanceof ExitStatus||e=="unwind"){return EXITSTATUS}quit_(1,e)};var maybeExit=()=>{if(!keepRuntimeAlive()){try{if(ENVIRONMENT_IS_PTHREAD){if(_pthread_self())__emscripten_thread_exit(EXITSTATUS);return}_exit(EXITSTATUS)}catch(e){handleException(e)}}};var callUserCallback=func=>{if(ABORT){return}try{func();maybeExit()}catch(e){handleException(e)}};function __emscripten_thread_mailbox_await(pthread_ptr){pthread_ptr=bigintToI53Checked(pthread_ptr);if(Atomics.waitAsync){var wait=Atomics.waitAsync((growMemViews(),HEAP32),pthread_ptr/4,pthread_ptr);wait.value.then(checkMailbox);var waitingAsync=pthread_ptr+228;Atomics.store((growMemViews(),HEAP32),waitingAsync/4,1)}}var checkMailbox=()=>callUserCallback(()=>{var pthread_ptr=_pthread_self();if(pthread_ptr){__emscripten_thread_mailbox_await(pthread_ptr);__emscripten_check_mailbox()}});function __emscripten_notify_mailbox_postmessage(targetThread,currThreadId){targetThread=bigintToI53Checked(targetThread);currThreadId=bigintToI53Checked(currThreadId);if(targetThread==currThreadId){setTimeout(checkMailbox)}else if(ENVIRONMENT_IS_PTHREAD){postMessage({targetThread,cmd:"checkMailbox"})}else{var worker=PThread.pthreads[targetThread];if(!worker){return}worker.postMessage({cmd:"checkMailbox"})}}var proxiedJSCallArgs=[];function __emscripten_receive_on_main_thread_js(funcIndex,emAsmAddr,callingThread,numCallArgs,args){emAsmAddr=bigintToI53Checked(emAsmAddr);callingThread=bigintToI53Checked(callingThread);args=bigintToI53Checked(args);numCallArgs/=2;proxiedJSCallArgs.length=numCallArgs;var b=args/8;for(var i=0;i<numCallArgs;i++){if((growMemViews(),HEAP64)[b+2*i]){proxiedJSCallArgs[i]=(growMemViews(),HEAP64)[b+2*i+1]}else{proxiedJSCallArgs[i]=(growMemViews(),HEAPF64)[b+2*i+1]}}var func=proxiedFunctionTable[funcIndex];PThread.currentProxiedOperationCallerThread=callingThread;var rtn=func(...proxiedJSCallArgs);PThread.currentProxiedOperationCallerThread=0;if(typeof rtn=="bigint"){rtn=bigintToI53Checked(rtn)}return rtn}function __emscripten_thread_cleanup(thread){thread=bigintToI53Checked(thread);if(!ENVIRONMENT_IS_PTHREAD)cleanupThread(thread);else postMessage({cmd:"cleanupThread",thread})}function __emscripten_thread_set_strongref(thread){thread=bigintToI53Checked(thread);if(ENVIRONMENT_IS_NODE){PThread.pthreads[thread].ref()}}var isLeapYear=year=>year%4===0&&(year%100!==0||year%400===0);var MONTH_DAYS_LEAP_CUMULATIVE=[0,31,60,91,121,152,182,213,244,274,305,335];var MONTH_DAYS_REGULAR_CUMULATIVE=[0,31,59,90,120,151,181,212,243,273,304,334];var ydayFromDate=date=>{var leap=isLeapYear(date.getFullYear());var monthDaysCumulative=leap?MONTH_DAYS_LEAP_CUMULATIVE:MONTH_DAYS_REGULAR_CUMULATIVE;var yday=monthDaysCumulative[date.getMonth()]+date.getDate()-1;return yday};function __localtime_js(time,tmPtr){time=bigintToI53Checked(time);tmPtr=bigintToI53Checked(tmPtr);var date=new Date(time*1e3);(growMemViews(),HEAP32)[tmPtr/4]=date.getSeconds();(growMemViews(),HEAP32)[(tmPtr+4)/4]=date.getMinutes();(growMemViews(),HEAP32)[(tmPtr+8)/4]=date.getHours();(growMemViews(),HEAP32)[(tmPtr+12)/4]=date.getDate();(growMemViews(),HEAP32)[(tmPtr+16)/4]=date.getMonth();(growMemViews(),HEAP32)[(tmPtr+20)/4]=date.getFullYear()-1900;(growMemViews(),HEAP32)[(tmPtr+24)/4]=date.getDay();var yday=ydayFromDate(date)|0;(growMemViews(),HEAP32)[(tmPtr+28)/4]=yday;(growMemViews(),HEAP64)[(tmPtr+40)/8]=BigInt(-(date.getTimezoneOffset()*60));var start=new Date(date.getFullYear(),0,1);var summerOffset=new Date(date.getFullYear(),6,1).getTimezoneOffset();var winterOffset=start.getTimezoneOffset();var dst=(summerOffset!=winterOffset&&date.getTimezoneOffset()==Math.min(winterOffset,summerOffset))|0;(growMemViews(),HEAP32)[(tmPtr+32)/4]=dst}function __mmap_js(len,prot,flags,fd,offset,allocated,addr){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(12,0,1,len,prot,flags,fd,offset,allocated,addr);len=bigintToI53Checked(len);offset=bigintToI53Checked(offset);allocated=bigintToI53Checked(allocated);addr=bigintToI53Checked(addr);try{var stream=SYSCALLS.getStreamFromFD(fd);var res=FS.mmap(stream,len,offset,prot,flags);var ptr=res.ptr;(growMemViews(),HEAP32)[allocated/4]=res.allocated;(growMemViews(),HEAPU64)[addr/8]=BigInt(ptr);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}function __munmap_js(addr,len,prot,flags,fd,offset){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(13,0,1,addr,len,prot,flags,fd,offset);addr=bigintToI53Checked(addr);len=bigintToI53Checked(len);offset=bigintToI53Checked(offset);try{var stream=SYSCALLS.getStreamFromFD(fd);if(prot&2){SYSCALLS.doMsync(addr,stream,len,flags,offset)}}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return-e.errno}}var __tzset_js=function(timezone,daylight,std_name,dst_name){timezone=bigintToI53Checked(timezone);daylight=bigintToI53Checked(daylight);std_name=bigintToI53Checked(std_name);dst_name=bigintToI53Checked(dst_name);var currentYear=(new Date).getFullYear();var winter=new Date(currentYear,0,1);var summer=new Date(currentYear,6,1);var winterOffset=winter.getTimezoneOffset();var summerOffset=summer.getTimezoneOffset();var stdTimezoneOffset=Math.max(winterOffset,summerOffset);(growMemViews(),HEAPU64)[timezone/8]=BigInt(stdTimezoneOffset*60);(growMemViews(),HEAP32)[daylight/4]=Number(winterOffset!=summerOffset);var extractZone=timezoneOffset=>{var sign=timezoneOffset>=0?"-":"+";var absOffset=Math.abs(timezoneOffset);var hours=String(Math.floor(absOffset/60)).padStart(2,"0");var minutes=String(absOffset%60).padStart(2,"0");return`UTC${sign}${hours}${minutes}`};var winterName=extractZone(winterOffset);var summerName=extractZone(summerOffset);if(summerOffset<winterOffset){stringToUTF8(winterName,std_name,17);stringToUTF8(summerName,dst_name,17)}else{stringToUTF8(winterName,dst_name,17);stringToUTF8(summerName,std_name,17)}};var _emscripten_get_now=()=>performance.timeOrigin+performance.now();var _emscripten_date_now=()=>Date.now();var nowIsMonotonic=1;var checkWasiClock=clock_id=>clock_id>=0&&clock_id<=3;function _clock_time_get(clk_id,ignored_precision,ptime){ignored_precision=bigintToI53Checked(ignored_precision);ptime=bigintToI53Checked(ptime);if(!checkWasiClock(clk_id)){return 28}var now;if(clk_id===0){now=_emscripten_date_now()}else if(nowIsMonotonic){now=_emscripten_get_now()}else{return 52}var nsec=Math.round(now*1e3*1e3);(growMemViews(),HEAP64)[ptime/8]=BigInt(nsec);return 0}var _emscripten_check_blocking_allowed=()=>{};var runtimeKeepalivePush=()=>{runtimeKeepaliveCounter+=1};var _emscripten_exit_with_live_runtime=()=>{runtimeKeepalivePush();throw"unwind"};var jsStackTrace=()=>(new Error).stack.toString();var getCallstack=flags=>{var callstack=jsStackTrace();var lines=callstack.split("\\n");callstack="";var firefoxRe=new RegExp("\\\\s*(.*?)@(.*?):([0-9]+):([0-9]+)");var chromeRe=new RegExp("\\\\s*at (.*?) \\\\((.*):(.*):(.*)\\\\)");for(var line of lines){var symbolName="";var file="";var lineno=0;var column=0;var parts=chromeRe.exec(line);if(parts?.length==5){symbolName=parts[1];file=parts[2];lineno=parts[3];column=parts[4]}else{parts=firefoxRe.exec(line);if(parts?.length>=4){symbolName=parts[1];file=parts[2];lineno=parts[3];column=parts[4]|0}else{callstack+=line+"\\n";continue}}if(symbolName=="_emscripten_log"||symbolName=="_emscripten_get_callstack"){callstack="";continue}if(flags&24){if(flags&64){file=file.substring(file.replace(/\\\\/g,"/").lastIndexOf("/")+1)}callstack+=`    at ${symbolName} (${file}:${lineno}:${column})\\n`}}callstack=callstack.replace(/\\s+$/,"");return callstack};function _emscripten_get_callstack(flags,str,maxbytes){str=bigintToI53Checked(str);var callstack=getCallstack(flags);if(!str||maxbytes<=0){return lengthBytesUTF8(callstack)+1}var bytesWrittenExcludingNull=stringToUTF8(callstack,str,maxbytes);return bytesWrittenExcludingNull+1}var getHeapMax=()=>4294967296;var _emscripten_get_heap_max=()=>BigInt(getHeapMax());var _emscripten_has_asyncify=()=>2;var _emscripten_num_logical_cores=()=>ENVIRONMENT_IS_NODE?require("os").cpus().length:navigator["hardwareConcurrency"];var growMemory=size=>{var oldHeapSize=wasmMemory.buffer.byteLength;var pages=(size-oldHeapSize+65535)/65536|0;try{wasmMemory.grow(BigInt(pages));updateMemoryViews();return 1}catch(e){}};function _emscripten_resize_heap(requestedSize){requestedSize=bigintToI53Checked(requestedSize);var oldSize=(growMemViews(),HEAPU8).length;if(requestedSize<=oldSize){return false}var maxHeapSize=getHeapMax();if(requestedSize>maxHeapSize){return false}for(var cutDown=1;cutDown<=4;cutDown*=2){var overGrownHeapSize=oldSize*(1+.2/cutDown);overGrownHeapSize=Math.min(overGrownHeapSize,requestedSize+100663296);var newSize=Math.min(maxHeapSize,alignMemory(Math.max(requestedSize,overGrownHeapSize),65536));var replacement=growMemory(newSize);if(replacement){return true}}return false}var stringToUTF8OnStack=str=>{var size=lengthBytesUTF8(str)+1;var ret=stackAlloc(size);stringToUTF8(str,ret,size);return ret};var writeI53ToI64=(ptr,num)=>{(growMemViews(),HEAPU32)[ptr/4]=num;var lower=(growMemViews(),HEAPU32)[ptr/4];(growMemViews(),HEAPU32)[(ptr+4)/4]=(num-lower)/4294967296};var stringToNewUTF8=str=>{var size=lengthBytesUTF8(str)+1;var ret=_malloc(size);if(ret)stringToUTF8(str,ret,size);return ret};var readI53FromI64=ptr=>(growMemViews(),HEAPU32)[ptr/4]+(growMemViews(),HEAP32)[(ptr+4)/4]*4294967296;var WebGPU={Internals:{jsObjects:[],jsObjectInsert:(ptr,jsObject)=>{WebGPU.Internals.jsObjects[ptr]=jsObject},bufferOnUnmaps:[],futures:[],futureInsert:(futureId,promise)=>{WebGPU.Internals.futures[futureId]=new Promise(resolve=>promise.finally(()=>resolve(futureId)))}},getJsObject:ptr=>{if(!ptr)return undefined;return WebGPU.Internals.jsObjects[ptr]},importJsAdapter:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateAdapter(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsBindGroup:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateBindGroup(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsBindGroupLayout:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateBindGroupLayout(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsBuffer:(buffer,parentPtr=0)=>{assert(buffer.mapState==="unmapped");var bufferPtr=_emwgpuCreateBuffer(parentPtr);WebGPU.Internals.jsObjectInsert(bufferPtr,buffer);return bufferPtr},importJsCommandBuffer:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateCommandBuffer(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsCommandEncoder:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateCommandEncoder(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsComputePassEncoder:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateComputePassEncoder(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsComputePipeline:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateComputePipeline(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsDevice:(device,parentPtr=0)=>{var queuePtr=_emwgpuCreateQueue(parentPtr);var devicePtr=_emwgpuCreateDevice(parentPtr,queuePtr);WebGPU.Internals.jsObjectInsert(queuePtr,device.queue);WebGPU.Internals.jsObjectInsert(devicePtr,device);return devicePtr},importJsExternalTexture:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateExternalTexture(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsPipelineLayout:(obj,parentPtr=0)=>{var ptr=_emwgpuCreatePipelineLayout(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsQuerySet:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateQuerySet(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsQueue:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateQueue(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsRenderBundle:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateRenderBundle(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsRenderBundleEncoder:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateRenderBundleEncoder(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsRenderPassEncoder:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateRenderPassEncoder(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsRenderPipeline:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateRenderPipeline(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsSampler:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateSampler(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsShaderModule:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateShaderModule(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsSurface:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateSurface(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsTexture:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateTexture(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},importJsTextureView:(obj,parentPtr=0)=>{var ptr=_emwgpuCreateTextureView(parentPtr);WebGPU.Internals.jsObjects[ptr]=obj;return ptr},errorCallback:(callback,type,message,userdata)=>{var sp=stackSave();var messagePtr=stringToUTF8OnStack(message);((a1,a2,a3)=>getWasmTableEntry(callback).call(null,a1,BigInt(a2),BigInt(a3)))(type,BigInt(messagePtr),userdata);stackRestore(sp)},iterateExtensions:(root,handlers)=>{for(var ptr=Number((growMemViews(),HEAPU64)[root/8]);ptr;ptr=Number((growMemViews(),HEAPU64)[ptr/8])){var sType=(growMemViews(),HEAP32)[(ptr+8)/4];var handler=handlers[sType](ptr)}},setStringView:(ptr,data,length)=>{(growMemViews(),HEAPU64)[ptr/8]=BigInt(data);(growMemViews(),HEAPU64)[(ptr+8)/8]=BigInt(length)},makeStringFromStringView:stringViewPtr=>{var ptr=Number((growMemViews(),HEAPU64)[stringViewPtr/8]);var length=Number((growMemViews(),HEAPU64)[(stringViewPtr+8)/8]);return UTF8ToString(ptr,length)},makeStringFromOptionalStringView:stringViewPtr=>{var ptr=Number((growMemViews(),HEAPU64)[stringViewPtr/8]);var length=Number((growMemViews(),HEAPU64)[(stringViewPtr+8)/8]);if(!ptr){if(length===0){return""}return undefined}return UTF8ToString(ptr,length)},makeColor:ptr=>({r:(growMemViews(),HEAPF64)[ptr/8],g:(growMemViews(),HEAPF64)[(ptr+8)/8],b:(growMemViews(),HEAPF64)[(ptr+16)/8],a:(growMemViews(),HEAPF64)[(ptr+24)/8]}),makeExtent3D:ptr=>({width:(growMemViews(),HEAPU32)[ptr/4],height:(growMemViews(),HEAPU32)[(ptr+4)/4],depthOrArrayLayers:(growMemViews(),HEAPU32)[(ptr+8)/4]}),makeOrigin3D:ptr=>({x:(growMemViews(),HEAPU32)[ptr/4],y:(growMemViews(),HEAPU32)[(ptr+4)/4],z:(growMemViews(),HEAPU32)[(ptr+8)/4]}),makeTexelCopyTextureInfo:ptr=>({texture:WebGPU.getJsObject(Number((growMemViews(),HEAPU64)[ptr/8])),mipLevel:(growMemViews(),HEAPU32)[(ptr+8)/4],origin:WebGPU.makeOrigin3D(ptr+12),aspect:WebGPU.TextureAspect[(growMemViews(),HEAP32)[(ptr+24)/4]]}),makeTexelCopyBufferLayout:ptr=>{var bytesPerRow=(growMemViews(),HEAPU32)[(ptr+8)/4];var rowsPerImage=(growMemViews(),HEAPU32)[(ptr+12)/4];return{offset:readI53FromI64(ptr),bytesPerRow:bytesPerRow===4294967295?undefined:bytesPerRow,rowsPerImage:rowsPerImage===4294967295?undefined:rowsPerImage}},makeTexelCopyBufferInfo:ptr=>{var layoutPtr=ptr+0;var bufferCopyView=WebGPU.makeTexelCopyBufferLayout(layoutPtr);bufferCopyView["buffer"]=WebGPU.getJsObject(Number((growMemViews(),HEAPU64)[(ptr+16)/8]));return bufferCopyView},makePassTimestampWrites:ptr=>{if(ptr===0)return undefined;return{querySet:WebGPU.getJsObject(Number((growMemViews(),HEAPU64)[(ptr+8)/8])),beginningOfPassWriteIndex:(growMemViews(),HEAPU32)[(ptr+16)/4],endOfPassWriteIndex:(growMemViews(),HEAPU32)[(ptr+20)/4]}},makePipelineConstants:(constantCount,constantsPtr)=>{if(!constantCount)return;var constants={};for(var i=0;i<constantCount;++i){var entryPtr=constantsPtr+32*i;var key=WebGPU.makeStringFromStringView(entryPtr+8);constants[key]=(growMemViews(),HEAPF64)[(entryPtr+24)/8]}return constants},makePipelineLayout:layoutPtr=>{if(!layoutPtr)return"auto";return WebGPU.getJsObject(layoutPtr)},makeComputeState:ptr=>{if(!ptr)return undefined;var desc={module:WebGPU.getJsObject(Number((growMemViews(),HEAPU64)[(ptr+8)/8])),constants:WebGPU.makePipelineConstants(Number((growMemViews(),HEAPU64)[(ptr+32)/8]),Number((growMemViews(),HEAPU64)[(ptr+40)/8])),entryPoint:WebGPU.makeStringFromOptionalStringView(ptr+16)};return desc},makeComputePipelineDesc:descriptor=>{var desc={label:WebGPU.makeStringFromOptionalStringView(descriptor+8),layout:WebGPU.makePipelineLayout(Number((growMemViews(),HEAPU64)[(descriptor+24)/8])),compute:WebGPU.makeComputeState(descriptor+32)};return desc},makeRenderPipelineDesc:descriptor=>{function makePrimitiveState(psPtr){if(!psPtr)return undefined;return{topology:WebGPU.PrimitiveTopology[(growMemViews(),HEAP32)[(psPtr+8)/4]],stripIndexFormat:WebGPU.IndexFormat[(growMemViews(),HEAP32)[(psPtr+12)/4]],frontFace:WebGPU.FrontFace[(growMemViews(),HEAP32)[(psPtr+16)/4]],cullMode:WebGPU.CullMode[(growMemViews(),HEAP32)[(psPtr+20)/4]],unclippedDepth:!!(growMemViews(),HEAPU32)[(psPtr+24)/4]}}function makeBlendComponent(bdPtr){if(!bdPtr)return undefined;return{operation:WebGPU.BlendOperation[(growMemViews(),HEAP32)[bdPtr/4]],srcFactor:WebGPU.BlendFactor[(growMemViews(),HEAP32)[(bdPtr+4)/4]],dstFactor:WebGPU.BlendFactor[(growMemViews(),HEAP32)[(bdPtr+8)/4]]}}function makeBlendState(bsPtr){if(!bsPtr)return undefined;return{alpha:makeBlendComponent(bsPtr+12),color:makeBlendComponent(bsPtr+0)}}function makeColorState(csPtr){var format=WebGPU.TextureFormat[(growMemViews(),HEAP32)[(csPtr+8)/4]];return format?{format,blend:makeBlendState(Number((growMemViews(),HEAPU64)[(csPtr+16)/8])),writeMask:(growMemViews(),HEAPU32)[(csPtr+24)/4]}:undefined}function makeColorStates(count,csArrayPtr){var states=[];for(var i=0;i<count;++i){states.push(makeColorState(csArrayPtr+32*i))}return states}function makeStencilStateFace(ssfPtr){return{compare:WebGPU.CompareFunction[(growMemViews(),HEAP32)[ssfPtr/4]],failOp:WebGPU.StencilOperation[(growMemViews(),HEAP32)[(ssfPtr+4)/4]],depthFailOp:WebGPU.StencilOperation[(growMemViews(),HEAP32)[(ssfPtr+8)/4]],passOp:WebGPU.StencilOperation[(growMemViews(),HEAP32)[(ssfPtr+12)/4]]}}function makeDepthStencilState(dssPtr){if(!dssPtr)return undefined;return{format:WebGPU.TextureFormat[(growMemViews(),HEAP32)[(dssPtr+8)/4]],depthWriteEnabled:!!(growMemViews(),HEAPU32)[(dssPtr+12)/4],depthCompare:WebGPU.CompareFunction[(growMemViews(),HEAP32)[(dssPtr+16)/4]],stencilFront:makeStencilStateFace(dssPtr+20),stencilBack:makeStencilStateFace(dssPtr+36),stencilReadMask:(growMemViews(),HEAPU32)[(dssPtr+52)/4],stencilWriteMask:(growMemViews(),HEAPU32)[(dssPtr+56)/4],depthBias:(growMemViews(),HEAP32)[(dssPtr+60)/4],depthBiasSlopeScale:(growMemViews(),HEAPF32)[(dssPtr+64)/4],depthBiasClamp:(growMemViews(),HEAPF32)[(dssPtr+68)/4]}}function makeVertexAttribute(vaPtr){return{format:WebGPU.VertexFormat[(growMemViews(),HEAP32)[(vaPtr+8)/4]],offset:readI53FromI64(vaPtr+16),shaderLocation:(growMemViews(),HEAPU32)[(vaPtr+24)/4]}}function makeVertexAttributes(count,vaArrayPtr){var vas=[];for(var i=0;i<count;++i){vas.push(makeVertexAttribute(vaArrayPtr+i*32))}return vas}function makeVertexBuffer(vbPtr){if(!vbPtr)return undefined;var stepMode=WebGPU.VertexStepMode[(growMemViews(),HEAP32)[(vbPtr+8)/4]];var attributeCount=Number((growMemViews(),HEAPU64)[(vbPtr+24)/8]);if(!stepMode&&!attributeCount){return null}return{arrayStride:readI53FromI64(vbPtr+16),stepMode,attributes:makeVertexAttributes(attributeCount,Number((growMemViews(),HEAPU64)[(vbPtr+32)/8]))}}function makeVertexBuffers(count,vbArrayPtr){if(!count)return undefined;var vbs=[];for(var i=0;i<count;++i){vbs.push(makeVertexBuffer(vbArrayPtr+i*40))}return vbs}function makeVertexState(viPtr){if(!viPtr)return undefined;var desc={module:WebGPU.getJsObject(Number((growMemViews(),HEAPU64)[(viPtr+8)/8])),constants:WebGPU.makePipelineConstants(Number((growMemViews(),HEAPU64)[(viPtr+32)/8]),Number((growMemViews(),HEAPU64)[(viPtr+40)/8])),buffers:makeVertexBuffers(Number((growMemViews(),HEAPU64)[(viPtr+48)/8]),Number((growMemViews(),HEAPU64)[(viPtr+56)/8])),entryPoint:WebGPU.makeStringFromOptionalStringView(viPtr+16)};return desc}function makeMultisampleState(msPtr){if(!msPtr)return undefined;return{count:(growMemViews(),HEAPU32)[(msPtr+8)/4],mask:(growMemViews(),HEAPU32)[(msPtr+12)/4],alphaToCoverageEnabled:!!(growMemViews(),HEAPU32)[(msPtr+16)/4]}}function makeFragmentState(fsPtr){if(!fsPtr)return undefined;var desc={module:WebGPU.getJsObject(Number((growMemViews(),HEAPU64)[(fsPtr+8)/8])),constants:WebGPU.makePipelineConstants(Number((growMemViews(),HEAPU64)[(fsPtr+32)/8]),Number((growMemViews(),HEAPU64)[(fsPtr+40)/8])),targets:makeColorStates(Number((growMemViews(),HEAPU64)[(fsPtr+48)/8]),Number((growMemViews(),HEAPU64)[(fsPtr+56)/8])),entryPoint:WebGPU.makeStringFromOptionalStringView(fsPtr+16)};return desc}var desc={label:WebGPU.makeStringFromOptionalStringView(descriptor+8),layout:WebGPU.makePipelineLayout(Number((growMemViews(),HEAPU64)[(descriptor+24)/8])),vertex:makeVertexState(descriptor+32),primitive:makePrimitiveState(descriptor+96),depthStencil:makeDepthStencilState(Number((growMemViews(),HEAPU64)[(descriptor+128)/8])),multisample:makeMultisampleState(descriptor+136),fragment:makeFragmentState(Number((growMemViews(),HEAPU64)[(descriptor+160)/8]))};return desc},fillLimitStruct:(limits,limitsOutPtr)=>{var nextInChainPtr=Number((growMemViews(),HEAPU64)[limitsOutPtr/8]);function setLimitValueU32(name,basePtr,limitOffset,fallbackValue=0){var limitValue=limits[name]??fallbackValue;(growMemViews(),HEAPU32)[(basePtr+limitOffset)/4]=limitValue}function setLimitValueU64(name,basePtr,limitOffset,fallbackValue=0){var limitValue=limits[name]??fallbackValue;writeI53ToI64(basePtr+limitOffset,limitValue)}setLimitValueU32("maxTextureDimension1D",limitsOutPtr,8);setLimitValueU32("maxTextureDimension2D",limitsOutPtr,12);setLimitValueU32("maxTextureDimension3D",limitsOutPtr,16);setLimitValueU32("maxTextureArrayLayers",limitsOutPtr,20);setLimitValueU32("maxBindGroups",limitsOutPtr,24);setLimitValueU32("maxBindGroupsPlusVertexBuffers",limitsOutPtr,28);setLimitValueU32("maxBindingsPerBindGroup",limitsOutPtr,32);setLimitValueU32("maxDynamicUniformBuffersPerPipelineLayout",limitsOutPtr,36);setLimitValueU32("maxDynamicStorageBuffersPerPipelineLayout",limitsOutPtr,40);setLimitValueU32("maxSampledTexturesPerShaderStage",limitsOutPtr,44);setLimitValueU32("maxSamplersPerShaderStage",limitsOutPtr,48);setLimitValueU32("maxStorageBuffersPerShaderStage",limitsOutPtr,52);setLimitValueU32("maxStorageTexturesPerShaderStage",limitsOutPtr,56);setLimitValueU32("maxUniformBuffersPerShaderStage",limitsOutPtr,60);setLimitValueU32("minUniformBufferOffsetAlignment",limitsOutPtr,80);setLimitValueU32("minStorageBufferOffsetAlignment",limitsOutPtr,84);setLimitValueU64("maxUniformBufferBindingSize",limitsOutPtr,64);setLimitValueU64("maxStorageBufferBindingSize",limitsOutPtr,72);setLimitValueU32("maxVertexBuffers",limitsOutPtr,88);setLimitValueU64("maxBufferSize",limitsOutPtr,96);setLimitValueU32("maxVertexAttributes",limitsOutPtr,104);setLimitValueU32("maxVertexBufferArrayStride",limitsOutPtr,108);setLimitValueU32("maxInterStageShaderVariables",limitsOutPtr,112);setLimitValueU32("maxColorAttachments",limitsOutPtr,116);setLimitValueU32("maxColorAttachmentBytesPerSample",limitsOutPtr,120);setLimitValueU32("maxComputeWorkgroupStorageSize",limitsOutPtr,124);setLimitValueU32("maxComputeInvocationsPerWorkgroup",limitsOutPtr,128);setLimitValueU32("maxComputeWorkgroupSizeX",limitsOutPtr,132);setLimitValueU32("maxComputeWorkgroupSizeY",limitsOutPtr,136);setLimitValueU32("maxComputeWorkgroupSizeZ",limitsOutPtr,140);setLimitValueU32("maxComputeWorkgroupsPerDimension",limitsOutPtr,144);setLimitValueU32("maxImmediateSize",limitsOutPtr,148);if(nextInChainPtr!==0){var sType=(growMemViews(),HEAP32)[(nextInChainPtr+8)/4];var compatibilityModeLimitsPtr=nextInChainPtr;setLimitValueU32("maxStorageBuffersInVertexStage",compatibilityModeLimitsPtr,16,limits.maxStorageBuffersPerShaderStage);setLimitValueU32("maxStorageBuffersInFragmentStage",compatibilityModeLimitsPtr,24,limits.maxStorageBuffersPerShaderStage);setLimitValueU32("maxStorageTexturesInVertexStage",compatibilityModeLimitsPtr,20,limits.maxStorageTexturesPerShaderStage);setLimitValueU32("maxStorageTexturesInFragmentStage",compatibilityModeLimitsPtr,28,limits.maxStorageTexturesPerShaderStage)}},fillAdapterInfoStruct:(info,infoStruct)=>{(growMemViews(),HEAPU32)[(infoStruct+88)/4]=info.subgroupMinSize;(growMemViews(),HEAPU32)[(infoStruct+92)/4]=info.subgroupMaxSize;var strs=info.vendor+info.architecture+info.device+info.description;var strPtr=stringToNewUTF8(strs);var vendorLen=lengthBytesUTF8(info.vendor);WebGPU.setStringView(infoStruct+8,strPtr,vendorLen);strPtr+=vendorLen;var architectureLen=lengthBytesUTF8(info.architecture);WebGPU.setStringView(infoStruct+24,strPtr,architectureLen);strPtr+=architectureLen;var deviceLen=lengthBytesUTF8(info.device);WebGPU.setStringView(infoStruct+40,strPtr,deviceLen);strPtr+=deviceLen;var descriptionLen=lengthBytesUTF8(info.description);WebGPU.setStringView(infoStruct+56,strPtr,descriptionLen);strPtr+=descriptionLen;(growMemViews(),HEAP32)[(infoStruct+72)/4]=2;var adapterType=info.isFallbackAdapter?3:4;(growMemViews(),HEAP32)[(infoStruct+76)/4]=adapterType;(growMemViews(),HEAPU32)[(infoStruct+80)/4]=0;(growMemViews(),HEAPU32)[(infoStruct+84)/4]=0},AddressMode:[,"clamp-to-edge","repeat","mirror-repeat"],BlendFactor:[,"zero","one","src","one-minus-src","src-alpha","one-minus-src-alpha","dst","one-minus-dst","dst-alpha","one-minus-dst-alpha","src-alpha-saturated","constant","one-minus-constant","src1","one-minus-src1","src1-alpha","one-minus-src1-alpha"],BlendOperation:[,"add","subtract","reverse-subtract","min","max"],BufferBindingType:[,,"uniform","storage","read-only-storage"],BufferMapState:[,"unmapped","pending","mapped"],CompareFunction:[,"never","less","equal","less-equal","greater","not-equal","greater-equal","always"],CompilationInfoRequestStatus:[,"success","callback-cancelled"],ComponentSwizzle:[,"0","1","r","g","b","a"],CompositeAlphaMode:[,"opaque","premultiplied","unpremultiplied","inherit"],CullMode:[,"none","front","back"],ErrorFilter:[,"validation","out-of-memory","internal"],FeatureLevel:[,"compatibility","core"],FeatureName:{1:"core-features-and-limits",2:"depth-clip-control",3:"depth32float-stencil8",4:"texture-compression-bc",5:"texture-compression-bc-sliced-3d",6:"texture-compression-etc2",7:"texture-compression-astc",8:"texture-compression-astc-sliced-3d",9:"timestamp-query",10:"indirect-first-instance",11:"shader-f16",12:"rg11b10ufloat-renderable",13:"bgra8unorm-storage",14:"float32-filterable",15:"float32-blendable",16:"clip-distances",17:"dual-source-blending",18:"subgroups",19:"texture-formats-tier1",20:"texture-formats-tier2",21:"primitive-index",22:"texture-component-swizzle",327692:"chromium-experimental-unorm16-texture-formats",327729:"chromium-experimental-multi-draw-indirect"},FilterMode:[,"nearest","linear"],FrontFace:[,"ccw","cw"],IndexFormat:[,"uint16","uint32"],InstanceFeatureName:[,"timed-wait-any","shader-source-spirv","multiple-devices-per-adapter"],LoadOp:[,"load","clear"],MipmapFilterMode:[,"nearest","linear"],OptionalBool:["false","true"],PowerPreference:[,"low-power","high-performance"],PredefinedColorSpace:[,"srgb","display-p3"],PrimitiveTopology:[,"point-list","line-list","line-strip","triangle-list","triangle-strip"],QueryType:[,"occlusion","timestamp"],SamplerBindingType:[,,"filtering","non-filtering","comparison"],Status:[,"success","error"],StencilOperation:[,"keep","zero","replace","invert","increment-clamp","decrement-clamp","increment-wrap","decrement-wrap"],StorageTextureAccess:[,,"write-only","read-only","read-write"],StoreOp:[,"store","discard"],SurfaceGetCurrentTextureStatus:[,"success-optimal","success-suboptimal","timeout","outdated","lost","error"],TextureAspect:[,"all","stencil-only","depth-only"],TextureDimension:[,"1d","2d","3d"],TextureFormat:[,"r8unorm","r8snorm","r8uint","r8sint","r16unorm","r16snorm","r16uint","r16sint","r16float","rg8unorm","rg8snorm","rg8uint","rg8sint","r32float","r32uint","r32sint","rg16unorm","rg16snorm","rg16uint","rg16sint","rg16float","rgba8unorm","rgba8unorm-srgb","rgba8snorm","rgba8uint","rgba8sint","bgra8unorm","bgra8unorm-srgb","rgb10a2uint","rgb10a2unorm","rg11b10ufloat","rgb9e5ufloat","rg32float","rg32uint","rg32sint","rgba16unorm","rgba16snorm","rgba16uint","rgba16sint","rgba16float","rgba32float","rgba32uint","rgba32sint","stencil8","depth16unorm","depth24plus","depth24plus-stencil8","depth32float","depth32float-stencil8","bc1-rgba-unorm","bc1-rgba-unorm-srgb","bc2-rgba-unorm","bc2-rgba-unorm-srgb","bc3-rgba-unorm","bc3-rgba-unorm-srgb","bc4-r-unorm","bc4-r-snorm","bc5-rg-unorm","bc5-rg-snorm","bc6h-rgb-ufloat","bc6h-rgb-float","bc7-rgba-unorm","bc7-rgba-unorm-srgb","etc2-rgb8unorm","etc2-rgb8unorm-srgb","etc2-rgb8a1unorm","etc2-rgb8a1unorm-srgb","etc2-rgba8unorm","etc2-rgba8unorm-srgb","eac-r11unorm","eac-r11snorm","eac-rg11unorm","eac-rg11snorm","astc-4x4-unorm","astc-4x4-unorm-srgb","astc-5x4-unorm","astc-5x4-unorm-srgb","astc-5x5-unorm","astc-5x5-unorm-srgb","astc-6x5-unorm","astc-6x5-unorm-srgb","astc-6x6-unorm","astc-6x6-unorm-srgb","astc-8x5-unorm","astc-8x5-unorm-srgb","astc-8x6-unorm","astc-8x6-unorm-srgb","astc-8x8-unorm","astc-8x8-unorm-srgb","astc-10x5-unorm","astc-10x5-unorm-srgb","astc-10x6-unorm","astc-10x6-unorm-srgb","astc-10x8-unorm","astc-10x8-unorm-srgb","astc-10x10-unorm","astc-10x10-unorm-srgb","astc-12x10-unorm","astc-12x10-unorm-srgb","astc-12x12-unorm","astc-12x12-unorm-srgb"],TextureSampleType:[,,"float","unfilterable-float","depth","sint","uint"],TextureViewDimension:[,"1d","2d","2d-array","cube","cube-array","3d"],ToneMappingMode:[,"standard","extended"],VertexFormat:[,"uint8","uint8x2","uint8x4","sint8","sint8x2","sint8x4","unorm8","unorm8x2","unorm8x4","snorm8","snorm8x2","snorm8x4","uint16","uint16x2","uint16x4","sint16","sint16x2","sint16x4","unorm16","unorm16x2","unorm16x4","snorm16","snorm16x2","snorm16x4","float16","float16x2","float16x4","float32","float32x2","float32x3","float32x4","uint32","uint32x2","uint32x3","uint32x4","sint32","sint32x2","sint32x3","sint32x4","unorm10-10-10-2","unorm8x4-bgra"],VertexStepMode:[,"vertex","instance"],WGSLLanguageFeatureName:[,"readonly_and_readwrite_storage_textures","packed_4x8_integer_dot_product","unrestricted_pointer_parameters","pointer_composite_access","uniform_buffer_standard_layout","subgroup_id","texture_and_sampler_let","subgroup_uniformity","texture_formats_tier1"]};var emwgpuStringToInt_DeviceLostReason={undefined:1,unknown:1,destroyed:2};var runtimeKeepalivePop=()=>{runtimeKeepaliveCounter-=1};function _emwgpuAdapterRequestDevice(adapterPtr,futureId,deviceLostFutureId,devicePtr,queuePtr,descriptor){adapterPtr=bigintToI53Checked(adapterPtr);futureId=bigintToI53Checked(futureId);deviceLostFutureId=bigintToI53Checked(deviceLostFutureId);devicePtr=bigintToI53Checked(devicePtr);queuePtr=bigintToI53Checked(queuePtr);descriptor=bigintToI53Checked(descriptor);var adapter=WebGPU.getJsObject(adapterPtr);var desc={};if(descriptor){var requiredFeatureCount=Number((growMemViews(),HEAPU64)[(descriptor+24)/8]);if(requiredFeatureCount){var requiredFeaturesPtr=Number((growMemViews(),HEAPU64)[(descriptor+32)/8]);desc["requiredFeatures"]=Array.from((growMemViews(),HEAPU32).subarray(requiredFeaturesPtr/4,(requiredFeaturesPtr+requiredFeatureCount*4)/4),feature=>WebGPU.FeatureName[feature])}var limitsPtr=Number((growMemViews(),HEAPU64)[(descriptor+40)/8]);if(limitsPtr){var nextInChainPtr=Number((growMemViews(),HEAPU64)[limitsPtr/8]);var requiredLimits={};function setLimitU32IfDefined(name,basePtr,limitOffset,ignoreIfZero=false){var ptr=basePtr+limitOffset;var value=(growMemViews(),HEAPU32)[ptr/4];if(value!=4294967295&&(!ignoreIfZero||value!=0)){requiredLimits[name]=value}}function setLimitU64IfDefined(name,basePtr,limitOffset){var ptr=basePtr+limitOffset;var limitPart1=(growMemViews(),HEAPU32)[ptr/4];var limitPart2=(growMemViews(),HEAPU32)[(ptr+4)/4];if(limitPart1!=4294967295||limitPart2!=4294967295){requiredLimits[name]=readI53FromI64(ptr)}}setLimitU32IfDefined("maxTextureDimension1D",limitsPtr,8);setLimitU32IfDefined("maxTextureDimension2D",limitsPtr,12);setLimitU32IfDefined("maxTextureDimension3D",limitsPtr,16);setLimitU32IfDefined("maxTextureArrayLayers",limitsPtr,20);setLimitU32IfDefined("maxBindGroups",limitsPtr,24);setLimitU32IfDefined("maxBindGroupsPlusVertexBuffers",limitsPtr,28);setLimitU32IfDefined("maxBindingsPerBindGroup",limitsPtr,32);setLimitU32IfDefined("maxDynamicUniformBuffersPerPipelineLayout",limitsPtr,36);setLimitU32IfDefined("maxDynamicStorageBuffersPerPipelineLayout",limitsPtr,40);setLimitU32IfDefined("maxSampledTexturesPerShaderStage",limitsPtr,44);setLimitU32IfDefined("maxSamplersPerShaderStage",limitsPtr,48);setLimitU32IfDefined("maxStorageBuffersPerShaderStage",limitsPtr,52);setLimitU32IfDefined("maxStorageTexturesPerShaderStage",limitsPtr,56);setLimitU32IfDefined("maxUniformBuffersPerShaderStage",limitsPtr,60);setLimitU32IfDefined("minUniformBufferOffsetAlignment",limitsPtr,80);setLimitU32IfDefined("minStorageBufferOffsetAlignment",limitsPtr,84);setLimitU64IfDefined("maxUniformBufferBindingSize",limitsPtr,64);setLimitU64IfDefined("maxStorageBufferBindingSize",limitsPtr,72);setLimitU32IfDefined("maxVertexBuffers",limitsPtr,88);setLimitU64IfDefined("maxBufferSize",limitsPtr,96);setLimitU32IfDefined("maxVertexAttributes",limitsPtr,104);setLimitU32IfDefined("maxVertexBufferArrayStride",limitsPtr,108);setLimitU32IfDefined("maxInterStageShaderVariables",limitsPtr,112);setLimitU32IfDefined("maxColorAttachments",limitsPtr,116);setLimitU32IfDefined("maxColorAttachmentBytesPerSample",limitsPtr,120);setLimitU32IfDefined("maxComputeWorkgroupStorageSize",limitsPtr,124);setLimitU32IfDefined("maxComputeInvocationsPerWorkgroup",limitsPtr,128);setLimitU32IfDefined("maxComputeWorkgroupSizeX",limitsPtr,132);setLimitU32IfDefined("maxComputeWorkgroupSizeY",limitsPtr,136);setLimitU32IfDefined("maxComputeWorkgroupSizeZ",limitsPtr,140);setLimitU32IfDefined("maxComputeWorkgroupsPerDimension",limitsPtr,144);setLimitU32IfDefined("maxImmediateSize",limitsPtr,148,true);if(nextInChainPtr!==0){var sType=(growMemViews(),HEAP32)[(nextInChainPtr+8)/4];var compatibilityModeLimitsPtr=nextInChainPtr;if("maxStorageBuffersInVertexStage"in GPUSupportedLimits.prototype){setLimitU32IfDefined("maxStorageBuffersInVertexStage",compatibilityModeLimitsPtr,16);setLimitU32IfDefined("maxStorageTexturesInVertexStage",compatibilityModeLimitsPtr,20);setLimitU32IfDefined("maxStorageBuffersInFragmentStage",compatibilityModeLimitsPtr,24);setLimitU32IfDefined("maxStorageTexturesInFragmentStage",compatibilityModeLimitsPtr,28)}}desc["requiredLimits"]=requiredLimits}var defaultQueuePtr=Number((growMemViews(),HEAPU64)[(descriptor+48)/8]);if(defaultQueuePtr){var defaultQueueDesc={label:WebGPU.makeStringFromOptionalStringView(defaultQueuePtr+8)};desc["defaultQueue"]=defaultQueueDesc}desc["label"]=WebGPU.makeStringFromOptionalStringView(descriptor+8)}runtimeKeepalivePush();WebGPU.Internals.futureInsert(futureId,adapter.requestDevice(desc).then(device=>{runtimeKeepalivePop();callUserCallback(()=>{WebGPU.Internals.jsObjectInsert(queuePtr,device.queue);WebGPU.Internals.jsObjectInsert(devicePtr,device);devicePtr=BigInt(devicePtr);WebGPU.Internals.futureInsert(deviceLostFutureId,device.lost.then(info=>{callUserCallback(()=>{device.onuncapturederror=ev=>{};var sp=stackSave();var messagePtr=stringToUTF8OnStack(info.message);_emwgpuOnDeviceLostCompleted(deviceLostFutureId,emwgpuStringToInt_DeviceLostReason[info.reason],BigInt(messagePtr));stackRestore(sp)})}));device.onuncapturederror=ev=>{var type=5;if(ev.error instanceof GPUValidationError)type=2;else if(ev.error instanceof GPUOutOfMemoryError)type=3;else if(ev.error instanceof GPUInternalError)type=4;var sp=stackSave();var messagePtr=stringToUTF8OnStack(ev.error.message);_emwgpuOnUncapturedError(BigInt(devicePtr),type,BigInt(messagePtr));stackRestore(sp)};_emwgpuOnRequestDeviceCompleted(futureId,1,BigInt(devicePtr),0n)})},ex=>{runtimeKeepalivePop();callUserCallback(()=>{var sp=stackSave();var messagePtr=stringToUTF8OnStack(ex.message);_emwgpuOnRequestDeviceCompleted(futureId,3,BigInt(devicePtr),BigInt(messagePtr));if(deviceLostFutureId){_emwgpuOnDeviceLostCompleted(deviceLostFutureId,4,BigInt(messagePtr))}stackRestore(sp)})}))}function _emwgpuBufferDestroy(bufferPtr){bufferPtr=bigintToI53Checked(bufferPtr);var buffer=WebGPU.getJsObject(bufferPtr);var onUnmap=WebGPU.Internals.bufferOnUnmaps[bufferPtr];if(onUnmap){for(var i=0;i<onUnmap.length;++i){onUnmap[i]()}delete WebGPU.Internals.bufferOnUnmaps[bufferPtr]}buffer.destroy()}var warnOnce=text=>{warnOnce.shown||={};if(!warnOnce.shown[text]){warnOnce.shown[text]=1;if(ENVIRONMENT_IS_NODE)text="warning: "+text;err(text)}};var _emwgpuBufferGetConstMappedRange=function(bufferPtr,offset,size){bufferPtr=bigintToI53Checked(bufferPtr);offset=bigintToI53Checked(offset);size=bigintToI53Checked(size);var ret=(()=>{var buffer=WebGPU.getJsObject(bufferPtr);if(size==-1)size=undefined;var mapped;try{mapped=buffer.getMappedRange(offset,size)}catch(ex){return 0n}var data=_memalign(16,mapped.byteLength);(growMemViews(),HEAPU8).set(new Uint8Array(mapped),data);WebGPU.Internals.bufferOnUnmaps[bufferPtr].push(()=>_free(data));return data})();return BigInt(ret)};var _emwgpuBufferMapAsync=function(bufferPtr,futureId,mode,offset,size){bufferPtr=bigintToI53Checked(bufferPtr);futureId=bigintToI53Checked(futureId);mode=bigintToI53Checked(mode);offset=bigintToI53Checked(offset);size=bigintToI53Checked(size);var buffer=WebGPU.getJsObject(bufferPtr);WebGPU.Internals.bufferOnUnmaps[bufferPtr]=[];if(size==-1)size=undefined;runtimeKeepalivePush();WebGPU.Internals.futureInsert(futureId,buffer.mapAsync(mode,offset,size).then(()=>{runtimeKeepalivePop();callUserCallback(()=>{_emwgpuOnMapAsyncCompleted(futureId,1,0n)})},ex=>{runtimeKeepalivePop();callUserCallback(()=>{var sp=stackSave();var messagePtr=stringToUTF8OnStack(ex.message);var status=ex.name==="AbortError"?4:ex.name==="OperationError"?3:0;_emwgpuOnMapAsyncCompleted(futureId,status,BigInt(messagePtr));delete WebGPU.Internals.bufferOnUnmaps[bufferPtr]})}))};function _emwgpuBufferUnmap(bufferPtr){bufferPtr=bigintToI53Checked(bufferPtr);var buffer=WebGPU.getJsObject(bufferPtr);var onUnmap=WebGPU.Internals.bufferOnUnmaps[bufferPtr];if(!onUnmap){return}for(var i=0;i<onUnmap.length;++i){onUnmap[i]()}delete WebGPU.Internals.bufferOnUnmaps[bufferPtr];buffer.unmap()}function _emwgpuDelete(ptr){ptr=bigintToI53Checked(ptr);delete WebGPU.Internals.jsObjects[ptr]}function _emwgpuDeviceCreateBuffer(devicePtr,descriptor,bufferPtr){devicePtr=bigintToI53Checked(devicePtr);descriptor=bigintToI53Checked(descriptor);bufferPtr=bigintToI53Checked(bufferPtr);var mappedAtCreation=!!(growMemViews(),HEAPU32)[(descriptor+40)/4];var desc={label:WebGPU.makeStringFromOptionalStringView(descriptor+8),usage:(growMemViews(),HEAPU32)[(descriptor+24)/4],size:readI53FromI64(descriptor+32),mappedAtCreation};var device=WebGPU.getJsObject(devicePtr);var buffer;try{buffer=device.createBuffer(desc)}catch(ex){return false}WebGPU.Internals.jsObjectInsert(bufferPtr,buffer);if(mappedAtCreation){WebGPU.Internals.bufferOnUnmaps[bufferPtr]=[]}return true}function _emwgpuDeviceCreateShaderModule(devicePtr,descriptor,shaderModulePtr){devicePtr=bigintToI53Checked(devicePtr);descriptor=bigintToI53Checked(descriptor);shaderModulePtr=bigintToI53Checked(shaderModulePtr);var nextInChainPtr=Number((growMemViews(),HEAPU64)[descriptor/8]);var sType=(growMemViews(),HEAP32)[(nextInChainPtr+8)/4];var desc={label:WebGPU.makeStringFromOptionalStringView(descriptor+8),code:""};switch(sType){case 2:{desc["code"]=WebGPU.makeStringFromStringView(nextInChainPtr+16);break}}var device=WebGPU.getJsObject(devicePtr);WebGPU.Internals.jsObjectInsert(shaderModulePtr,device.createShaderModule(desc))}var _emwgpuDeviceDestroy=devicePtr=>{const device=WebGPU.getJsObject(devicePtr);device.onuncapturederror=null;device.destroy()};function _emwgpuInstanceRequestAdapter(instancePtr,futureId,options,adapterPtr){instancePtr=bigintToI53Checked(instancePtr);futureId=bigintToI53Checked(futureId);options=bigintToI53Checked(options);adapterPtr=bigintToI53Checked(adapterPtr);var opts;if(options){opts={featureLevel:WebGPU.FeatureLevel[(growMemViews(),HEAP32)[(options+8)/4]],powerPreference:WebGPU.PowerPreference[(growMemViews(),HEAP32)[(options+12)/4]],forceFallbackAdapter:!!(growMemViews(),HEAPU32)[(options+16)/4]};var nextInChainPtr=Number((growMemViews(),HEAPU64)[options/8]);if(nextInChainPtr!==0){var sType=(growMemViews(),HEAP32)[(nextInChainPtr+8)/4];var webxrOptions=nextInChainPtr;opts.xrCompatible=!!(growMemViews(),HEAPU32)[(webxrOptions+16)/4]}}if(!("gpu"in navigator)){var sp=stackSave();var messagePtr=stringToUTF8OnStack("WebGPU not available on this browser (navigator.gpu is not available)");_emwgpuOnRequestAdapterCompleted(futureId,3,BigInt(adapterPtr),BigInt(messagePtr));stackRestore(sp);return}runtimeKeepalivePush();WebGPU.Internals.futureInsert(futureId,navigator.gpu.requestAdapter(opts).then(adapter=>{runtimeKeepalivePop();callUserCallback(()=>{if(adapter){WebGPU.Internals.jsObjectInsert(adapterPtr,adapter);_emwgpuOnRequestAdapterCompleted(futureId,1,BigInt(adapterPtr),0n)}else{var sp=stackSave();var messagePtr=stringToUTF8OnStack("WebGPU not available on this browser (requestAdapter returned null)");_emwgpuOnRequestAdapterCompleted(futureId,3,BigInt(adapterPtr),BigInt(messagePtr));stackRestore(sp)}})},ex=>{runtimeKeepalivePop();callUserCallback(()=>{var sp=stackSave();var messagePtr=stringToUTF8OnStack(ex.message);_emwgpuOnRequestAdapterCompleted(futureId,4,BigInt(adapterPtr),BigInt(messagePtr));stackRestore(sp)})}))}var _emwgpuQueueOnSubmittedWorkDone=function(queuePtr,futureId){queuePtr=bigintToI53Checked(queuePtr);futureId=bigintToI53Checked(futureId);var queue=WebGPU.getJsObject(queuePtr);runtimeKeepalivePush();WebGPU.Internals.futureInsert(futureId,queue.onSubmittedWorkDone().then(()=>{runtimeKeepalivePop();callUserCallback(()=>{_emwgpuOnWorkDoneCompleted(futureId,1)})}))};var _emwgpuWaitAny=function(futurePtr,futureCount,timeoutMSPtr){futurePtr=bigintToI53Checked(futurePtr);futureCount=bigintToI53Checked(futureCount);timeoutMSPtr=bigintToI53Checked(timeoutMSPtr);return Asyncify.handleAsync(async()=>{var promises=[];if(timeoutMSPtr){var timeoutMS=(growMemViews(),HEAP32)[timeoutMSPtr/4];promises.length=futureCount+1;promises[futureCount]=new Promise(resolve=>setTimeout(resolve,timeoutMS,0))}else{promises.length=futureCount}for(var i=0;i<futureCount;++i){var futureId=readI53FromI64(futurePtr+i*8);if(!(futureId in WebGPU.Internals.futures)){return futureId}promises[i]=WebGPU.Internals.futures[futureId]}const firstResolvedFuture=await Promise.race(promises);delete WebGPU.Internals.futures[firstResolvedFuture];return firstResolvedFuture})};_emwgpuWaitAny.isAsync=true;var ENV={};var getExecutableName=()=>thisProgram||"./this.program";var getEnvStrings=()=>{if(!getEnvStrings.strings){var lang=(typeof navigator=="object"&&navigator.language||"C").replace("-","_")+".UTF-8";var env={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:lang,_:getExecutableName()};for(var x in ENV){if(ENV[x]===undefined)delete env[x];else env[x]=ENV[x]}var strings=[];for(var x in env){strings.push(`${x}=${env[x]}`)}getEnvStrings.strings=strings}return getEnvStrings.strings};function _environ_get(__environ,environ_buf){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(14,0,1,__environ,environ_buf);__environ=bigintToI53Checked(__environ);environ_buf=bigintToI53Checked(environ_buf);var bufSize=0;var envp=0;for(var string of getEnvStrings()){var ptr=environ_buf+bufSize;(growMemViews(),HEAPU64)[(__environ+envp)/8]=BigInt(ptr);bufSize+=stringToUTF8(string,ptr,Infinity)+1;envp+=8}return 0}function _environ_sizes_get(penviron_count,penviron_buf_size){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(15,0,1,penviron_count,penviron_buf_size);penviron_count=bigintToI53Checked(penviron_count);penviron_buf_size=bigintToI53Checked(penviron_buf_size);var strings=getEnvStrings();(growMemViews(),HEAPU64)[penviron_count/8]=BigInt(strings.length);var bufSize=0;for(var string of strings){bufSize+=lengthBytesUTF8(string)+1}(growMemViews(),HEAPU64)[penviron_buf_size/8]=BigInt(bufSize);return 0}function _fd_close(fd){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(16,0,1,fd);try{var stream=SYSCALLS.getStreamFromFD(fd);FS.close(stream);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}var doReadv=(stream,iov,iovcnt,offset)=>{var ret=0;for(var i=0;i<iovcnt;i++){var ptr=Number((growMemViews(),HEAPU64)[iov/8]);var len=Number((growMemViews(),HEAPU64)[(iov+8)/8]);iov+=16;var curr=FS.read(stream,(growMemViews(),HEAP8),ptr,len,offset);if(curr<0)return-1;ret+=curr;if(curr<len)break;if(typeof offset!="undefined"){offset+=curr}}return ret};function _fd_read(fd,iov,iovcnt,pnum){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(17,0,1,fd,iov,iovcnt,pnum);iov=bigintToI53Checked(iov);iovcnt=bigintToI53Checked(iovcnt);pnum=bigintToI53Checked(pnum);try{var stream=SYSCALLS.getStreamFromFD(fd);var num=doReadv(stream,iov,iovcnt);(growMemViews(),HEAPU64)[pnum/8]=BigInt(num);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}function _fd_seek(fd,offset,whence,newOffset){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(18,0,1,fd,offset,whence,newOffset);offset=bigintToI53Checked(offset);newOffset=bigintToI53Checked(newOffset);try{if(isNaN(offset))return 61;var stream=SYSCALLS.getStreamFromFD(fd);FS.llseek(stream,offset,whence);(growMemViews(),HEAP64)[newOffset/8]=BigInt(stream.position);if(stream.getdents&&offset===0&&whence===0)stream.getdents=null;return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}var doWritev=(stream,iov,iovcnt,offset)=>{var ret=0;for(var i=0;i<iovcnt;i++){var ptr=Number((growMemViews(),HEAPU64)[iov/8]);var len=Number((growMemViews(),HEAPU64)[(iov+8)/8]);iov+=16;var curr=FS.write(stream,(growMemViews(),HEAP8),ptr,len,offset);if(curr<0)return-1;ret+=curr;if(curr<len){break}if(typeof offset!="undefined"){offset+=curr}}return ret};function _fd_write(fd,iov,iovcnt,pnum){if(ENVIRONMENT_IS_PTHREAD)return proxyToMainThread(19,0,1,fd,iov,iovcnt,pnum);iov=bigintToI53Checked(iov);iovcnt=bigintToI53Checked(iovcnt);pnum=bigintToI53Checked(pnum);try{var stream=SYSCALLS.getStreamFromFD(fd);var num=doWritev(stream,iov,iovcnt);(growMemViews(),HEAPU64)[pnum/8]=BigInt(num);return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}function _random_get(buffer,size){buffer=bigintToI53Checked(buffer);size=bigintToI53Checked(size);try{randomFill((growMemViews(),HEAPU8).subarray(buffer,buffer+size));return 0}catch(e){if(typeof FS=="undefined"||!(e.name==="ErrnoError"))throw e;return e.errno}}function _wgpuAdapterGetInfo(adapterPtr,info){adapterPtr=bigintToI53Checked(adapterPtr);info=bigintToI53Checked(info);var adapter=WebGPU.getJsObject(adapterPtr);WebGPU.fillAdapterInfoStruct(adapter.info,info);return 1}function _wgpuAdapterGetLimits(adapterPtr,limitsOutPtr){adapterPtr=bigintToI53Checked(adapterPtr);limitsOutPtr=bigintToI53Checked(limitsOutPtr);var adapter=WebGPU.getJsObject(adapterPtr);WebGPU.fillLimitStruct(adapter.limits,limitsOutPtr);return 1}function _wgpuAdapterHasFeature(adapterPtr,featureEnumValue){adapterPtr=bigintToI53Checked(adapterPtr);var adapter=WebGPU.getJsObject(adapterPtr);return adapter.features.has(WebGPU.FeatureName[featureEnumValue])}var _wgpuBufferGetSize=function(bufferPtr){bufferPtr=bigintToI53Checked(bufferPtr);var ret=(()=>{var buffer=WebGPU.getJsObject(bufferPtr);return buffer.size})();return BigInt(ret)};var _wgpuCommandEncoderBeginComputePass=function(encoderPtr,descriptor){encoderPtr=bigintToI53Checked(encoderPtr);descriptor=bigintToI53Checked(descriptor);var ret=(()=>{var desc;if(descriptor){desc={label:WebGPU.makeStringFromOptionalStringView(descriptor+8),timestampWrites:WebGPU.makePassTimestampWrites(Number((growMemViews(),HEAPU64)[(descriptor+24)/8]))}}var commandEncoder=WebGPU.getJsObject(encoderPtr);var ptr=_emwgpuCreateComputePassEncoder(0n);WebGPU.Internals.jsObjectInsert(ptr,commandEncoder.beginComputePass(desc));return ptr})();return BigInt(ret)};function _wgpuCommandEncoderCopyBufferToBuffer(encoderPtr,srcPtr,srcOffset,dstPtr,dstOffset,size){encoderPtr=bigintToI53Checked(encoderPtr);srcPtr=bigintToI53Checked(srcPtr);srcOffset=bigintToI53Checked(srcOffset);dstPtr=bigintToI53Checked(dstPtr);dstOffset=bigintToI53Checked(dstOffset);size=bigintToI53Checked(size);var commandEncoder=WebGPU.getJsObject(encoderPtr);var src=WebGPU.getJsObject(srcPtr);var dst=WebGPU.getJsObject(dstPtr);commandEncoder.copyBufferToBuffer(src,srcOffset,dst,dstOffset,size)}var _wgpuCommandEncoderFinish=function(encoderPtr,descriptor){encoderPtr=bigintToI53Checked(encoderPtr);descriptor=bigintToI53Checked(descriptor);var ret=(()=>{var commandEncoder=WebGPU.getJsObject(encoderPtr);var ptr=_emwgpuCreateCommandBuffer(0n);WebGPU.Internals.jsObjectInsert(ptr,commandEncoder.finish());return ptr})();return BigInt(ret)};function _wgpuComputePassEncoderDispatchWorkgroups(passPtr,x,y,z){passPtr=bigintToI53Checked(passPtr);var pass=WebGPU.getJsObject(passPtr);pass.dispatchWorkgroups(x,y,z)}function _wgpuComputePassEncoderEnd(passPtr){passPtr=bigintToI53Checked(passPtr);var pass=WebGPU.getJsObject(passPtr);pass.end()}function _wgpuComputePassEncoderSetBindGroup(passPtr,groupIndex,groupPtr,dynamicOffsetCount,dynamicOffsetsPtr){passPtr=bigintToI53Checked(passPtr);groupPtr=bigintToI53Checked(groupPtr);dynamicOffsetCount=bigintToI53Checked(dynamicOffsetCount);dynamicOffsetsPtr=bigintToI53Checked(dynamicOffsetsPtr);var pass=WebGPU.getJsObject(passPtr);var group=WebGPU.getJsObject(groupPtr);if(dynamicOffsetCount==0){pass.setBindGroup(groupIndex,group)}else{pass.setBindGroup(groupIndex,group,(growMemViews(),HEAPU32),dynamicOffsetsPtr/4,dynamicOffsetCount)}}function _wgpuComputePassEncoderSetPipeline(passPtr,pipelinePtr){passPtr=bigintToI53Checked(passPtr);pipelinePtr=bigintToI53Checked(pipelinePtr);var pass=WebGPU.getJsObject(passPtr);var pipeline=WebGPU.getJsObject(pipelinePtr);pass.setPipeline(pipeline)}var _wgpuComputePipelineGetBindGroupLayout=function(pipelinePtr,groupIndex){pipelinePtr=bigintToI53Checked(pipelinePtr);var ret=(()=>{var pipeline=WebGPU.getJsObject(pipelinePtr);var ptr=_emwgpuCreateBindGroupLayout(0n);WebGPU.Internals.jsObjectInsert(ptr,pipeline.getBindGroupLayout(groupIndex));return ptr})();return BigInt(ret)};var _wgpuDeviceCreateBindGroup=function(devicePtr,descriptor){devicePtr=bigintToI53Checked(devicePtr);descriptor=bigintToI53Checked(descriptor);var ret=(()=>{function makeEntry(entryPtr){var bufferPtr=Number((growMemViews(),HEAPU64)[(entryPtr+16)/8]);var samplerPtr=Number((growMemViews(),HEAPU64)[(entryPtr+40)/8]);var textureViewPtr=Number((growMemViews(),HEAPU64)[(entryPtr+48)/8]);var externalTexturePtr=0;WebGPU.iterateExtensions(entryPtr,{327681:ptr=>{externalTexturePtr=Number((growMemViews(),HEAPU64)[(ptr+16)/8])}});var resource;if(bufferPtr){var size=readI53FromI64(entryPtr+32);if(size==-1)size=undefined;resource={buffer:WebGPU.getJsObject(bufferPtr),offset:readI53FromI64(entryPtr+24),size}}else{resource=WebGPU.getJsObject(samplerPtr||textureViewPtr||externalTexturePtr)}return{binding:(growMemViews(),HEAPU32)[(entryPtr+8)/4],resource}}function makeEntries(count,entriesPtrs){var entries=[];for(var i=0;i<count;++i){entries.push(makeEntry(entriesPtrs+56*i))}return entries}var desc={label:WebGPU.makeStringFromOptionalStringView(descriptor+8),layout:WebGPU.getJsObject(Number((growMemViews(),HEAPU64)[(descriptor+24)/8])),entries:makeEntries(Number((growMemViews(),HEAPU64)[(descriptor+32)/8]),Number((growMemViews(),HEAPU64)[(descriptor+40)/8]))};var device=WebGPU.getJsObject(devicePtr);var ptr=_emwgpuCreateBindGroup(0n);WebGPU.Internals.jsObjectInsert(ptr,device.createBindGroup(desc));return ptr})();return BigInt(ret)};var _wgpuDeviceCreateCommandEncoder=function(devicePtr,descriptor){devicePtr=bigintToI53Checked(devicePtr);descriptor=bigintToI53Checked(descriptor);var ret=(()=>{var desc;if(descriptor){desc={label:WebGPU.makeStringFromOptionalStringView(descriptor+8)}}var device=WebGPU.getJsObject(devicePtr);var ptr=_emwgpuCreateCommandEncoder(0n);WebGPU.Internals.jsObjectInsert(ptr,device.createCommandEncoder(desc));return ptr})();return BigInt(ret)};var _wgpuDeviceCreateComputePipeline=function(devicePtr,descriptor){devicePtr=bigintToI53Checked(devicePtr);descriptor=bigintToI53Checked(descriptor);var ret=(()=>{var desc=WebGPU.makeComputePipelineDesc(descriptor);var device=WebGPU.getJsObject(devicePtr);var ptr=_emwgpuCreateComputePipeline(0n);WebGPU.Internals.jsObjectInsert(ptr,device.createComputePipeline(desc));return ptr})();return BigInt(ret)};function _wgpuInstanceHasWGSLLanguageFeature(instance,featureEnumValue){instance=bigintToI53Checked(instance);if(!("wgslLanguageFeatures"in navigator.gpu)){return false}return navigator.gpu.wgslLanguageFeatures.has(WebGPU.WGSLLanguageFeatureName[featureEnumValue])}var _wgpuQueueSubmit=function(queuePtr,commandCount,commands){queuePtr=bigintToI53Checked(queuePtr);commandCount=bigintToI53Checked(commandCount);commands=bigintToI53Checked(commands);var queue=WebGPU.getJsObject(queuePtr);var cmds=Array.from((growMemViews(),HEAP64).subarray(commands/8,(commands+commandCount*8)/8),id=>WebGPU.getJsObject(id));queue.submit(cmds)};function _wgpuQueueWriteBuffer(queuePtr,bufferPtr,bufferOffset,data,size){queuePtr=bigintToI53Checked(queuePtr);bufferPtr=bigintToI53Checked(bufferPtr);bufferOffset=bigintToI53Checked(bufferOffset);data=bigintToI53Checked(data);size=bigintToI53Checked(size);var queue=WebGPU.getJsObject(queuePtr);var buffer=WebGPU.getJsObject(bufferPtr);var subarray=(growMemViews(),HEAPU8).subarray(data,data+size);queue.writeBuffer(buffer,bufferOffset,subarray,0,size)}var Asyncify={instrumentWasmImports(imports){var importPattern=/^(invoke_.*|__asyncjs__.*)$/;for(let[x,original]of Object.entries(imports)){if(typeof original=="function"){let isAsyncifyImport=original.isAsync||importPattern.test(x);if(isAsyncifyImport){imports[x]=original=new WebAssembly.Suspending(original)}}}},instrumentFunction(original){var wrapper=(...args)=>original(...args);return wrapper},instrumentWasmExports(exports){var exportPattern=/^(wllama_start|wllama_action|main|__main_argc_argv)$/;Asyncify.asyncExports=new Set;var ret={};for(let[x,original]of Object.entries(exports)){if(typeof original=="function"){let isAsyncifyExport=exportPattern.test(x);if(isAsyncifyExport){Asyncify.asyncExports.add(original);original=Asyncify.makeAsyncFunction(original)}var wrapper=Asyncify.instrumentFunction(original);ret[x]=wrapper}else{ret[x]=original}}return ret},asyncExports:null,isAsyncExport(func){return Asyncify.asyncExports?.has(func)},handleAsync:async startAsync=>{runtimeKeepalivePush();try{return await startAsync()}finally{runtimeKeepalivePop()}},handleSleep:startAsync=>Asyncify.handleAsync(()=>new Promise(startAsync)),makeAsyncFunction(original){return WebAssembly.promising(original)}};var getCFunc=ident=>{var func=Module["_"+ident];return func};var writeArrayToMemory=(array,buffer)=>{(growMemViews(),HEAP8).set(array,buffer)};var ccall=(ident,returnType,argTypes,args,opts)=>{var toC={pointer:p=>BigInt(p),string:str=>{var ret=0;if(str!==null&&str!==undefined&&str!==0){ret=stringToUTF8OnStack(str)}return BigInt(ret)},array:arr=>{var ret=stackAlloc(arr.length);writeArrayToMemory(arr,ret);return BigInt(ret)}};function convertReturnValue(ret){if(returnType==="string"){return UTF8ToString(Number(ret))}if(returnType==="pointer")return Number(ret);if(returnType==="boolean")return Boolean(ret);return ret}var func=getCFunc(ident);var cArgs=[];var stack=0;if(args){for(var i=0;i<args.length;i++){var converter=toC[argTypes[i]];if(converter){if(stack===0)stack=stackSave();cArgs[i]=converter(args[i])}else{cArgs[i]=args[i]}}}var ret=func(...cArgs);function onDone(ret){if(stack!==0)stackRestore(stack);return convertReturnValue(ret)}var asyncMode=opts?.async;if(asyncMode)return ret.then(onDone);ret=onDone(ret);return ret};var cwrap=(ident,returnType,argTypes,opts)=>{var numericArgs=!argTypes||argTypes.every(type=>type==="number"||type==="boolean");var numericRet=returnType!=="string";if(numericRet&&numericArgs&&!opts){return getCFunc(ident)}return(...args)=>ccall(ident,returnType,argTypes,args,opts)};var FS_createPath=(...args)=>FS.createPath(...args);var FS_unlink=(...args)=>FS.unlink(...args);var FS_createLazyFile=(...args)=>FS.createLazyFile(...args);var FS_createDevice=(...args)=>FS.createDevice(...args);PThread.init();FS.createPreloadedFile=FS_createPreloadedFile;FS.preloadFile=FS_preloadFile;FS.staticInit();{initMemory();if(Module["noExitRuntime"])noExitRuntime=Module["noExitRuntime"];if(Module["preloadPlugins"])preloadPlugins=Module["preloadPlugins"];if(Module["print"])out=Module["print"];if(Module["printErr"])err=Module["printErr"];if(Module["wasmBinary"])wasmBinary=Module["wasmBinary"];if(Module["arguments"])arguments_=Module["arguments"];if(Module["thisProgram"])thisProgram=Module["thisProgram"];if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].shift()()}}}Module["ENV"]=ENV;Module["mmapAlloc"]=mmapAlloc;Module["wasmMemory"]=wasmMemory;Module["addRunDependency"]=addRunDependency;Module["removeRunDependency"]=removeRunDependency;Module["ccall"]=ccall;Module["cwrap"]=cwrap;Module["FS_preloadFile"]=FS_preloadFile;Module["FS_unlink"]=FS_unlink;Module["FS_createPath"]=FS_createPath;Module["FS_createDevice"]=FS_createDevice;Module["FS"]=FS;Module["FS_createDataFile"]=FS_createDataFile;Module["FS_createLazyFile"]=FS_createLazyFile;Module["MEMFS"]=MEMFS;var proxiedFunctionTable=[_proc_exit,exitOnMainThread,pthreadCreateProxied,___syscall_fcntl64,___syscall_fstat64,___syscall_getcwd,___syscall_getdents64,___syscall_ioctl,___syscall_lstat64,___syscall_newfstatat,___syscall_openat,___syscall_stat64,__mmap_js,__munmap_js,_environ_get,_environ_sizes_get,_fd_close,_fd_read,_fd_seek,_fd_write];function __asyncjs__js_file_read(path_ptr,offset,req_size,out_ptr){return Asyncify.handleAsync(async()=>await _wllama_js_file_read(UTF8ToString(Number(path_ptr)),Number(offset),Number(req_size),Number(out_ptr)))}__asyncjs__js_file_read.sig="jjjjj";var _malloc,_free,_wllama_malloc,_wllama_start,_wllama_action,_wllama_exit,_wllama_debug,_main,_emwgpuCreateBindGroup,_emwgpuCreateBindGroupLayout,_emwgpuCreateCommandBuffer,_emwgpuCreateCommandEncoder,_emwgpuCreateComputePassEncoder,_emwgpuCreateComputePipeline,_emwgpuCreateExternalTexture,_emwgpuCreatePipelineLayout,_emwgpuCreateQuerySet,_emwgpuCreateRenderBundle,_emwgpuCreateRenderBundleEncoder,_emwgpuCreateRenderPassEncoder,_emwgpuCreateRenderPipeline,_emwgpuCreateSampler,_emwgpuCreateSurface,_emwgpuCreateTexture,_emwgpuCreateTextureView,_emwgpuCreateAdapter,_emwgpuCreateBuffer,_emwgpuCreateDevice,_emwgpuCreateQueue,_emwgpuCreateShaderModule,_emwgpuOnDeviceLostCompleted,_emwgpuOnMapAsyncCompleted,_emwgpuOnRequestAdapterCompleted,_emwgpuOnRequestDeviceCompleted,_emwgpuOnWorkDoneCompleted,_emwgpuOnUncapturedError,__emscripten_tls_init,_pthread_self,_emscripten_builtin_memalign,__emscripten_thread_init,__emscripten_thread_crashed,__emscripten_run_js_on_main_thread,__emscripten_thread_free_data,__emscripten_thread_exit,__emscripten_check_mailbox,_memalign,___trap,_emscripten_stack_set_limits,__emscripten_stack_restore,__emscripten_stack_alloc,_emscripten_stack_get_current,__indirect_function_table,wasmTable;function assignWasmExports(wasmExports){_malloc=wasmExports["malloc"];_free=wasmExports["free"];_wllama_malloc=Module["_wllama_malloc"]=wasmExports["wllama_malloc"];_wllama_start=Module["_wllama_start"]=wasmExports["wllama_start"];_wllama_action=Module["_wllama_action"]=wasmExports["wllama_action"];_wllama_exit=Module["_wllama_exit"]=wasmExports["wllama_exit"];_wllama_debug=Module["_wllama_debug"]=wasmExports["wllama_debug"];_main=Module["_main"]=wasmExports["main"];_emwgpuCreateBindGroup=wasmExports["emwgpuCreateBindGroup"];_emwgpuCreateBindGroupLayout=wasmExports["emwgpuCreateBindGroupLayout"];_emwgpuCreateCommandBuffer=wasmExports["emwgpuCreateCommandBuffer"];_emwgpuCreateCommandEncoder=wasmExports["emwgpuCreateCommandEncoder"];_emwgpuCreateComputePassEncoder=wasmExports["emwgpuCreateComputePassEncoder"];_emwgpuCreateComputePipeline=wasmExports["emwgpuCreateComputePipeline"];_emwgpuCreateExternalTexture=wasmExports["emwgpuCreateExternalTexture"];_emwgpuCreatePipelineLayout=wasmExports["emwgpuCreatePipelineLayout"];_emwgpuCreateQuerySet=wasmExports["emwgpuCreateQuerySet"];_emwgpuCreateRenderBundle=wasmExports["emwgpuCreateRenderBundle"];_emwgpuCreateRenderBundleEncoder=wasmExports["emwgpuCreateRenderBundleEncoder"];_emwgpuCreateRenderPassEncoder=wasmExports["emwgpuCreateRenderPassEncoder"];_emwgpuCreateRenderPipeline=wasmExports["emwgpuCreateRenderPipeline"];_emwgpuCreateSampler=wasmExports["emwgpuCreateSampler"];_emwgpuCreateSurface=wasmExports["emwgpuCreateSurface"];_emwgpuCreateTexture=wasmExports["emwgpuCreateTexture"];_emwgpuCreateTextureView=wasmExports["emwgpuCreateTextureView"];_emwgpuCreateAdapter=wasmExports["emwgpuCreateAdapter"];_emwgpuCreateBuffer=wasmExports["emwgpuCreateBuffer"];_emwgpuCreateDevice=wasmExports["emwgpuCreateDevice"];_emwgpuCreateQueue=wasmExports["emwgpuCreateQueue"];_emwgpuCreateShaderModule=wasmExports["emwgpuCreateShaderModule"];_emwgpuOnDeviceLostCompleted=wasmExports["emwgpuOnDeviceLostCompleted"];_emwgpuOnMapAsyncCompleted=wasmExports["emwgpuOnMapAsyncCompleted"];_emwgpuOnRequestAdapterCompleted=wasmExports["emwgpuOnRequestAdapterCompleted"];_emwgpuOnRequestDeviceCompleted=wasmExports["emwgpuOnRequestDeviceCompleted"];_emwgpuOnWorkDoneCompleted=wasmExports["emwgpuOnWorkDoneCompleted"];_emwgpuOnUncapturedError=wasmExports["emwgpuOnUncapturedError"];__emscripten_tls_init=wasmExports["_emscripten_tls_init"];_pthread_self=wasmExports["pthread_self"];_emscripten_builtin_memalign=wasmExports["emscripten_builtin_memalign"];__emscripten_thread_init=wasmExports["_emscripten_thread_init"];__emscripten_thread_crashed=wasmExports["_emscripten_thread_crashed"];__emscripten_run_js_on_main_thread=wasmExports["_emscripten_run_js_on_main_thread"];__emscripten_thread_free_data=wasmExports["_emscripten_thread_free_data"];__emscripten_thread_exit=wasmExports["_emscripten_thread_exit"];__emscripten_check_mailbox=wasmExports["_emscripten_check_mailbox"];_memalign=wasmExports["memalign"];___trap=wasmExports["__trap"];_emscripten_stack_set_limits=wasmExports["emscripten_stack_set_limits"];__emscripten_stack_restore=wasmExports["_emscripten_stack_restore"];__emscripten_stack_alloc=wasmExports["_emscripten_stack_alloc"];_emscripten_stack_get_current=wasmExports["emscripten_stack_get_current"];__indirect_function_table=wasmTable=wasmExports["__indirect_function_table"]}var wasmImports;function assignWasmImports(){wasmImports={__asyncjs__js_file_read,__pthread_create_js:___pthread_create_js,__syscall_fcntl64:___syscall_fcntl64,__syscall_getcwd:___syscall_getcwd,__syscall_getdents64:___syscall_getdents64,__syscall_ioctl:___syscall_ioctl,__syscall_openat:___syscall_openat,__syscall_stat64:___syscall_stat64,_abort_js:__abort_js,_emscripten_init_main_thread_js:__emscripten_init_main_thread_js,_emscripten_notify_mailbox_postmessage:__emscripten_notify_mailbox_postmessage,_emscripten_receive_on_main_thread_js:__emscripten_receive_on_main_thread_js,_emscripten_thread_cleanup:__emscripten_thread_cleanup,_emscripten_thread_mailbox_await:__emscripten_thread_mailbox_await,_emscripten_thread_set_strongref:__emscripten_thread_set_strongref,_localtime_js:__localtime_js,_mmap_js:__mmap_js,_munmap_js:__munmap_js,_tzset_js:__tzset_js,clock_time_get:_clock_time_get,emscripten_check_blocking_allowed:_emscripten_check_blocking_allowed,emscripten_date_now:_emscripten_date_now,emscripten_exit_with_live_runtime:_emscripten_exit_with_live_runtime,emscripten_get_callstack:_emscripten_get_callstack,emscripten_get_heap_max:_emscripten_get_heap_max,emscripten_get_now:_emscripten_get_now,emscripten_has_asyncify:_emscripten_has_asyncify,emscripten_num_logical_cores:_emscripten_num_logical_cores,emscripten_resize_heap:_emscripten_resize_heap,emwgpuAdapterRequestDevice:_emwgpuAdapterRequestDevice,emwgpuBufferDestroy:_emwgpuBufferDestroy,emwgpuBufferGetConstMappedRange:_emwgpuBufferGetConstMappedRange,emwgpuBufferMapAsync:_emwgpuBufferMapAsync,emwgpuBufferUnmap:_emwgpuBufferUnmap,emwgpuDelete:_emwgpuDelete,emwgpuDeviceCreateBuffer:_emwgpuDeviceCreateBuffer,emwgpuDeviceCreateShaderModule:_emwgpuDeviceCreateShaderModule,emwgpuDeviceDestroy:_emwgpuDeviceDestroy,emwgpuInstanceRequestAdapter:_emwgpuInstanceRequestAdapter,emwgpuQueueOnSubmittedWorkDone:_emwgpuQueueOnSubmittedWorkDone,emwgpuWaitAny:_emwgpuWaitAny,environ_get:_environ_get,environ_sizes_get:_environ_sizes_get,exit:_exit,fd_close:_fd_close,fd_read:_fd_read,fd_seek:_fd_seek,fd_write:_fd_write,memory:wasmMemory,random_get:_random_get,wgpuAdapterGetInfo:_wgpuAdapterGetInfo,wgpuAdapterGetLimits:_wgpuAdapterGetLimits,wgpuAdapterHasFeature:_wgpuAdapterHasFeature,wgpuBufferGetSize:_wgpuBufferGetSize,wgpuCommandEncoderBeginComputePass:_wgpuCommandEncoderBeginComputePass,wgpuCommandEncoderCopyBufferToBuffer:_wgpuCommandEncoderCopyBufferToBuffer,wgpuCommandEncoderFinish:_wgpuCommandEncoderFinish,wgpuComputePassEncoderDispatchWorkgroups:_wgpuComputePassEncoderDispatchWorkgroups,wgpuComputePassEncoderEnd:_wgpuComputePassEncoderEnd,wgpuComputePassEncoderSetBindGroup:_wgpuComputePassEncoderSetBindGroup,wgpuComputePassEncoderSetPipeline:_wgpuComputePassEncoderSetPipeline,wgpuComputePipelineGetBindGroupLayout:_wgpuComputePipelineGetBindGroupLayout,wgpuDeviceCreateBindGroup:_wgpuDeviceCreateBindGroup,wgpuDeviceCreateCommandEncoder:_wgpuDeviceCreateCommandEncoder,wgpuDeviceCreateComputePipeline:_wgpuDeviceCreateComputePipeline,wgpuInstanceHasWGSLLanguageFeature:_wgpuInstanceHasWGSLLanguageFeature,wgpuQueueSubmit:_wgpuQueueSubmit,wgpuQueueWriteBuffer:_wgpuQueueWriteBuffer}}function applySignatureConversions(wasmExports){wasmExports=Object.assign({},wasmExports);var makeWrapper_pp=f=>a0=>Number(f(BigInt(a0)));var makeWrapper__p=f=>a0=>f(BigInt(a0));var makeWrapper___PP=f=>(a0,a1,a2)=>f(a0,BigInt(a1?a1:0),BigInt(a2?a2:0));var makeWrapper_p=f=>()=>Number(f());var makeWrapper_ppp=f=>(a0,a1)=>Number(f(BigInt(a0),BigInt(a1)));var makeWrapper__p_____=f=>(a0,a1,a2,a3,a4,a5)=>f(BigInt(a0),a1,a2,a3,a4,a5);var makeWrapper___p_p_=f=>(a0,a1,a2,a3,a4)=>f(a0,BigInt(a1),a2,BigInt(a3),a4);var makeWrapper__pp=f=>(a0,a1)=>f(BigInt(a0),BigInt(a1));wasmExports["malloc"]=makeWrapper_pp(wasmExports["malloc"]);wasmExports["free"]=makeWrapper__p(wasmExports["free"]);wasmExports["main"]=makeWrapper___PP(wasmExports["main"]);wasmExports["pthread_self"]=makeWrapper_p(wasmExports["pthread_self"]);wasmExports["emscripten_builtin_memalign"]=makeWrapper_ppp(wasmExports["emscripten_builtin_memalign"]);wasmExports["_emscripten_thread_init"]=makeWrapper__p_____(wasmExports["_emscripten_thread_init"]);wasmExports["_emscripten_run_js_on_main_thread"]=makeWrapper___p_p_(wasmExports["_emscripten_run_js_on_main_thread"]);wasmExports["_emscripten_thread_free_data"]=makeWrapper__p(wasmExports["_emscripten_thread_free_data"]);wasmExports["_emscripten_thread_exit"]=makeWrapper__p(wasmExports["_emscripten_thread_exit"]);wasmExports["memalign"]=makeWrapper_ppp(wasmExports["memalign"]);wasmExports["emscripten_stack_set_limits"]=makeWrapper__pp(wasmExports["emscripten_stack_set_limits"]);wasmExports["_emscripten_stack_restore"]=makeWrapper__p(wasmExports["_emscripten_stack_restore"]);wasmExports["_emscripten_stack_alloc"]=makeWrapper_pp(wasmExports["_emscripten_stack_alloc"]);wasmExports["emscripten_stack_get_current"]=makeWrapper_p(wasmExports["emscripten_stack_get_current"]);return wasmExports}async function callMain(){var entryFunction=_main;var argc=0;var argv=0;try{var ret=entryFunction(argc,BigInt(argv));ret=await ret;exitJS(ret,true);return ret}catch(e){return handleException(e)}}function run(){if(runDependencies>0){dependenciesFulfilled=run;return}if(ENVIRONMENT_IS_PTHREAD){initRuntime();return}preRun();if(runDependencies>0){dependenciesFulfilled=run;return}async function doRun(){Module["calledRun"]=true;if(ABORT)return;initRuntime();preMain();Module["onRuntimeInitialized"]?.();var noInitialRun=Module["noInitialRun"]||false;if(!noInitialRun)await callMain();postRun()}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(()=>{setTimeout(()=>Module["setStatus"](""),1);doRun()},1)}else{doRun()}}var wasmExports;if(!ENVIRONMENT_IS_PTHREAD){createWasm();run()}\n';

// src/worker.ts
var FILE_READ_REQ_EVENT = "fs.read_req";
var JSPI_STUB = `
if (!WebAssembly.Suspending) {
  // JSPI not available - stubs that keep the import/export tables valid.
  // Suspending wraps imports: identity is fine since async imports won't be called.
  WebAssembly.Suspending = function (fn) {
    // console.log(fn.toString());
    return fn;
  };
  // promising wraps exports: must return a Promise so ccall's ret.then() works.
  WebAssembly.promising = function (fn) {
    return function (...args) {
      try {
        return Promise.resolve(fn(...args));
      } catch (e) {
        return Promise.reject(e);
      }
    };
  };
}
`;
var ProxyToWorker = class {
  // filename -> Blob for async reads
  constructor(resources, nbThread, suppressNativeLog, logger) {
    __publicField(this, "resources");
    __publicField(this, "logger");
    __publicField(this, "suppressNativeLog");
    __publicField(this, "taskQueue", []);
    __publicField(this, "taskId", 1);
    __publicField(this, "resultQueue", []);
    __publicField(this, "busy", false);
    // is the work loop is running?
    __publicField(this, "worker");
    __publicField(this, "multiThread");
    __publicField(this, "nbThread");
    __publicField(this, "useAsyncFile");
    __publicField(this, "fileBlobs", /* @__PURE__ */ new Map());
    this.resources = resources;
    this.nbThread = nbThread;
    this.multiThread = nbThread > 0;
    this.logger = logger;
    this.suppressNativeLog = suppressNativeLog;
    this.useAsyncFile = canUseAsyncFileRead(resources.compat);
  }
  getModuleCode() {
    return __async(this, null, function* () {
      if (!this.resources.jsPath) {
        if (this.resources.compat) {
          throw new Error(
            "compat mode is enabled but no jsPath was provided. Pass a worker JS via setCompat() or install @wllama/wllama-compat."
          );
        }
        return WLLAMA_EMSCRIPTEN_CODE;
      } else if (this.resources.jsPath.code) {
        return this.resources.jsPath.code;
      } else if (isString(this.resources.jsPath)) {
        const response = yield fetch(this.resources.jsPath);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch worker code from ${this.resources.jsPath}`
          );
        }
        return yield response.text();
      } else {
        throw new Error("No JS code provided for worker");
      }
    });
  }
  moduleInit(ggufFiles) {
    return __async(this, null, function* () {
      let moduleCode = JSPI_STUB + (yield this.getModuleCode());
      let mainModuleCode = moduleCode.replace("var Module", "var ___Module");
      const runOptions = {
        pathConfig: {
          "wllama.wasm": this.resources.wasmPath
        },
        nbThread: this.nbThread,
        compat: this.resources.compat
      };
      const completeCode = [
        `const RUN_OPTIONS = ${JSON.stringify(runOptions)};`,
        `function wModuleInit() { ${mainModuleCode}; return Module; }`,
        LLAMA_CPP_WORKER_CODE
      ].join(";\n\n");
      this.worker = createWorker(completeCode);
      this.worker.onmessage = this.onRecvMsg.bind(this);
      this.worker.onerror = this.logger.error;
      const res = yield this.pushTask({
        verb: "module.init",
        args: [
          new Blob([moduleCode], { type: "text/javascript" }),
          this.useAsyncFile
        ],
        callbackId: this.taskId++
      });
      const nativeFiles = [];
      for (const file of ggufFiles) {
        const needAllocBuffer = !this.useAsyncFile;
        const id = yield this.fileAlloc(
          file.name,
          file.blob.size,
          needAllocBuffer
        );
        nativeFiles.push(__spreadValues({ id }, file));
        if (this.useAsyncFile) {
          this.fileBlobs.set(file.name, file.blob);
        }
      }
      if (!this.useAsyncFile) {
        yield Promise.all(
          nativeFiles.map((file) => {
            return this.fileWrite(file.id, file.blob);
          })
        );
      }
      return res;
    });
  }
  wllamaStart() {
    return __async(this, null, function* () {
      const result = yield this.pushTask({
        verb: "wllama.start",
        args: [],
        callbackId: this.taskId++
      });
      const parsedResult = this.parseResult(result);
      return parsedResult;
    });
  }
  wllamaAction(name, body) {
    return __async(this, null, function* () {
      const encodedMsg = glueSerialize(body);
      const result = yield this.pushTask({
        verb: "wllama.action",
        args: [name, encodedMsg],
        callbackId: this.taskId++
      });
      const parsedResult = glueDeserialize(result);
      return parsedResult;
    });
  }
  wllamaExit() {
    return __async(this, null, function* () {
      if (this.worker) {
        this.worker.terminate();
      }
    });
  }
  wllamaDebug() {
    return __async(this, null, function* () {
      const result = yield this.pushTask({
        verb: "wllama.debug",
        args: [],
        callbackId: this.taskId++
      });
      return JSON.parse(result);
    });
  }
  ///////////////////////////////////////
  /**
   * Allocate a new file in heapfs
   * @returns fileId, to be used by fileWrite()
   */
  fileAlloc(fileName, size, allocBuffer) {
    return __async(this, null, function* () {
      const result = yield this.pushTask({
        verb: "fs.alloc",
        args: [fileName, size, allocBuffer],
        callbackId: this.taskId++
      });
      return result.fileId;
    });
  }
  /**
   * Write a Blob to heapfs
   */
  fileWrite(fileId, blob) {
    return __async(this, null, function* () {
      const reader = blob.stream().getReader();
      let offset = 0;
      while (true) {
        const { done, value } = yield reader.read();
        if (done) break;
        const size = value.byteLength;
        yield this.pushTask(
          {
            verb: "fs.write",
            args: [fileId, value, offset],
            callbackId: this.taskId++
          },
          // @ts-ignore Type 'ArrayBufferLike' is not assignable to type 'ArrayBuffer'
          [value.buffer]
        );
        offset += size;
      }
    });
  }
  fileReadResponse(name, offset, size) {
    return __async(this, null, function* () {
      var _a;
      try {
        const blob = this.fileBlobs.get(name);
        if (!blob) {
          throw new Error(`blob not found for name="${name}"`);
        }
        const chunk = blob.slice(offset, offset + size);
        const buffer = yield chunk.arrayBuffer();
        this.worker.postMessage(
          { verb: "fs.read_res", args: [buffer] },
          { transfer: [buffer] }
        );
      } catch (err) {
        this.logger.error("fileReadResponse failed, terminating worker:", err);
        (_a = this.worker) == null ? void 0 : _a.terminate();
        this.worker = void 0;
        this.abort(`File read failed: ${err}`, err.stack || "");
      }
    });
  }
  /**
   * Parse JSON result returned by cpp code.
   * Throw new Error if "__exception" is present in the response
   *
   * TODO: get rid of this function once everything is migrated to Glue
   */
  parseResult(result) {
    const parsedResult = JSON.parse(result);
    if (parsedResult && parsedResult["error"]) {
      throw new WllamaRuntimeError("Unknown error, please see console.log", "");
    }
    return parsedResult;
  }
  /**
   * Push a new task to taskQueue
   */
  pushTask(param, buffers) {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ resolve, reject, param, buffers });
      this.runTaskLoop();
    });
  }
  /**
   * Main loop for processing tasks
   */
  runTaskLoop() {
    return __async(this, null, function* () {
      var _a;
      if (this.busy) {
        return;
      }
      this.busy = true;
      while (true) {
        const task = this.taskQueue.shift();
        if (!task) break;
        this.resultQueue.push(task);
        this.worker.postMessage(
          task.param,
          isSafariMobile() ? void 0 : {
            transfer: (_a = task.buffers) != null ? _a : []
          }
        );
      }
      this.busy = false;
    });
  }
  /**
   * Handle messages from worker
   */
  onRecvMsg(e) {
    if (!e.data) return;
    const { verb, args } = e.data;
    const isCompatBuild = this.resources.compat;
    if (verb && verb.startsWith("console.")) {
      if (this.suppressNativeLog) {
        return;
      }
      if (verb.endsWith("debug")) this.logger.debug(...args);
      if (verb.endsWith("log")) this.logger.log(...args);
      if (verb.endsWith("warn")) this.logger.warn(...args);
      if (verb.endsWith("error")) this.logger.error(...args);
      return;
    } else if (verb === "signal.abort") {
      const [signalType, message, rawStack, originalErr] = args;
      if (originalErr) {
        this.logger.error(originalErr);
      }
      (() => __async(this, null, function* () {
        let stack = "";
        let newMsg = message.replace(
          "Build with -sASSERTIONS for more info.",
          ""
        );
        if (signalType === "abort") {
          newMsg = `(ABORT) ${newMsg}`;
          stack = rawStack.replace(/\|/g, "\n");
        } else if (signalType === "exception") {
          stack = rawStack;
        }
        const decoded = yield Debug.decodeStackTrace(stack, isCompatBuild);
        this.logger.error(`Stack trace (${signalType}):
` + decoded);
        this.abort(newMsg, decoded);
      }))();
      return;
    }
    if (verb === FILE_READ_REQ_EVENT) {
      const [name, offset, size] = args;
      this.fileReadResponse(name, offset, size).catch(() => {
      });
      return;
    }
    const { callbackId, result, err } = e.data;
    if (callbackId) {
      const idx = this.resultQueue.findIndex(
        (t) => t.param.callbackId === callbackId
      );
      if (idx !== -1) {
        const waitingTask = this.resultQueue.splice(idx, 1)[0];
        if (err) waitingTask.reject(err);
        else waitingTask.resolve(result);
      } else {
        this.logger.error(
          `Cannot find waiting task with callbackId = ${callbackId}`
        );
      }
    }
  }
  abort(text, stack) {
    const error = new WllamaRuntimeError(
      text.length == 0 ? "(unknown error)" : text,
      stack
    );
    while (this.resultQueue.length > 0) {
      const waitingTask = this.resultQueue.pop();
      if (!waitingTask) break;
      waitingTask.reject(error);
    }
    while (this.taskQueue.length > 0) {
      const pendingTask = this.taskQueue.pop();
      if (!pendingTask) break;
      pendingTask.reject(error);
    }
  }
};

// src/cache-manager.ts
var PREFIX_METADATA = "__metadata__";
var POLYFILL_ETAG = "polyfill_for_older_version";
var CacheManager = class {
  /**
   * Convert a given URL into file name in cache.
   *
   * Format of the file name: `${hashSHA1(fullURL)}_${fileName}`
   */
  getNameFromURL(url) {
    return __async(this, null, function* () {
      return yield urlToFileName(url, "");
    });
  }
  /**
   * @deprecated Use `download()` instead
   *
   * Write a new file to cache. This will overwrite existing file.
   *
   * @param name The file name returned by `getNameFromURL()` or `list()`
   */
  write(name, stream, metadata) {
    return __async(this, null, function* () {
      this.writeMetadata(name, metadata);
      return yield opfsWrite(name, stream);
    });
  }
  download(_0) {
    return __async(this, arguments, function* (url, options = {}) {
      const worker = createWorker(OPFS_UTILS_WORKER_CODE);
      let aborted = false;
      if (options.signal) {
        aborted = options.signal.aborted;
        const mSignal = options.signal;
        mSignal.addEventListener("abort", () => {
          aborted = true;
          worker.postMessage({ action: "download-abort" });
        });
        delete options.signal;
      }
      const metadataFileName = yield urlToFileName(url, PREFIX_METADATA);
      const filename = yield urlToFileName(url, "");
      return yield new Promise((resolve, reject) => {
        var _a;
        worker.postMessage({
          action: "download",
          url,
          filename,
          metadataFileName,
          metadataAdditional: (_a = options.metadataAdditional) != null ? _a : {},
          options: { headers: options.headers, aborted }
        });
        worker.onmessage = (e) => {
          var _a2;
          if (e.data.ok) {
            worker.terminate();
            resolve();
          } else if (e.data.err) {
            worker.terminate();
            reject(e.data.err);
          } else if (e.data.progress) {
            const progress = e.data.progress;
            (_a2 = options.progressCallback) == null ? void 0 : _a2.call(options, progress);
          } else {
            reject(new Error("Unknown message from worker"));
            console.error("Unknown message from worker", e.data);
          }
        };
      });
    });
  }
  /**
   * Open a file in cache for reading
   *
   * @param nameOrURL The file name returned by `getNameFromURL()` or `list()`, or the original URL of the remote file
   * @returns Blob, or null if file does not exist
   */
  open(nameOrURL) {
    return __async(this, null, function* () {
      return yield opfsOpen(nameOrURL);
    });
  }
  /**
   * Get the size of a file in stored cache
   *
   * NOTE: in case the download is stopped mid-way (i.e. user close browser tab), the file maybe corrupted, size maybe different from `metadata.originalSize`
   *
   * @param name The file name returned by `getNameFromURL()` or `list()`
   * @returns number of bytes, or -1 if file does not exist
   */
  getSize(name) {
    return __async(this, null, function* () {
      return yield opfsFileSize(name);
    });
  }
  /**
   * Get metadata of a cached file
   */
  getMetadata(name) {
    return __async(this, null, function* () {
      const stream = yield opfsOpen(name, PREFIX_METADATA);
      const cachedSize = yield this.getSize(name);
      if (!stream) {
        return cachedSize > 0 ? (
          // files created by older version of wllama doesn't have metadata, we will try to polyfill it
          {
            etag: POLYFILL_ETAG,
            originalSize: cachedSize,
            originalURL: ""
          }
        ) : (
          // if cached file not found, we don't have metadata at all
          null
        );
      }
      try {
        const meta = yield new Response(stream).json();
        return meta;
      } catch (e) {
        return null;
      }
    });
  }
  /**
   * List all files currently in cache
   */
  list() {
    return __async(this, null, function* () {
      const cacheDir = yield getCacheDir();
      const result = [];
      const metadataMap = {};
      try {
        for (var iter = __forAwait(cacheDir.entries()), more, temp, error; more = !(temp = yield iter.next()).done; more = false) {
          let [name, handler] = temp.value;
          if (handler.kind === "file" && name.startsWith(PREFIX_METADATA)) {
            const stream = (yield handler.getFile()).stream();
            const meta = yield new Response(stream).json().catch((_) => null);
            metadataMap[name.replace(PREFIX_METADATA, "")] = meta;
          }
        }
      } catch (temp) {
        error = [temp];
      } finally {
        try {
          more && (temp = iter.return) && (yield temp.call(iter));
        } finally {
          if (error)
            throw error[0];
        }
      }
      try {
        for (var iter2 = __forAwait(cacheDir.entries()), more2, temp2, error2; more2 = !(temp2 = yield iter2.next()).done; more2 = false) {
          let [name, handler] = temp2.value;
          if (handler.kind === "file" && !name.startsWith(PREFIX_METADATA)) {
            result.push({
              name,
              size: yield handler.getFile().then((f) => f.size),
              metadata: metadataMap[name] || {
                // try to polyfill for old versions
                originalSize: (yield handler.getFile()).size,
                originalURL: "",
                etag: ""
              }
            });
          }
        }
      } catch (temp2) {
        error2 = [temp2];
      } finally {
        try {
          more2 && (temp2 = iter2.return) && (yield temp2.call(iter2));
        } finally {
          if (error2)
            throw error2[0];
        }
      }
      return result;
    });
  }
  /**
   * Clear all files currently in cache
   */
  clear() {
    return __async(this, null, function* () {
      yield this.deleteMany(() => true);
    });
  }
  /**
   * Delete a single file in cache
   *
   * @param nameOrURL Can be either an URL or a name returned by `getNameFromURL()` or `list()`
   */
  delete(nameOrURL) {
    return __async(this, null, function* () {
      const name2 = yield this.getNameFromURL(nameOrURL);
      yield this.deleteMany(
        (entry) => entry.name === nameOrURL || entry.name === name2
      );
    });
  }
  /**
   * Delete multiple files in cache.
   *
   * @param predicate A predicate like `array.filter(item => boolean)`
   */
  deleteMany(predicate) {
    return __async(this, null, function* () {
      const cacheDir = yield getCacheDir();
      const list = yield this.list();
      for (const item of list) {
        if (predicate(item)) {
          cacheDir.removeEntry(item.name);
        }
      }
    });
  }
  /**
   * Write the metadata of the file to disk.
   *
   * This function is separated from `write()` for compatibility reason. In older version of wllama, there was no metadata for cached file, so when newer version of wllama loads a file created by older version, it will try to polyfill the metadata.
   */
  writeMetadata(name, metadata) {
    return __async(this, null, function* () {
      const blob = new Blob([JSON.stringify(metadata)], { type: "text/plain" });
      yield opfsWrite(name, blob.stream(), PREFIX_METADATA);
    });
  }
};
var cache_manager_default = CacheManager;
function opfsWrite(key, stream, prefix = "") {
  return __async(this, null, function* () {
    try {
      const fileName = yield urlToFileName(key, prefix);
      const writable = yield opfsWriteViaWorker(fileName);
      yield writable.truncate(0);
      const reader = stream.getReader();
      while (true) {
        const { done, value } = yield reader.read();
        if (done) break;
        yield writable.write(value);
      }
      yield writable.close();
    } catch (e) {
      console.error("opfsWrite", e);
    }
  });
}
function opfsOpen(originalURLOrName, prefix = "") {
  return __async(this, null, function* () {
    const getFileHandler = (fname) => __async(this, null, function* () {
      try {
        const cacheDir = yield getCacheDir();
        const fileHandler = yield cacheDir.getFileHandle(fname);
        return yield fileHandler.getFile();
      } catch (e) {
        return null;
      }
    });
    let handler = yield getFileHandler(originalURLOrName);
    if (handler) {
      return handler;
    }
    const fileName = yield urlToFileName(originalURLOrName, prefix);
    handler = yield getFileHandler(fileName);
    return handler;
  });
}
function opfsFileSize(originalURL, prefix = "") {
  return __async(this, null, function* () {
    try {
      const cacheDir = yield getCacheDir();
      const fileName = yield urlToFileName(originalURL, prefix);
      const fileHandler = yield cacheDir.getFileHandle(fileName);
      const file = yield fileHandler.getFile();
      return file.size;
    } catch (e) {
      return -1;
    }
  });
}
function urlToFileName(url, prefix) {
  return __async(this, null, function* () {
    const hashBuffer = yield crypto.subtle.digest(
      "SHA-1",
      new TextEncoder().encode(url)
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${prefix}${hashHex}_${url.split("/").pop()}`;
  });
}
function getCacheDir() {
  return __async(this, null, function* () {
    const opfsRoot = yield navigator.storage.getDirectory();
    const cacheDir = yield opfsRoot.getDirectoryHandle("cache", { create: true });
    return cacheDir;
  });
}
function opfsWriteViaWorker(fileName) {
  return __async(this, null, function* () {
    const worker = createWorker(OPFS_UTILS_WORKER_CODE);
    let pResolve;
    let pReject;
    worker.onmessage = (e) => {
      if (e.data.ok) pResolve(null);
      else if (e.data.err) pReject(e.data.err);
    };
    const workerExec = (data) => new Promise((resolve, reject) => {
      pResolve = resolve;
      pReject = reject;
      worker.postMessage(
        data,
        isSafariMobile() ? void 0 : {
          transfer: data.value ? [data.value.buffer] : []
        }
      );
    });
    yield workerExec({ open: fileName });
    return {
      truncate: () => __async(this, null, function* () {
      }),
      write: (value) => workerExec({ value }),
      close: () => __async(this, null, function* () {
        yield workerExec({ done: true });
        worker.terminate();
      })
    };
  });
}

// src/model-manager.ts
var DEFAULT_PARALLEL_DOWNLOADS = 3;
var ModelValidationStatus = /* @__PURE__ */ ((ModelValidationStatus2) => {
  ModelValidationStatus2["VALID"] = "valid";
  ModelValidationStatus2["INVALID"] = "invalid";
  ModelValidationStatus2["DELETED"] = "deleted";
  return ModelValidationStatus2;
})(ModelValidationStatus || {});
var Model = class {
  constructor(modelManager, url, mmprojUrl, savedFiles) {
    __publicField(this, "modelManager");
    /**
     * URL to the GGUF file (in case it contains multiple shards, the URL should point to the first shard)
     *
     * This URL will be used to identify the model in the cache. There can't be 2 models with the same URL.
     */
    __publicField(this, "url");
    /**
     * URL to mmproj file, if exists
     */
    __publicField(this, "mmprojUrl");
    /**
     * Size in bytes (total size of all shards).
     *
     * A value of -1 means the model is deleted from the cache. You must call `ModelManager.downloadModel` to re-download the model.
     */
    __publicField(this, "size");
    /**
     * List of all shards in the cache, sorted by original URL (ascending order)
     */
    __publicField(this, "files");
    this.modelManager = modelManager;
    this.url = url;
    this.mmprojUrl = mmprojUrl;
    if (savedFiles) {
      this.files = this.getAllFiles(savedFiles);
      this.size = sumArr(this.files.map((f) => f.metadata.originalSize));
    } else {
      this.files = [];
      this.size = 0;
    }
  }
  /**
   * Open and get a list of all shards as Blobs
   */
  open() {
    return __async(this, null, function* () {
      if (this.size === -1) {
        throw new WllamaError(
          `Model is deleted from the cache; Call ModelManager.downloadModel to re-download the model`,
          "load_error"
        );
      }
      const blobs = [];
      for (const file of this.files) {
        const blob = yield this.modelManager.cacheManager.open(file.name);
        if (!blob) {
          throw new Error(
            `Failed to open file ${file.name}; Hint: the model may be invalid, please refresh it`
          );
        }
        blobs.push(blob);
      }
      return blobs;
    });
  }
  /**
   * Validate the model files.
   *
   * If the model is invalid, the model manager will not be able to use it. You must call `refresh` to re-download the model.
   *
   * Cases that model is invalid:
   * - The model is deleted from the cache
   * - The model files are missing (or the download is interrupted)
   */
  validate() {
    let nbShards = ModelManager.parseModelUrl(this.url).length;
    if (this.mmprojUrl) {
      nbShards += 1;
    }
    if (this.size === -1) {
      return "deleted" /* DELETED */;
    }
    if (this.size < 16 || this.files.length !== nbShards) {
      return "invalid" /* INVALID */;
    }
    for (const file of this.files) {
      if (!file.metadata || file.metadata.originalSize !== file.size) {
        return "invalid" /* INVALID */;
      }
    }
    return "valid" /* VALID */;
  }
  /**
   * In case the model is invalid, call this function to re-download the model
   */
  refresh() {
    return __async(this, arguments, function* (options = {}) {
      var _a;
      const urls = ModelManager.parseModelUrl(this.url);
      if (this.mmprojUrl) {
        urls.push(this.mmprojUrl);
      }
      const works = urls.map((url, index) => ({
        url,
        index
      }));
      this.modelManager.logger.debug("Downloading model files:", urls);
      const nParallel = (_a = this.modelManager.params.parallelDownloads) != null ? _a : DEFAULT_PARALLEL_DOWNLOADS;
      const totalSize = yield this.getTotalDownloadSize(urls);
      const loadedSize = [];
      const worker = () => __async(this, null, function* () {
        while (works.length > 0) {
          const w = works.shift();
          if (!w) break;
          yield this.modelManager.cacheManager.download(w.url, __spreadProps(__spreadValues({}, options), {
            metadataAdditional: {
              originalURL: w.url,
              mmprojURL: this.mmprojUrl
            },
            progressCallback: ({ loaded }) => {
              var _a2;
              loadedSize[w.index] = loaded;
              (_a2 = options.progressCallback) == null ? void 0 : _a2.call(options, {
                loaded: sumArr(loadedSize),
                total: totalSize
              });
            }
          }));
        }
      });
      const promises = [];
      for (let i = 0; i < nParallel; i++) {
        promises.push(worker());
        loadedSize.push(0);
      }
      yield Promise.all(promises);
      this.files = this.getAllFiles(yield this.modelManager.cacheManager.list());
      this.size = this.files.reduce((acc, f) => acc + f.metadata.originalSize, 0);
    });
  }
  /**
   * Remove the model from the cache
   */
  remove() {
    return __async(this, null, function* () {
      this.files = this.getAllFiles(yield this.modelManager.cacheManager.list());
      yield this.modelManager.cacheManager.deleteMany(
        (f) => !!this.files.find((file) => file.name === f.name)
      );
      this.size = -1;
    });
  }
  getAllFiles(savedFiles) {
    const allUrls = new Set(ModelManager.parseModelUrl(this.url));
    if (this.mmprojUrl) {
      allUrls.add(this.mmprojUrl);
    }
    const allFiles = [];
    for (const url of allUrls) {
      const file = savedFiles.find((f) => f.metadata.originalURL === url);
      if (!file) {
        throw new Error(`Model file not found: ${url}`);
      }
      allFiles.push(file);
    }
    allFiles.sort(
      (a, b) => a.metadata.originalURL.localeCompare(b.metadata.originalURL)
    );
    return allFiles;
  }
  getTotalDownloadSize(urls) {
    return __async(this, null, function* () {
      const responses = yield Promise.all(
        urls.map((url) => fetch(url, { method: "HEAD" }))
      );
      const sizes = responses.map(
        (res) => Number(res.headers.get("content-length") || "0")
      );
      return sumArr(sizes);
    });
  }
};
var ModelManager = class _ModelManager {
  constructor(params = {}) {
    // The CacheManager singleton, can be accessed by user
    __publicField(this, "cacheManager");
    __publicField(this, "params");
    __publicField(this, "logger");
    this.cacheManager = params.cacheManager || new cache_manager_default();
    this.params = params;
    this.logger = params.logger || console;
  }
  /**
   * Parses a model URL and returns an array of URLs based on the following patterns:
   * - If the input URL is an array, it returns the array itself.
   * - If the input URL is a string in the `gguf-split` format, it returns an array containing the URL of each shard in ascending order.
   * - Otherwise, it returns an array containing the input URL as a single element array.
   * @param modelUrl URL or list of URLs
   */
  static parseModelUrl(modelUrl) {
    var _a;
    if (Array.isArray(modelUrl)) {
      return modelUrl;
    }
    const urlPartsRegex = /-(\d{5})-of-(\d{5})\.gguf(?:\?.*)?$/;
    const queryMatch = modelUrl.match(/\.gguf(\?.*)?$/);
    const queryParams = (_a = queryMatch == null ? void 0 : queryMatch[1]) != null ? _a : "";
    const matches = modelUrl.match(urlPartsRegex);
    if (!matches) {
      return [modelUrl];
    }
    const baseURL = modelUrl.replace(urlPartsRegex, "");
    const total = matches[2];
    const paddedShardIds = Array.from(
      { length: Number(total) },
      (_, index) => (index + 1).toString().padStart(5, "0")
    );
    return paddedShardIds.map(
      (current) => `${baseURL}-${current}-of-${total}.gguf${queryParams}`
    );
  }
  /**
   * Get all models in the cache
   */
  getModels() {
    return __async(this, arguments, function* (opts = {}) {
      const cachedFiles = yield this.cacheManager.list();
      let models = [];
      for (const file of cachedFiles) {
        const shards = _ModelManager.parseModelUrl(file.metadata.originalURL);
        const mmprojUrl = file.metadata.mmprojURL;
        const isFirstShard = shards.length === 1 || shards[0] === file.metadata.originalURL;
        if (isFirstShard) {
          models.push(
            new Model(this, file.metadata.originalURL, mmprojUrl, cachedFiles)
          );
        }
      }
      if (!opts.includeInvalid) {
        models = models.filter(
          (m) => m.validate() === "valid" /* VALID */
        );
      }
      return models;
    });
  }
  /**
   * Download a model from the given URL.
   *
   * The URL must end with `.gguf`
   */
  downloadModel(_0) {
    return __async(this, arguments, function* (sourceOrURL, options = {}) {
      const source = isString(sourceOrURL) ? { url: sourceOrURL } : sourceOrURL;
      if (!isValidGgufFile(source.url)) {
        throw new WllamaError(
          `Invalid model URL: ${source.url}; URL must ends with ".gguf"`,
          "download_error"
        );
      }
      const model = new Model(this, source.url, source.mmprojUrl);
      const validity = model.validate();
      if (validity !== "valid" /* VALID */) {
        yield model.refresh(options);
      }
      return model;
    });
  }
  /**
   * Get a model from the cache or download it if it's not available.
   */
  getModelOrDownload(_0) {
    return __async(this, arguments, function* (source, options = {}) {
      var _a;
      const models = yield this.getModels();
      const model = models.find((m) => m.url === source.url);
      if (model) {
        (_a = options.progressCallback) == null ? void 0 : _a.call(options, { loaded: model.size, total: model.size });
        return model;
      }
      return this.downloadModel(source, options);
    });
  }
  /**
   * Remove all models from the cache
   */
  clear() {
    return __async(this, null, function* () {
      yield this.cacheManager.clear();
    });
  }
};

// src/types/types.ts
var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2[LogLevel2["DEBUG"] = 1] = "DEBUG";
  LogLevel2[LogLevel2["INFO"] = 2] = "INFO";
  LogLevel2[LogLevel2["WARN"] = 3] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 4] = "ERROR";
  return LogLevel2;
})(LogLevel || {});

// src/huggingface.ts
var HF_BASE = "https://huggingface.co";
var DEFAULT_QUANTS = ["Q4_K_M", "Q8_0"];
function fetchRepoFiles(repo, token) {
  return __async(this, null, function* () {
    var _a;
    const url = `${HF_BASE}/api/models/${repo}/tree/main?recursive=true`;
    const headers = { Accept: "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const res = yield fetch(url, { headers });
    if (!res.ok) {
      let msg = res.statusText;
      try {
        msg = (_a = (yield res.json()).error) != null ? _a : msg;
      } catch (e) {
      }
      throw new Error(`HF API error (${res.status}): ${msg}`);
    }
    return res.json();
  });
}
function firstShardPath(files, path) {
  const m = path.match(/^(.+)-(\d{5})-of-(\d{5})\.gguf$/i);
  if (!m) return path;
  const first = `${m[1]}-00001-of-${m[3]}.gguf`;
  return files.some((f) => f.path === first) ? first : path;
}
function selectFile(files, quant, mmprojOnly) {
  const candidates = files.filter((f) => {
    if (f.type !== "file" || !f.path.toLowerCase().endsWith(".gguf"))
      return false;
    const ismmproj = f.path.toLowerCase().includes("mmproj");
    return mmprojOnly ? ismmproj : !ismmproj;
  });
  if (candidates.length === 0) return null;
  if (quant) {
    const upper = quant.toUpperCase();
    const match = candidates.find((f) => f.path.toUpperCase().includes(upper));
    if (match) return firstShardPath(candidates, match.path);
    return null;
  }
  for (const q of DEFAULT_QUANTS) {
    const match = candidates.find((f) => f.path.toUpperCase().includes(q));
    if (match) return firstShardPath(candidates, match.path);
  }
  return firstShardPath(candidates, candidates[0].path);
}
function getHFModelSource(config) {
  return __async(this, null, function* () {
    const { repo, file, quant, mmprojFile, mmprojQuant, hfToken } = config;
    const files = yield fetchRepoFiles(repo, hfToken);
    const modelPath = file != null ? file : selectFile(files, quant, false);
    if (!modelPath) {
      throw new Error(`No GGUF file found in repo "${repo}"`);
    }
    const source = {
      url: `${HF_BASE}/${repo}/resolve/main/${modelPath}`
    };
    if (mmprojFile || mmprojQuant !== void 0) {
      const mmpath = mmprojFile != null ? mmprojFile : selectFile(files, mmprojQuant, true);
      if (mmpath) {
        source.mmprojUrl = `${HF_BASE}/${repo}/resolve/main/${mmpath}`;
      }
    }
    if (hfToken) {
      const params = new URLSearchParams({ token: hfToken });
      source.url += `?${params}`;
      if (source.mmprojUrl) {
        source.mmprojUrl += `?${params}`;
      }
    }
    return source;
  });
}

// src/wasm-from-cdn.ts
var WasmCompatFromCDN = {
  worker: "https://cdn.jsdelivr.net/npm/@wllama/wllama-compat@3.4.0/wasm/wllama.js",
  wasm: "https://cdn.jsdelivr.net/npm/@wllama/wllama-compat@3.4.0/wasm/wllama.wasm"
};

// src/wllama.ts
var LoggerWithoutDebug = __spreadProps(__spreadValues({}, console), {
  debug: () => {
  }
});
var WllamaError = class extends Error {
  constructor(message, type = "unknown_error") {
    super(message);
    __publicField(this, "type");
    this.type = type;
  }
};
var WllamaAbortError = class extends Error {
  constructor() {
    super("Operation aborted");
    __publicField(this, "name", "AbortError");
  }
};
var WllamaRuntimeError = class extends Error {
  constructor(message, stack) {
    super(message);
    __publicField(this, "name", "RuntimeError");
    __publicField(this, "stack");
    this.stack = stack;
  }
};
var Wllama = class {
  constructor(pathConfig, wllamaConfig = {}) {
    // The CacheManager and ModelManager are singleton, can be accessed by user
    __publicField(this, "cacheManager");
    __publicField(this, "modelManager");
    __publicField(this, "compat", null);
    __publicField(this, "proxy", null);
    __publicField(this, "config");
    __publicField(this, "pathConfig");
    __publicField(this, "useMultiThread", false);
    __publicField(this, "nbThreads", 1);
    __publicField(this, "useEmbeddings", false);
    __publicField(this, "useRerank", false);
    // available when loaded
    __publicField(this, "loadedContextInfo", null);
    __publicField(this, "seed");
    __publicField(this, "bosToken", -1);
    __publicField(this, "eosToken", -1);
    __publicField(this, "eotToken", -1);
    __publicField(this, "eogTokens", /* @__PURE__ */ new Set());
    __publicField(this, "addBosToken", false);
    __publicField(this, "addEosToken", false);
    __publicField(this, "mediaMarker");
    __publicField(this, "chatTemplate");
    __publicField(this, "metadata");
    __publicField(this, "hasEncoder", false);
    __publicField(this, "decoderStartToken", -1);
    // note: we overlay instead of using llama-server default_template_kwargs, because we cannot transfer complex data structure via GLUE
    // overlay allow mixed data type or nested structure for kwargs
    __publicField(this, "chatTemplateKwargs", {});
    var _a, _b, _c;
    checkEnvironmentCompatible();
    if (!pathConfig) throw new WllamaError("AssetsPathConfig is required");
    this.pathConfig = pathConfig;
    this.config = wllamaConfig;
    this.cacheManager = (_a = wllamaConfig.cacheManager) != null ? _a : new cache_manager_default();
    this.modelManager = (_c = wllamaConfig.modelManager) != null ? _c : new ModelManager({
      cacheManager: this.cacheManager,
      logger: (_b = wllamaConfig.logger) != null ? _b : console,
      parallelDownloads: wllamaConfig.parallelDownloads,
      allowOffline: wllamaConfig.allowOffline
    });
    this.setCompat("default");
  }
  logger() {
    var _a;
    return (_a = this.config.logger) != null ? _a : console;
  }
  checkModelLoaded() {
    if (!this.isModelLoaded()) {
      throw new WllamaError(
        "loadModel() is not yet called",
        "model_not_loaded"
      );
    }
  }
  /**
   * Get the libllama version string, e.g. "b6327-4d74393".
   *
   * @returns version string embedded at build time.
   */
  static getLibllamaVersion() {
    return LIBLLAMA_VERSION;
  }
  /**
   * Set compatibility options for Wllama.
   * @param compat Set to null to disable compatibility, or 'default' to use the default compat resources from CDN.
   * @param mode 'safari' by default; If set to 'firefox_safari', the compat mode will **also** be enabled on Firefox, which will significantly degrade the performance but allow using WebGPU on Firefox.
   */
  setCompat(compat, mode = "safari") {
    if (mode === "safari") {
      if (isFirefox()) {
        this.compat = null;
        return;
      }
    }
    this.compat = compat === "default" ? WasmCompatFromCDN : compat;
  }
  /**
   * Check if the model is loaded via `loadModel()`
   */
  isModelLoaded() {
    return !!this.proxy && !!this.metadata;
  }
  /**
   * Get token ID associated to BOS (begin of sentence) token.
   *
   * NOTE: This can only being used after `loadModel` is called.
   *
   * @returns -1 if the model is not loaded.
   */
  getBOS() {
    return this.bosToken;
  }
  /**
   * Get token ID associated to EOS (end of sentence) token.
   *
   * NOTE: This can only being used after `loadModel` is called.
   *
   * @returns -1 if the model is not loaded.
   */
  getEOS() {
    return this.eosToken;
  }
  /**
   * Get token ID associated to EOT (end of turn) token.
   *
   * NOTE: This can only being used after `loadModel` is called.
   *
   * @returns -1 if the model is not loaded.
   */
  getEOT() {
    return this.eotToken;
  }
  /**
   * Check if a given token is end-of-generation token (e.g. EOS, EOT, etc.)
   *
   * @param token the token ID to be checked
   * @returns true if the token is EOS, EOT, or any other end-of-generation tokens
   */
  isTokenEOG(token) {
    return token === this.eosToken || token === this.eotToken || this.eogTokens.has(token);
  }
  /**
   * Get token ID associated to token used by decoder, to start generating output sequence(only usable for encoder-decoder architecture). In other words, encoder uses normal BOS and decoder uses this token.
   *
   * NOTE: This can only being used after `loadModel` is called.
   *
   * @returns -1 if the model is not loaded.
   */
  getDecoderStartToken() {
    return this.decoderStartToken;
  }
  /**
   * Get model hyper-parameters and metadata
   *
   * NOTE: This can only being used after `loadModel` is called.
   *
   * @returns ModelMetadata
   */
  getModelMetadata() {
    this.checkModelLoaded();
    return this.metadata;
  }
  /**
   * Check if we're currently using multi-thread build.
   *
   * NOTE: This can only being used after `loadModel` is called.
   *
   * @returns true if multi-thread is used.
   */
  isMultithread() {
    this.checkModelLoaded();
    return this.useMultiThread;
  }
  /**
   * Get number of threads used in the current context.
   *
   * NOTE: This can only being used after `loadModel` is called.
   *
   * @returns number of threads
   */
  getNumThreads() {
    this.checkModelLoaded();
    return this.useMultiThread ? this.nbThreads : 1;
  }
  /**
   * Check if the current model uses encoder-decoder architecture
   *
   * NOTE: This can only being used after `loadModel` is called.
   *
   * @returns true if multi-thread is used.
   */
  isEncoderDecoderArchitecture() {
    this.checkModelLoaded();
    return this.hasEncoder;
  }
  /**
   * Must we add BOS token to the tokenized sequence?
   *
   * NOTE: This can only being used after `loadModel` is called.
   *
   * @returns true if BOS token must be added to the sequence
   */
  mustAddBosToken() {
    this.checkModelLoaded();
    return this.addBosToken;
  }
  /**
   * Must we add EOS token to the tokenized sequence?
   *
   * NOTE: This can only being used after `loadModel` is called.
   *
   * @returns true if EOS token must be added to the sequence
   */
  mustAddEosToken() {
    this.checkModelLoaded();
    return this.addEosToken;
  }
  /**
   * Get the jinja chat template comes with the model. It only available if the original model (before converting to gguf) has the template in `tokenizer_config.json`
   *
   * NOTE: This can only being used after `loadModel` is called.
   *
   * @returns the jinja template. null if there is no template in gguf
   */
  getChatTemplate() {
    var _a;
    this.checkModelLoaded();
    return (_a = this.chatTemplate) != null ? _a : null;
  }
  /**
   * Check if WebGPU is supported by the current environment.
   * @returns true if WebGPU is supported
   */
  isSupportWebGPU() {
    return isSupportWebGPU();
  }
  /**
   * Load model from a given URL (or a list of URLs, in case the model is splitted into smaller files)
   * - If the model already been downloaded (via `downloadModel()`), then we will use the cached model
   * - Else, we download the model from internet
   * @param modelSourceOrURL
   * @param params
   */
  loadModelFromUrl(_0) {
    return __async(this, arguments, function* (modelSourceOrURL, params = {}) {
      var _a;
      const source = isString(modelSourceOrURL) ? { url: modelSourceOrURL } : modelSourceOrURL;
      const useCache = (_a = params.useCache) != null ? _a : true;
      const model = useCache ? yield this.modelManager.getModelOrDownload(source, params) : yield this.modelManager.downloadModel(source, params);
      const blobs = yield model.open();
      return yield this.loadModel(blobs, params);
    });
  }
  /**
   * Load model from a given Hugging Face model ID and file path.
   *
   * @param hfOptions
   * @param params
   */
  loadModelFromHF(_0) {
    return __async(this, arguments, function* (hfOptions, params = {}) {
      const source = yield getHFModelSource(hfOptions);
      return yield this.loadModelFromUrl(source, params);
    });
  }
  /**
   * Load model from a given list of Blob.
   *
   * You can pass multiple buffers into the function (in case the model contains multiple shards).
   *
   * @param ggufBlobsOrModel Can be either list of Blobs (in case you use local file), or a Model object (in case you use ModelManager)
   * @param params LoadModelParams
   */
  loadModel(_0) {
    return __async(this, arguments, function* (ggufBlobsOrModel, params = {}) {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      const blobs = ggufBlobsOrModel instanceof Model ? yield ggufBlobsOrModel.open() : [...ggufBlobsOrModel];
      if (blobs.some((b) => b.size === 0)) {
        throw new WllamaError(
          "Input model (or splits) must be non-empty Blob or File",
          "load_error"
        );
      }
      if (!this.pathConfig["default"]) {
        throw new WllamaError(
          '"default" is missing from pathConfig',
          "load_error"
        );
      }
      if (this.proxy) {
        throw new WllamaError("Module is already initialized", "load_error");
      }
      const supportMultiThread = yield isSupportMultiThread();
      const hwConccurency = Math.floor((navigator.hardwareConcurrency || 1) / 2);
      const nbThreads = (_a = params.n_threads) != null ? _a : hwConccurency;
      this.nbThreads = nbThreads;
      this.useMultiThread = supportMultiThread && nbThreads > 1;
      const workerResources = {
        wasmPath: absoluteUrl(this.pathConfig["default"]),
        compat: false
      };
      if (needCompat()) {
        if (!this.compat) {
          this.logger().warn(
            "Not using compat mode" + (isFirefox() ? " (expected on Firefox - WebGPU will be disabled)" : "")
          );
        } else {
          const isUsingDefault = this.compat.worker === WasmCompatFromCDN.worker && this.compat.wasm === WasmCompatFromCDN.wasm;
          if (isUsingDefault) {
            this.logger().warn(
              "Compatibility mode is activated, using resources from CDN. To use local resources, please refer to @wllama/wllama-compat package."
            );
            this.logger().warn(
              "IMPORTANT: Performance will be significantly degraded in compatibility mode."
            );
          }
          workerResources.wasmPath = absoluteUrl(this.compat.wasm);
          workerResources.jsPath = this.compat.worker;
          workerResources.compat = true;
        }
      }
      if (isFirefox()) {
        if (workerResources.compat) {
          this.logger().warn(
            'Using compat mode on Firefox, performance will be significantly degraded; Consider enabling "javascript.options.wasm_js_promise_integration" in "about:config".'
          );
        } else if (!isSupportJSPI()) {
          this.logger().warn(
            'WebGPU is disabled on Firefox due to missing JSPI support. Please consider enabling compat mode, or enabling "javascript.options.wasm_js_promise_integration" in "about:config".'
          );
        }
      }
      this.proxy = new ProxyToWorker(
        workerResources,
        this.useMultiThread ? nbThreads : 0,
        // 0 means disable pthread
        (_b = this.config.suppressNativeLog) != null ? _b : false,
        this.logger()
      );
      let logLevel = (_c = params.log_level) != null ? _c : 2 /* INFO */;
      if (this.config.suppressNativeLog) {
        logLevel = 9999;
      }
      const modelFiles = yield prepareBlobs(blobs);
      yield this.proxy.moduleInit(modelFiles.all);
      this.logger().debug("Calling wllamaStart...");
      const startResult = yield this.proxy.wllamaStart();
      if (!startResult.success) {
        throw new WllamaError(
          `Error while calling start function, result = ${startResult}`
        );
      }
      this.logger().debug("Loading model...");
      const loadResult = yield this.proxy.wllamaAction("load", {
        _name: "load_req",
        log_level: logLevel,
        // if async read is not supported, use mmap; refer to README-dev.md for more details
        use_mmap: !canUseAsyncFileRead(workerResources.compat),
        use_mlock: false,
        n_gpu_layers: (_d = params.n_gpu_layers) != null ? _d : 99999,
        n_ctx: (_e = params.n_ctx) != null ? _e : 1024,
        n_threads: this.useMultiThread ? nbThreads : 1,
        n_ctx_auto: false,
        // not supported for now
        mmproj_path: modelFiles.mmproj ? `/models/${MMPROJ_FILE_NAME}` : void 0,
        model_paths: modelFiles.llm.map((f) => `models/${f.name}`),
        embeddings: params.embeddings,
        offload_kqv: params.offload_kqv,
        n_batch: params.n_batch,
        pooling_type: params.pooling_type,
        rope_scaling_type: params.rope_scaling_type,
        rope_freq_base: params.rope_freq_base,
        rope_freq_scale: params.rope_freq_scale,
        yarn_ext_factor: params.yarn_ext_factor,
        yarn_attn_factor: params.yarn_attn_factor,
        yarn_beta_fast: params.yarn_beta_fast,
        yarn_beta_slow: params.yarn_beta_slow,
        yarn_orig_ctx: params.yarn_orig_ctx,
        cache_type_k: params.cache_type_k,
        cache_type_v: params.cache_type_v,
        n_parallel: 1,
        // only support single sequence for now
        kv_unified: false,
        // TODO: support kv unified cache
        flash_attn: params.flash_attn,
        swa_full: params.swa_full,
        chat_template: params.chat_template,
        jinja: params.jinja,
        reasoning: params.reasoning,
        image_min_tokens: params.image_min_tokens,
        image_max_tokens: params.image_max_tokens,
        warmup: params.warmup,
        no_kv_offload: params.no_kv_offload,
        mmproj_offload: params.mmproj_offload,
        cont_batching: params.cont_batching,
        n_keep: params.n_keep,
        ctx_shift: params.ctx_shift,
        cache_idle_slots: params.cache_idle_slots,
        n_cache_reuse: params.n_cache_reuse,
        lora_paths: (_f = params.lora_adapters) == null ? void 0 : _f.map((a) => a.path),
        lora_scales: (_g = params.lora_adapters) == null ? void 0 : _g.map((a) => {
          var _a2;
          return (_a2 = a.scale) != null ? _a2 : 1;
        }),
        lora_init_without_apply: params.lora_init_without_apply,
        spec_draft_model: params.spec_draft_model,
        spec_draft_ngl: params.spec_draft_ngl,
        spec_draft_n_max: params.spec_draft_n_max,
        spec_draft_n_min: params.spec_draft_n_min,
        spec_draft_p_min: params.spec_draft_p_min,
        spec_draft_threads: params.spec_draft_threads,
        spec_draft_threads_batch: params.spec_draft_threads_batch,
        kv_overrides_keys: params.kv_overrides ? Object.keys(params.kv_overrides) : void 0,
        kv_overrides_vals: params.kv_overrides ? Object.values(params.kv_overrides) : void 0,
        reasoning_budget_tokens: params.reasoning_budget_tokens,
        reasoning_budget_message: params.reasoning_budget_message,
        reasoning_format: params.reasoning_format,
        skip_chat_parsing: params.skip_chat_parsing,
        prefill_assistant: params.prefill_assistant
      });
      const loadedCtxInfo = __spreadProps(__spreadValues({}, loadResult), {
        metadata: {}
      });
      for (let i = 0; i < loadResult.metadata_key.length; i++) {
        loadedCtxInfo.metadata[loadResult.metadata_key[i]] = loadResult.metadata_val[i];
      }
      this.seed = params.seed;
      this.bosToken = loadedCtxInfo.token_bos;
      this.eosToken = loadedCtxInfo.token_eos;
      this.eotToken = loadedCtxInfo.token_eot;
      this.useEmbeddings = !!params.embeddings;
      this.useRerank = params.pooling_type == "rank";
      this.metadata = {
        hparams: {
          nVocab: loadedCtxInfo.n_vocab,
          nCtxTrain: loadedCtxInfo.n_ctx_train,
          nEmbd: loadedCtxInfo.n_embd,
          nLayer: loadedCtxInfo.n_layer
        },
        meta: loadedCtxInfo.metadata
      };
      this.hasEncoder = !!loadedCtxInfo.has_encoder;
      this.decoderStartToken = loadedCtxInfo.token_decoder_start;
      this.addBosToken = loadedCtxInfo.add_bos_token;
      this.addEosToken = loadedCtxInfo.add_eos_token;
      this.chatTemplate = loadedCtxInfo.metadata["tokenizer.chat_template"];
      this.loadedContextInfo = loadedCtxInfo;
      this.eogTokens = new Set(loadedCtxInfo.list_tokens_eog);
      this.mediaMarker = loadedCtxInfo.media_marker;
      this.chatTemplateKwargs = (_h = params.default_template_kwargs) != null ? _h : {};
      this.logger().debug({ loadedCtxInfo });
    });
  }
  getLoadedContextInfo() {
    this.checkModelLoaded();
    if (!this.loadedContextInfo) {
      throw new WllamaError("Loaded context info is not available");
    }
    return __spreadValues({}, this.loadedContextInfo);
  }
  //////////////////////////////////////////////
  // High level API
  /**
   * Calculate embedding vector for a given text.
   * By default, BOS and EOS tokens will be added automatically. You can use the "skipBOS" and "skipEOS" option to disable it.
   * @param options OAI-compatible embedding creation options
   * @returns OAI-compatible embedding response
   */
  createEmbedding(options) {
    return __async(this, null, function* () {
      this.checkModelLoaded();
      if (!this.useEmbeddings) {
        throw new WllamaError(
          "Embeddings is not enabled. Please set it via LoadModelParams.embeddings"
        );
      }
      const result = yield this.proxy.wllamaAction(
        "embedding",
        {
          _name: "embd_req",
          data_json: JSON.stringify(options),
          files: []
          // TODO: support file input
        }
      );
      if (!result.success) {
        throw new WllamaError(
          "Model failed to start inference",
          "inference_error"
        );
      }
      return yield this.getResponse(options, false);
    });
  }
  /**
   * Rerank a list of documents against a query.
   * Requires the model to be loaded with embeddings: true and pooling_type: 'rank'.
   * @param options Reranking options (query, documents, top_n)
   * @returns Reranking response with relevance scores sorted highest first
   */
  createRerank(options) {
    return __async(this, null, function* () {
      var _a, _b;
      this.checkModelLoaded();
      if (!this.useEmbeddings || !this.useRerank) {
        throw new WllamaError(
          "Rerank is not enabled. Please set it via LoadModelParams: embeddings = true and pooling_type = rank"
        );
      }
      const top_n = (_a = options.top_n) != null ? _a : options.documents.length;
      let totalTokens = 0;
      const rawResults = [];
      for (let i = 0; i < options.documents.length; i++) {
        const result = yield this.proxy.wllamaAction("rerank", {
          _name: "rrnk_req",
          data_json: JSON.stringify({
            query: options.query,
            document: options.documents[i]
          })
        });
        if (!result.success) {
          throw new WllamaError(
            "Model failed to start reranking",
            "inference_error"
          );
        }
        const { score, tokens_evaluated } = yield this.getRerankResult();
        totalTokens += tokens_evaluated;
        rawResults.push({ index: i, score });
      }
      rawResults.sort((a, b) => b.score - a.score);
      return {
        model: (_b = this.getModelMetadata().meta["general.name"]) != null ? _b : "",
        object: "list",
        usage: { prompt_tokens: totalTokens, total_tokens: totalTokens },
        results: rawResults.slice(0, top_n).map(({ index, score }) => ({
          index,
          relevance_score: score
        }))
      };
    });
  }
  createChatCompletion(options) {
    return __async(this, null, function* () {
      var _a;
      if (Object.keys(this.chatTemplateKwargs).length > 0) {
        options = __spreadProps(__spreadValues({}, options), {
          chat_template_kwargs: __spreadValues(__spreadValues({}, this.chatTemplateKwargs), (_a = options.chat_template_kwargs) != null ? _a : {})
        });
      }
      if (options.stream && options.onData) {
        yield this.createCompletionImpl(options);
      } else if (options.stream) {
        return yield this.createCompletionGenerator(options);
      } else {
        return yield this.createCompletionImpl(__spreadProps(__spreadValues({}, options), { stream: false }));
      }
    });
  }
  createCompletion(options) {
    return __async(this, null, function* () {
      if (options.stream && options.onData) {
        yield this.createCompletionImpl(options);
      } else if (options.stream) {
        return yield this.createCompletionGenerator(options);
      } else {
        return yield this.createCompletionImpl(__spreadProps(__spreadValues({}, options), { stream: false }));
      }
    });
  }
  /**
   * Private implementation of createCompletion
   */
  createCompletionImpl(options) {
    return __async(this, null, function* () {
      this.checkModelLoaded();
      const isStream = !!options.stream;
      const isChat = !!options.messages;
      const customOpt = {};
      if (this.seed !== void 0) {
        customOpt.seed = this.seed;
      }
      let files = [];
      if (isChat) {
        const tmp = this.prepareMultimodalInput(
          options
        );
        options = tmp.params;
        files = tmp.files;
      }
      const result = yield this.proxy.wllamaAction(
        "completion",
        {
          _name: "cmpl_req",
          is_chat: isChat,
          data_json: JSON.stringify(__spreadValues(__spreadValues({}, options), customOpt)),
          files: files.map((f) => new Uint8Array(f))
        }
      );
      if (!result.success) {
        throw new WllamaError(
          "Model failed to start inference",
          "inference_error"
        );
      }
      return yield this.getResponse(
        options,
        isStream
      );
    });
  }
  /**
   * Same with `createCompletion`, but returns an async iterator instead.
   * Only called when stream=true and no onData is provided.
   */
  createCompletionGenerator(options) {
    return new Promise((resolve) => {
      const createGenerator = cbToAsyncIter(
        (callback) => {
          this.createCompletionImpl(__spreadProps(__spreadValues({}, options), {
            onData: (chunk) => callback(chunk)
          })).then(() => callback(void 0, true)).catch((err) => callback(void 0, false, err));
        }
      );
      resolve(createGenerator());
    });
  }
  /**
   * Whether the currently loaded model supports a specific input modality (e.g. image or audio).
   * @param modality
   * @returns
   */
  supportInputModality(modality) {
    this.checkModelLoaded();
    if (modality === "image") {
      return !!this.loadedContextInfo.has_image_input;
    } else if (modality === "audio") {
      return !!this.loadedContextInfo.has_audio_input;
    } else {
      throw new WllamaError(
        "Unsupported modality: " + modality,
        "unknown_error"
      );
    }
  }
  /**
   * Unload the model and free all memory.
   *
   * Note: This function will NOT crash if model is not yet loaded
   */
  exit() {
    return __async(this, null, function* () {
      var _a;
      yield (_a = this.proxy) == null ? void 0 : _a.wllamaExit();
      this.proxy = null;
    });
  }
  //////////////////////////////////////////////
  // Low level API
  // TODO: add back
  /**
   * get debug info
   */
  _getDebugInfo() {
    return __async(this, null, function* () {
      this.checkModelLoaded();
      return yield this.proxy.wllamaDebug();
    });
  }
  //////////////////////////////////////////////
  // Utils
  jsonDecode(data_json) {
    try {
      return JSON.parse(data_json);
    } catch (e) {
      this.logger().error("Failed to parse JSON:", data_json);
      throw new WllamaError("Failed to parse model output", "inference_error");
    }
  }
  prepareMultimodalInput(params) {
    const msg = params.messages;
    const msgNew = [];
    const files = [];
    for (const m of msg) {
      if (Array.isArray(m.content)) {
        const newContent = [];
        for (const c of m.content) {
          if (c.type === "text") {
            newContent.push(c);
          } else {
            if (!this.mediaMarker) {
              throw new WllamaError(
                "Media marker is undefined",
                "inference_error"
              );
            }
            files.push(c.data);
            newContent.push({
              type: "text",
              text: this.mediaMarker
            });
          }
        }
        msgNew.push(__spreadProps(__spreadValues({}, m), {
          content: newContent
        }));
      } else {
        msgNew.push(m);
      }
    }
    return {
      params: __spreadProps(__spreadValues({}, params), {
        messages: msgNew
      }),
      files
    };
  }
  getRerankResult() {
    return __async(this, null, function* () {
      while (true) {
        const chunk = yield this.proxy.wllamaAction(
          "get_result",
          { _name: "gres_req" }
        );
        const jsonString = chunk.data_json;
        if (jsonString && jsonString.length > 0) {
          if (chunk.is_error) {
            const jsonData = this.jsonDecode(jsonString);
            throw new WllamaError(
              jsonData.message || "Unknown reranking error",
              "inference_error"
            );
          }
          return this.jsonDecode(jsonString);
        }
        if (!chunk.has_more) break;
      }
      throw new WllamaError("No reranking result received", "inference_error");
    });
  }
  getResponse(options, isStream) {
    return __async(this, null, function* () {
      var _a, _b;
      let finalResult = null;
      while (true) {
        if ((_a = options.abortSignal) == null ? void 0 : _a.aborted) {
          throw new WllamaAbortError();
        }
        const result_chunk = yield this.proxy.wllamaAction(
          "get_result",
          {
            _name: "gres_req"
          }
        );
        const jsonString = result_chunk.data_json;
        if (!jsonString || jsonString.length === 0) {
          if (!result_chunk.has_more) {
            break;
          } else {
            continue;
          }
        }
        if (jsonString == "null") {
          continue;
        }
        let jsonData = this.jsonDecode(jsonString);
        finalResult = jsonData;
        if (result_chunk.is_error) {
          this.logger().error("Model returned an error:", jsonData);
          throw new WllamaError(
            jsonData.message || "Unknown inference error",
            "inference_error"
          );
        }
        if (isStream) {
          if (!Array.isArray(jsonData)) {
            jsonData = [jsonData];
          }
          for (const chunk of jsonData) {
            (_b = options.onData) == null ? void 0 : _b.call(options, chunk);
            finalResult = chunk;
          }
        }
        if (!result_chunk.has_more) {
          break;
        }
      }
      return finalResult;
    });
  }
};
export {
  CacheManager,
  LogLevel,
  LoggerWithoutDebug,
  Model,
  ModelManager,
  ModelValidationStatus,
  POLYFILL_ETAG,
  Wllama,
  WllamaAbortError,
  WllamaError,
  WllamaRuntimeError,
  getHFModelSource,
  isValidGgufFile
};
