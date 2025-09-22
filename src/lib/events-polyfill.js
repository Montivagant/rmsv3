const DEFAULT_MAX_LISTENERS = 10;

function ensureStore(target) {
  if (!target._events || typeof target._events !== 'object') {
    target._events = Object.create(null);
  }
  if (typeof target._maxListeners !== 'number') {
    target._maxListeners = DEFAULT_MAX_LISTENERS;
  }
}

function EventEmitter() {
  if (!(this instanceof EventEmitter)) {
    return new EventEmitter();
  }
  ensureStore(this);
}

EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n === 'number' && n >= 0) {
    this._maxListeners = n;
  }
  return this;
};

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  ensureStore(this);
  return this._maxListeners;
};

EventEmitter.prototype.emit = function emit(type, ...args) {
  ensureStore(this);
  const handlers = this._events[type];
  if (!handlers) {
    return false;
  }

  const callList = Array.isArray(handlers) ? handlers.slice() : [handlers];
  for (const handler of callList) {
    handler.apply(this, args);
  }
  return true;
};

EventEmitter.prototype.addListener = function addListener(type, listener) {
  ensureStore(this);
  if (typeof listener !== 'function') {
    throw new TypeError('EventEmitter listener must be a function');
  }

  const existing = this._events[type];
  if (!existing) {
    this._events[type] = listener;
  } else if (Array.isArray(existing)) {
    existing.push(listener);
  } else {
    this._events[type] = [existing, listener];
  }

  const max = this.getMaxListeners();
  if (max && this.listenerCount(type) > max && !this._events.warned) {
    this._events.warned = true;
    console.warn(`Possible EventEmitter memory leak detected. ${this.listenerCount(type)} '${type}' listeners added.`);
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener = function prependListener(type, listener) {
  ensureStore(this);
  if (typeof listener !== 'function') {
    throw new TypeError('EventEmitter listener must be a function');
  }

  const existing = this._events[type];
  if (!existing) {
    this._events[type] = listener;
  } else if (Array.isArray(existing)) {
    existing.unshift(listener);
  } else {
    this._events[type] = [listener, existing];
  }

  return this;
};

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('EventEmitter listener must be a function');
  }

  const wrapped = (...args) => {
    this.removeListener(type, wrapped);
    listener.apply(this, args);
  };
  wrapped.listener = listener;
  return this.addListener(type, wrapped);
};

EventEmitter.prototype.prependOnceListener = function prependOnceListener(type, listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('EventEmitter listener must be a function');
  }

  const wrapped = (...args) => {
    this.removeListener(type, wrapped);
    listener.apply(this, args);
  };
  wrapped.listener = listener;
  return this.prependListener(type, wrapped);
};

EventEmitter.prototype.removeListener = function removeListener(type, listener) {
  ensureStore(this);
  const existing = this._events[type];
  if (!existing) {
    return this;
  }

  if (existing === listener || existing.listener === listener) {
    delete this._events[type];
  } else if (Array.isArray(existing)) {
    const idx = existing.findIndex((fn) => fn === listener || fn.listener === listener);
    if (idx !== -1) {
      existing.splice(idx, 1);
      if (existing.length === 1) {
        this._events[type] = existing[0];
      } else if (existing.length === 0) {
        delete this._events[type];
      }
    }
  }

  return this;
};

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
  ensureStore(this);
  if (typeof type === 'undefined') {
    this._events = Object.create(null);
  } else {
    delete this._events[type];
  }
  return this;
};

EventEmitter.prototype.listeners = function listeners(type) {
  ensureStore(this);
  const existing = this._events[type];
  if (!existing) {
    return [];
  }
  return Array.isArray(existing) ? existing.slice() : [existing];
};

EventEmitter.prototype.rawListeners = EventEmitter.prototype.listeners;

EventEmitter.prototype.listenerCount = function listenerCount(type) {
  return this.listeners(type).length;
};

EventEmitter.prototype.eventNames = function eventNames() {
  ensureStore(this);
  return Object.keys(this._events);
};

EventEmitter.defaultMaxListeners = DEFAULT_MAX_LISTENERS;

function bindStatic(name) {
  EventEmitter[name] = function (...args) {
    ensureStore(this);
    return EventEmitter.prototype[name].apply(this, args);
  };
}

[
  'addListener',
  'on',
  'once',
  'prependListener',
  'prependOnceListener',
  'removeListener',
  'off',
  'removeAllListeners',
  'emit',
  'listeners',
  'rawListeners',
  'listenerCount',
  'eventNames',
  'setMaxListeners',
  'getMaxListeners'
].forEach(bindStatic);

EventEmitter.listenerCount = function listenerCount(emitter, type) {
  return emitter.listenerCount(type);
};

export default EventEmitter;
export { EventEmitter };
