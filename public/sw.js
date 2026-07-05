(!(function () {
  try {
    var e =
        'undefined' != typeof window
          ? window
          : 'undefined' != typeof global
            ? global
            : 'undefined' != typeof globalThis
              ? globalThis
              : 'undefined' != typeof self
                ? self
                : {},
      t = new e.Error().stack;
    t &&
      ((e._sentryDebugIds = e._sentryDebugIds || {}),
      (e._sentryDebugIds[t] = '4192b9f1-7cff-4f85-a9ca-812a845d14ac'),
      (e._sentryDebugIdIdentifier = 'sentry-dbid-4192b9f1-7cff-4f85-a9ca-812a845d14ac'));
  } catch (e) {}
})(),
  (() => {
    'use strict';
    let e, t;
    var a = {};
    a.r = (e) => {
      ('undefined' != typeof Symbol &&
        Symbol.toStringTag &&
        Object.defineProperty(e, Symbol.toStringTag, { value: 'Module' }),
        Object.defineProperty(e, '__esModule', { value: !0 }));
    };
    var s = {};
    a.r(s);
    let n = {
        googleAnalytics: 'googleAnalytics',
        precache: 'precache-v2',
        prefix: 'serwist',
        runtime: 'runtime',
        suffix: 'undefined' != typeof registration ? registration.scope : '',
      },
      r = {
        getRuntimeName: (e) => {
          let t;
          return (
            e ||
            ((t = n.runtime), [n.prefix, t, n.suffix].filter((e) => e && e.length > 0).join('-'))
          );
        },
      };
    var i = class extends Error {
      details;
      constructor(e, t) {
        (super(
          ((e, ...t) => {
            let a = e;
            return (t.length > 0 && (a += ` :: ${JSON.stringify(t)}`), a);
          })(e, t)
        ),
          (this.name = e),
          (this.details = t));
      }
    };
    function o(e) {
      return new Promise((t) => setTimeout(t, e));
    }
    let c = new Set();
    function l(e, t) {
      let a = new URL(e);
      for (let e of t) a.searchParams.delete(e);
      return a.href;
    }
    async function h(e, t, a, s) {
      let n = l(t.url, a);
      if (t.url === n) return e.match(t, s);
      let r = { ...s, ignoreSearch: !0 };
      for (let i of await e.keys(t, r)) if (n === l(i.url, a)) return e.match(i, s);
    }
    var u = class {
      promise;
      resolve;
      reject;
      constructor() {
        this.promise = new Promise((e, t) => {
          ((this.resolve = e), (this.reject = t));
        });
      }
    };
    let d = async () => {
        for (let e of c) await e();
      },
      m = (e, t) => t.some((t) => e instanceof t),
      f = new WeakMap(),
      p = new WeakMap(),
      g = new WeakMap(),
      w = {
        get(e, t, a) {
          if (e instanceof IDBTransaction) {
            if ('done' === t) return f.get(e);
            if ('store' === t)
              return a.objectStoreNames[1] ? void 0 : a.objectStore(a.objectStoreNames[0]);
          }
          return _(e[t]);
        },
        set: (e, t, a) => ((e[t] = a), !0),
        has: (e, t) => (e instanceof IDBTransaction && ('done' === t || 'store' === t)) || t in e,
      };
    function _(a) {
      if (a instanceof IDBRequest) {
        let e = new Promise((e, t) => {
          let s = () => {
              (a.removeEventListener('success', n), a.removeEventListener('error', r));
            },
            n = () => {
              (e(_(a.result)), s());
            },
            r = () => {
              (t(a.error), s());
            };
          (a.addEventListener('success', n), a.addEventListener('error', r));
        });
        return (g.set(e, a), e);
      }
      if (p.has(a)) return p.get(a);
      let s = (function (a) {
        if ('function' == typeof a)
          return (
            t ||
            (t = [
              IDBCursor.prototype.advance,
              IDBCursor.prototype.continue,
              IDBCursor.prototype.continuePrimaryKey,
            ])
          ).includes(a)
            ? function (...e) {
                return (a.apply(x(this), e), _(this.request));
              }
            : function (...e) {
                return _(a.apply(x(this), e));
              };
        return (a instanceof IDBTransaction &&
          (function (e) {
            if (f.has(e)) return;
            let t = new Promise((t, a) => {
              let s = () => {
                  (e.removeEventListener('complete', n),
                    e.removeEventListener('error', r),
                    e.removeEventListener('abort', r));
                },
                n = () => {
                  (t(), s());
                },
                r = () => {
                  (a(e.error || new DOMException('AbortError', 'AbortError')), s());
                };
              (e.addEventListener('complete', n),
                e.addEventListener('error', r),
                e.addEventListener('abort', r));
            });
            f.set(e, t);
          })(a),
        m(a, e || (e = [IDBDatabase, IDBObjectStore, IDBIndex, IDBCursor, IDBTransaction])))
          ? new Proxy(a, w)
          : a;
      })(a);
      return (s !== a && (p.set(a, s), g.set(s, a)), s);
    }
    let x = (e) => g.get(e),
      y = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'],
      v = ['put', 'add', 'delete', 'clear'],
      b = new Map();
    function E(e, t) {
      if (!(e instanceof IDBDatabase && !(t in e) && 'string' == typeof t)) return;
      if (b.get(t)) return b.get(t);
      let a = t.replace(/FromIndex$/, ''),
        s = t !== a,
        n = v.includes(a);
      if (!(a in (s ? IDBIndex : IDBObjectStore).prototype) || !(n || y.includes(a))) return;
      let r = async function (e, ...t) {
        let r = this.transaction(e, n ? 'readwrite' : 'readonly'),
          i = r.store;
        return (s && (i = i.index(t.shift())), (await Promise.all([i[a](...t), n && r.done]))[0]);
      };
      return (b.set(t, r), r);
    }
    w = ((e) => ({
      ...e,
      get: (t, a, s) => E(t, a) || e.get(t, a, s),
      has: (t, a) => !!E(t, a) || e.has(t, a),
    }))(w);
    let S = ['continue', 'continuePrimaryKey', 'advance'],
      D = {},
      A = new WeakMap(),
      N = new WeakMap(),
      C = {
        get(e, t) {
          if (!S.includes(t)) return e[t];
          let a = D[t];
          return (
            a ||
              (a = D[t] =
                function (...e) {
                  A.set(this, N.get(this)[t](...e));
                }),
            a
          );
        },
      };
    async function* k(...e) {
      let t = this;
      if ((t instanceof IDBCursor || (t = await t.openCursor(...e)), !t)) return;
      let a = new Proxy(t, C);
      for (N.set(a, t), g.set(a, x(t)); t;)
        (yield a, (t = await (A.get(a) || t.continue())), A.delete(a));
    }
    function T(e, t) {
      return (
        (t === Symbol.asyncIterator && m(e, [IDBIndex, IDBObjectStore, IDBCursor])) ||
        ('iterate' === t && m(e, [IDBIndex, IDBObjectStore]))
      );
    }
    w = ((e) => ({
      ...e,
      get: (t, a, s) => (T(t, a) ? k : e.get(t, a, s)),
      has: (t, a) => T(t, a) || e.has(t, a),
    }))(w);
    let R = {
      cacheWillUpdate: async ({ response: e }) => (200 === e.status || 0 === e.status ? e : null),
    };
    function I(e) {
      return 'string' == typeof e ? new Request(e) : e;
    }
    var P = class {
        event;
        request;
        url;
        params;
        _cacheKeys = {};
        _strategy;
        _handlerDeferred;
        _extendLifetimePromises;
        _plugins;
        _pluginStateMap;
        constructor(e, t) {
          for (let a of ((this.event = t.event),
          (this.request = t.request),
          t.url && ((this.url = t.url), (this.params = t.params)),
          (this._strategy = e),
          (this._handlerDeferred = new u()),
          (this._extendLifetimePromises = []),
          (this._plugins = [...e.plugins]),
          (this._pluginStateMap = new Map()),
          this._plugins))
            this._pluginStateMap.set(a, {});
          this.event.waitUntil(this._handlerDeferred.promise);
        }
        async fetch(e) {
          let { event: t } = this,
            a = I(e),
            s = await this.getPreloadResponse();
          if (s) return s;
          let n = this.hasCallback('fetchDidFail') ? a.clone() : null;
          try {
            for (let e of this.iterateCallbacks('requestWillFetch'))
              a = await e({ request: a.clone(), event: t });
          } catch (e) {
            if (e instanceof Error)
              throw new i('plugin-error-request-will-fetch', { thrownErrorMessage: e.message });
          }
          let r = a.clone();
          try {
            let e;
            for (let s of ((e = await fetch(
              a,
              'navigate' === a.mode ? void 0 : this._strategy.fetchOptions
            )),
            this.iterateCallbacks('fetchDidSucceed')))
              e = await s({ event: t, request: r, response: e });
            return e;
          } catch (e) {
            throw (
              n &&
                (await this.runCallbacks('fetchDidFail', {
                  error: e,
                  event: t,
                  originalRequest: n.clone(),
                  request: r.clone(),
                })),
              e
            );
          }
        }
        async fetchAndCachePut(e) {
          let t = await this.fetch(e),
            a = t.clone();
          return (this.waitUntil(this.cachePut(e, a)), t);
        }
        async cacheMatch(e) {
          let t,
            a = I(e),
            { cacheName: s, matchOptions: n } = this._strategy,
            r = await this.getCacheKey(a, 'read'),
            i = { ...n, cacheName: s };
          for (let e of ((t = await caches.match(r, i)),
          this.iterateCallbacks('cachedResponseWillBeUsed')))
            t =
              (await e({
                cacheName: s,
                matchOptions: n,
                cachedResponse: t,
                request: r,
                event: this.event,
              })) || void 0;
          return t;
        }
        async cachePut(e, t) {
          let a = I(e);
          await o(0);
          let s = await this.getCacheKey(a, 'write');
          if (!t)
            throw new i('cache-put-with-no-response', {
              url: new URL(String(s.url), location.href).href.replace(
                RegExp(`^${location.origin}`),
                ''
              ),
            });
          let n = await this._ensureResponseSafeToCache(t);
          if (!n) return !1;
          let { cacheName: r, matchOptions: c } = this._strategy,
            l = await self.caches.open(r),
            u = this.hasCallback('cacheDidUpdate'),
            m = u ? await h(l, s.clone(), ['__WB_REVISION__'], c) : null;
          try {
            await l.put(s, u ? n.clone() : n);
          } catch (e) {
            if (e instanceof Error) throw ('QuotaExceededError' === e.name && (await d()), e);
          }
          for (let e of this.iterateCallbacks('cacheDidUpdate'))
            await e({
              cacheName: r,
              oldResponse: m,
              newResponse: n.clone(),
              request: s,
              event: this.event,
            });
          return !0;
        }
        async getCacheKey(e, t) {
          let a = `${e.url} | ${t}`;
          if (!this._cacheKeys[a]) {
            let s = e;
            for (let e of this.iterateCallbacks('cacheKeyWillBeUsed'))
              s = I(await e({ mode: t, request: s, event: this.event, params: this.params }));
            this._cacheKeys[a] = s;
          }
          return this._cacheKeys[a];
        }
        hasCallback(e) {
          for (let t of this._strategy.plugins) if (e in t) return !0;
          return !1;
        }
        async runCallbacks(e, t) {
          for (let a of this.iterateCallbacks(e)) await a(t);
        }
        *iterateCallbacks(e) {
          for (let t of this._strategy.plugins)
            if ('function' == typeof t[e]) {
              let a = this._pluginStateMap.get(t),
                s = (s) => {
                  let n = { ...s, state: a };
                  return t[e](n);
                };
              yield s;
            }
        }
        waitUntil(e) {
          return (this._extendLifetimePromises.push(e), e);
        }
        async doneWaiting() {
          let e;
          for (; (e = this._extendLifetimePromises.shift());) await e;
        }
        destroy() {
          this._handlerDeferred.resolve(null);
        }
        async getPreloadResponse() {
          if (
            this.event instanceof FetchEvent &&
            'navigate' === this.event.request.mode &&
            'preloadResponse' in this.event
          )
            try {
              let e = await this.event.preloadResponse;
              if (e) return e;
            } catch (e) {
              return;
            }
        }
        async _ensureResponseSafeToCache(e) {
          let t = e,
            a = !1;
          for (let e of this.iterateCallbacks('cacheWillUpdate'))
            if (
              ((t = (await e({ request: this.request, response: t, event: this.event })) || void 0),
              (a = !0),
              !t)
            )
              break;
          return (!a && t && 200 !== t.status && (t = void 0), t);
        }
      },
      q = class {
        cacheName;
        plugins;
        fetchOptions;
        matchOptions;
        constructor(e = {}) {
          ((this.cacheName = r.getRuntimeName(e.cacheName)),
            (this.plugins = e.plugins || []),
            (this.fetchOptions = e.fetchOptions),
            (this.matchOptions = e.matchOptions));
        }
        handle(e) {
          let [t] = this.handleAll(e);
          return t;
        }
        handleAll(e) {
          e instanceof FetchEvent && (e = { event: e, request: e.request });
          let t = e.event,
            a = 'string' == typeof e.request ? new Request(e.request) : e.request,
            s = new P(
              this,
              e.url
                ? { event: t, request: a, url: e.url, params: e.params }
                : { event: t, request: a }
            ),
            n = this._getResponse(s, a, t);
          return [n, this._awaitComplete(n, s, a, t)];
        }
        async _getResponse(e, t, a) {
          let s;
          await e.runCallbacks('handlerWillStart', { event: a, request: t });
          try {
            if (((s = await this._handle(t, e)), void 0 === s || 'error' === s.type))
              throw new i('no-response', { url: t.url });
          } catch (n) {
            if (n instanceof Error) {
              for (let r of e.iterateCallbacks('handlerDidError'))
                if (void 0 !== (s = await r({ error: n, event: a, request: t }))) break;
            }
            if (!s) throw n;
          }
          for (let n of e.iterateCallbacks('handlerWillRespond'))
            s = await n({ event: a, request: t, response: s });
          return s;
        }
        async _awaitComplete(e, t, a, s) {
          let n, r;
          try {
            n = await e;
          } catch {}
          try {
            (await t.runCallbacks('handlerDidRespond', { event: s, request: a, response: n }),
              await t.doneWaiting());
          } catch (e) {
            e instanceof Error && (r = e);
          }
          if (
            (await t.runCallbacks('handlerDidComplete', {
              event: s,
              request: a,
              response: n,
              error: r,
            }),
            t.destroy(),
            r)
          )
            throw r;
        }
      },
      M = class extends q {
        _networkTimeoutSeconds;
        constructor(e = {}) {
          (super(e),
            this.plugins.some((e) => 'cacheWillUpdate' in e) || this.plugins.unshift(R),
            (this._networkTimeoutSeconds = e.networkTimeoutSeconds || 0));
        }
        async _handle(e, t) {
          let a,
            s = [],
            n = [];
          if (this._networkTimeoutSeconds) {
            let { id: r, promise: i } = this._getTimeoutPromise({
              request: e,
              logs: s,
              handler: t,
            });
            ((a = r), n.push(i));
          }
          let r = this._getNetworkPromise({ timeoutId: a, request: e, logs: s, handler: t });
          n.push(r);
          let o = await t.waitUntil(
            (async () => (await t.waitUntil(Promise.race(n))) || (await r))()
          );
          if (!o) throw new i('no-response', { url: e.url });
          return o;
        }
        _getTimeoutPromise({ request: e, logs: t, handler: a }) {
          let s;
          return {
            promise: new Promise((t) => {
              s = setTimeout(async () => {
                t(await a.cacheMatch(e));
              }, 1e3 * this._networkTimeoutSeconds);
            }),
            id: s,
          };
        }
        async _getNetworkPromise({ timeoutId: e, request: t, logs: a, handler: s }) {
          let n, r;
          try {
            r = await s.fetchAndCachePut(t);
          } catch (e) {
            e instanceof Error && (n = e);
          }
          return (e && clearTimeout(e), (n || !r) && (r = await s.cacheMatch(t)), r);
        }
      },
      B = class extends q {
        _networkTimeoutSeconds;
        constructor(e = {}) {
          (super(e), (this._networkTimeoutSeconds = e.networkTimeoutSeconds || 0));
        }
        async _handle(e, t) {
          let a, s;
          try {
            let a = [t.fetch(e)];
            if (this._networkTimeoutSeconds) {
              let e = o(1e3 * this._networkTimeoutSeconds);
              a.push(e);
            }
            if (!(s = await Promise.race(a)))
              throw Error(
                `Timed out the network response after ${this._networkTimeoutSeconds} seconds.`
              );
          } catch (e) {
            e instanceof Error && (a = e);
          }
          if (!s) throw new i('no-response', { url: e.url, error: a });
          return s;
        }
      };
    'undefined' != typeof navigator && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    let L = 'cache-entries',
      W = (e) => {
        let t = new URL(e, location.href);
        return ((t.hash = ''), t.href);
      };
    var F = class {
        _cacheName;
        _db = null;
        constructor(e) {
          this._cacheName = e;
        }
        _getId(e) {
          return `${this._cacheName}|${W(e)}`;
        }
        _upgradeDb(e) {
          let t = e.createObjectStore(L, { keyPath: 'id' });
          (t.createIndex('cacheName', 'cacheName', { unique: !1 }),
            t.createIndex('timestamp', 'timestamp', { unique: !1 }));
        }
        _upgradeDbAndDeleteOldDbs(e) {
          (this._upgradeDb(e),
            this._cacheName &&
              (function (e, { blocked: t } = {}) {
                let a = indexedDB.deleteDatabase(e);
                (t && a.addEventListener('blocked', (e) => t(e.oldVersion, e)),
                  _(a).then(() => void 0));
              })(this._cacheName));
        }
        async setTimestamp(e, t) {
          e = W(e);
          let a = { id: this._getId(e), cacheName: this._cacheName, url: e, timestamp: t },
            s = (await this.getDb()).transaction(L, 'readwrite', { durability: 'relaxed' });
          (await s.store.put(a), await s.done);
        }
        async getTimestamp(e) {
          return (await (await this.getDb()).get(L, this._getId(e)))?.timestamp;
        }
        async expireEntries(e, t) {
          let a = await (
              await this.getDb()
            )
              .transaction(L, 'readwrite')
              .store.index('timestamp')
              .openCursor(null, 'prev'),
            s = [],
            n = 0;
          for (; a;) {
            let r = a.value;
            (r.cacheName === this._cacheName &&
              ((e && r.timestamp < e) || (t && n >= t) ? (a.delete(), s.push(r.url)) : n++),
              (a = await a.continue()));
          }
          return s;
        }
        async getDb() {
          return (
            this._db ||
              (this._db = await (function (
                e,
                t,
                { blocked: a, upgrade: s, blocking: n, terminated: r } = {}
              ) {
                let i = indexedDB.open(e, 1),
                  o = _(i);
                return (
                  s &&
                    i.addEventListener('upgradeneeded', (e) => {
                      s(_(i.result), e.oldVersion, e.newVersion, _(i.transaction), e);
                    }),
                  a && i.addEventListener('blocked', (e) => a(e.oldVersion, e.newVersion, e)),
                  o
                    .then((e) => {
                      (r && e.addEventListener('close', () => r()),
                        n &&
                          e.addEventListener('versionchange', (e) =>
                            n(e.oldVersion, e.newVersion, e)
                          ));
                    })
                    .catch(() => {}),
                  o
                );
              })('serwist-expiration', 0, { upgrade: this._upgradeDbAndDeleteOldDbs.bind(this) })),
            this._db
          );
        }
      },
      U = class {
        _isRunning = !1;
        _rerunRequested = !1;
        _maxEntries;
        _maxAgeSeconds;
        _matchOptions;
        _cacheName;
        _timestampModel;
        constructor(e, t = {}) {
          ((this._maxEntries = t.maxEntries),
            (this._maxAgeSeconds = t.maxAgeSeconds),
            (this._matchOptions = t.matchOptions),
            (this._cacheName = e),
            (this._timestampModel = new F(e)));
        }
        async expireEntries() {
          if (this._isRunning) {
            this._rerunRequested = !0;
            return;
          }
          this._isRunning = !0;
          let e = this._maxAgeSeconds ? Date.now() - 1e3 * this._maxAgeSeconds : 0,
            t = await this._timestampModel.expireEntries(e, this._maxEntries),
            a = await self.caches.open(this._cacheName);
          for (let e of t) await a.delete(e, this._matchOptions);
          ((this._isRunning = !1),
            this._rerunRequested && ((this._rerunRequested = !1), this.expireEntries()));
        }
        async updateTimestamp(e) {
          await this._timestampModel.setTimestamp(e, Date.now());
        }
        async isURLExpired(e) {
          if (!this._maxAgeSeconds) return !1;
          let t = await this._timestampModel.getTimestamp(e),
            a = Date.now() - 1e3 * this._maxAgeSeconds;
          return void 0 === t || t < a;
        }
        async delete() {
          ((this._rerunRequested = !1), await this._timestampModel.expireEntries(1 / 0));
        }
      },
      O = class {
        _config;
        _cacheExpirations;
        constructor(e = {}) {
          var t;
          ((this._config = e),
            (this._cacheExpirations = new Map()),
            this._config.maxAgeFrom || (this._config.maxAgeFrom = 'last-fetched'),
            this._config.purgeOnQuotaError &&
              ((t = () => this.deleteCacheAndMetadata()), c.add(t)));
        }
        _getCacheExpiration(e) {
          if (e === r.getRuntimeName()) throw new i('expire-custom-caches-only');
          let t = this._cacheExpirations.get(e);
          return (t || ((t = new U(e, this._config)), this._cacheExpirations.set(e, t)), t);
        }
        cachedResponseWillBeUsed({ event: e, cacheName: t, request: a, cachedResponse: s }) {
          if (!s) return null;
          let n = this._isResponseDateFresh(s),
            r = this._getCacheExpiration(t),
            i = 'last-used' === this._config.maxAgeFrom,
            o = (async () => {
              (i && (await r.updateTimestamp(a.url)), await r.expireEntries());
            })();
          try {
            e.waitUntil(o);
          } catch {}
          return n ? s : null;
        }
        _isResponseDateFresh(e) {
          if ('last-used' === this._config.maxAgeFrom) return !0;
          let t = Date.now();
          if (!this._config.maxAgeSeconds) return !0;
          let a = this._getDateHeaderTimestamp(e);
          return null === a || a >= t - 1e3 * this._config.maxAgeSeconds;
        }
        _getDateHeaderTimestamp(e) {
          if (!e.headers.has('date')) return null;
          let t = new Date(e.headers.get('date')).getTime();
          return Number.isNaN(t) ? null : t;
        }
        async cacheDidUpdate({ cacheName: e, request: t }) {
          let a = this._getCacheExpiration(e);
          (await a.updateTimestamp(t.url), await a.expireEntries());
        }
        async deleteCacheAndMetadata() {
          for (let [e, t] of this._cacheExpirations)
            (await self.caches.delete(e), await t.delete());
          this._cacheExpirations = new Map();
        }
      };
    let j = async (e, t) => {
      try {
        if (206 === t.status) return t;
        let a = e.headers.get('range');
        if (!a) throw new i('no-range-header');
        let s = ((e) => {
            let t = e.trim().toLowerCase();
            if (!t.startsWith('bytes='))
              throw new i('unit-must-be-bytes', { normalizedRangeHeader: t });
            if (t.includes(',')) throw new i('single-range-only', { normalizedRangeHeader: t });
            let a = /(\d*)-(\d*)/.exec(t);
            if (!a || !(a[1] || a[2]))
              throw new i('invalid-range-values', { normalizedRangeHeader: t });
            return {
              start: '' === a[1] ? void 0 : Number(a[1]),
              end: '' === a[2] ? void 0 : Number(a[2]),
            };
          })(a),
          n = await t.blob(),
          r = ((e, t, a) => {
            let s,
              n,
              r = e.size;
            if ((a && a > r) || (t && t < 0))
              throw new i('range-not-satisfiable', { size: r, end: a, start: t });
            return (
              void 0 !== t && void 0 !== a
                ? ((s = t), (n = a + 1))
                : void 0 !== t && void 0 === a
                  ? ((s = t), (n = r))
                  : void 0 !== a && void 0 === t && ((s = r - a), (n = r)),
              { start: s, end: n }
            );
          })(n, s.start, s.end),
          o = n.slice(r.start, r.end),
          c = o.size,
          l = new Response(o, { status: 206, statusText: 'Partial Content', headers: t.headers });
        return (
          l.headers.set('Content-Length', String(c)),
          l.headers.set('Content-Range', `bytes ${r.start}-${r.end - 1}/${n.size}`),
          l
        );
      } catch (e) {
        return new Response('', { status: 416, statusText: 'Range Not Satisfiable' });
      }
    };
    var $ = class {
        cachedResponseWillBeUsed = async ({ request: e, cachedResponse: t }) =>
          t && e.headers.has('range') ? await j(e, t) : t;
      },
      K = class extends q {
        async _handle(e, t) {
          let a,
            s = await t.cacheMatch(e);
          if (s);
          else
            try {
              s = await t.fetchAndCachePut(e);
            } catch (e) {
              e instanceof Error && (a = e);
            }
          if (!s) throw new i('no-response', { url: e.url, error: a });
          return s;
        }
      },
      V = class extends q {
        constructor(e = {}) {
          (super(e), this.plugins.some((e) => 'cacheWillUpdate' in e) || this.plugins.unshift(R));
        }
        async _handle(e, t) {
          let a,
            s = t.fetchAndCachePut(e).catch(() => {});
          t.waitUntil(s);
          let n = await t.cacheMatch(e);
          if (n);
          else
            try {
              n = await s;
            } catch (e) {
              e instanceof Error && (a = e);
            }
          if (!n) throw new i('no-response', { url: e.url, error: a });
          return n;
        }
      };
    let z = { rscPrefetch: 'pages-rsc-prefetch', rsc: 'pages-rsc', html: 'pages' },
      G = [
        {
          matcher: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
          handler: new K({
            cacheName: 'google-fonts-webfonts',
            plugins: [new O({ maxEntries: 4, maxAgeSeconds: 31536e3, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
          handler: new V({
            cacheName: 'google-fonts-stylesheets',
            plugins: [new O({ maxEntries: 4, maxAgeSeconds: 604800, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
          handler: new V({
            cacheName: 'static-font-assets',
            plugins: [new O({ maxEntries: 4, maxAgeSeconds: 604800, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
          handler: new V({
            cacheName: 'static-image-assets',
            plugins: [new O({ maxEntries: 64, maxAgeSeconds: 2592e3, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /\/_next\/static.+\.js$/i,
          handler: new K({
            cacheName: 'next-static-js-assets',
            plugins: [new O({ maxEntries: 64, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /\/_next\/image\?url=.+$/i,
          handler: new V({
            cacheName: 'next-image',
            plugins: [new O({ maxEntries: 64, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /\.(?:mp3|wav|ogg)$/i,
          handler: new K({
            cacheName: 'static-audio-assets',
            plugins: [
              new O({ maxEntries: 32, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' }),
              new $(),
            ],
          }),
        },
        {
          matcher: /\.(?:mp4|webm)$/i,
          handler: new K({
            cacheName: 'static-video-assets',
            plugins: [
              new O({ maxEntries: 32, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' }),
              new $(),
            ],
          }),
        },
        {
          matcher: /\.(?:js)$/i,
          handler: new V({
            cacheName: 'static-js-assets',
            plugins: [new O({ maxEntries: 48, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /\.(?:css|less)$/i,
          handler: new V({
            cacheName: 'static-style-assets',
            plugins: [new O({ maxEntries: 32, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /\/_next\/data\/.+\/.+\.json$/i,
          handler: new M({
            cacheName: 'next-data',
            plugins: [new O({ maxEntries: 32, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /\.(?:json|xml|csv)$/i,
          handler: new M({
            cacheName: 'static-data-assets',
            plugins: [new O({ maxEntries: 32, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' })],
          }),
        },
        { matcher: /\/api\/auth\/.*/, handler: new B({ networkTimeoutSeconds: 10 }) },
        {
          matcher: ({ sameOrigin: e, url: { pathname: t } }) => e && t.startsWith('/api/'),
          method: 'GET',
          handler: new M({
            cacheName: 'apis',
            plugins: [new O({ maxEntries: 16, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' })],
            networkTimeoutSeconds: 10,
          }),
        },
        {
          matcher: ({ request: e, url: { pathname: t }, sameOrigin: a }) =>
            '1' === e.headers.get('RSC') &&
            '1' === e.headers.get('Next-Router-Prefetch') &&
            a &&
            !t.startsWith('/api/'),
          handler: new M({
            cacheName: z.rscPrefetch,
            plugins: [new O({ maxEntries: 32, maxAgeSeconds: 86400 })],
          }),
        },
        {
          matcher: ({ request: e, url: { pathname: t }, sameOrigin: a }) =>
            '1' === e.headers.get('RSC') && a && !t.startsWith('/api/'),
          handler: new M({
            cacheName: z.rsc,
            plugins: [new O({ maxEntries: 32, maxAgeSeconds: 86400 })],
          }),
        },
        {
          matcher: ({ request: e, url: { pathname: t }, sameOrigin: a }) =>
            e.headers.get('Content-Type')?.includes('text/html') && a && !t.startsWith('/api/'),
          handler: new M({
            cacheName: z.html,
            plugins: [new O({ maxEntries: 32, maxAgeSeconds: 86400 })],
          }),
        },
        {
          matcher: ({ url: { pathname: e }, sameOrigin: t }) => t && !e.startsWith('/api/'),
          handler: new M({
            cacheName: 'others',
            plugins: [new O({ maxEntries: 32, maxAgeSeconds: 86400 })],
          }),
        },
        {
          matcher: ({ sameOrigin: e }) => !e,
          handler: new M({
            cacheName: 'cross-origin',
            plugins: [new O({ maxEntries: 32, maxAgeSeconds: 3600 })],
            networkTimeoutSeconds: 10,
          }),
        },
        { matcher: /.*/i, method: 'GET', handler: new B() },
      ];
    (new s.Serwist({
      precacheEntries: [
        { revision: null, url: '/_next/static/chunks/1054.e22a783f2de83bf3.js' },
        { revision: null, url: '/_next/static/chunks/1356-90c2c76719b6a05c.js' },
        { revision: null, url: '/_next/static/chunks/1646.2c8c06db20d728b6.js' },
        { revision: null, url: '/_next/static/chunks/1668.2f2642c9ceec9507.js' },
        { revision: null, url: '/_next/static/chunks/1865-79b985ff1727f93e.js' },
        { revision: null, url: '/_next/static/chunks/1994-111a6da2d040c2c4.js' },
        { revision: null, url: '/_next/static/chunks/2384-37b618fdfb18293a.js' },
        { revision: null, url: '/_next/static/chunks/2619-68b32589f89a3209.js' },
        { revision: null, url: '/_next/static/chunks/4091-05701f423936f74b.js' },
        { revision: null, url: '/_next/static/chunks/4127-28aa1ec02c4658bd.js' },
        { revision: null, url: '/_next/static/chunks/4200-6afc59f4e272d456.js' },
        { revision: null, url: '/_next/static/chunks/4335-a483cbd9d9af723d.js' },
        { revision: null, url: '/_next/static/chunks/4516-75679718626372b7.js' },
        { revision: null, url: '/_next/static/chunks/471-6cf2bff8263873bb.js' },
        { revision: null, url: '/_next/static/chunks/4a7b0c69-c28b3c0d6d42b12c.js' },
        { revision: null, url: '/_next/static/chunks/4bd1b696-b34e69e7c8503bd5.js' },
        { revision: null, url: '/_next/static/chunks/501-c42190a5de5c088c.js' },
        { revision: null, url: '/_next/static/chunks/5139.e1c82892b4be809e.js' },
        { revision: null, url: '/_next/static/chunks/5239-60ddf9b8d374363a.js' },
        { revision: null, url: '/_next/static/chunks/5590-32d2d7e5dfb2e43f.js' },
        { revision: null, url: '/_next/static/chunks/6093-24aa58771e999c80.js' },
        { revision: null, url: '/_next/static/chunks/6221-397ea5dff3cbadba.js' },
        { revision: null, url: '/_next/static/chunks/6265-62216bcee55723a6.js' },
        { revision: null, url: '/_next/static/chunks/6348-e38b6c57e89931d2.js' },
        { revision: null, url: '/_next/static/chunks/6678-42692ad7edb08596.js' },
        { revision: null, url: '/_next/static/chunks/6851-886fa5198d68badf.js' },
        { revision: null, url: '/_next/static/chunks/7423.ba7d8a680cb0a5e6.js' },
        { revision: null, url: '/_next/static/chunks/8235-b74ecdefea236de9.js' },
        { revision: null, url: '/_next/static/chunks/8783-560b4b0bfb053134.js' },
        { revision: null, url: '/_next/static/chunks/8971.e1d243d5eaceea12.js' },
        { revision: null, url: '/_next/static/chunks/8986.41e031cafb4f8e77.js' },
        { revision: null, url: '/_next/static/chunks/8b30ef62.2b25a563b88c9ae5.js' },
        { revision: null, url: '/_next/static/chunks/9175.2dbb894aad529ae8.js' },
        { revision: null, url: '/_next/static/chunks/9202-4326c4e9fc4732bd.js' },
        { revision: null, url: '/_next/static/chunks/9511-a58c12ba1b725e39.js' },
        { revision: null, url: '/_next/static/chunks/9580-5e6260cafe9eb368.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/analytics/page-94d91d4bd89e2473.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/challenges/%5Bid%5D/edit/page-35e357714bc08f51.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/co-pilot/page-9ac73108f7acc3ae.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/error-a2efc8da2c122058.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/loading-b3bba2c24667821c.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/page-c06241455ee50ab7.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/posts/%5Bid%5D/edit/page-e42ee79262e90163.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/posts/%5Bid%5D/preview/page-7bd6c0465124d574.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/akis/page-d32f524fb6b0b392.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/arastirma/page-d9d23134102f5a91.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/auth/callback/route-4d0d207d43fdad86.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/blog/%5Bslug%5D/page-967afb84ccd2e567.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/blog/page-082df33c8b080e72.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/dashboard/error-2b2d70e4965f5532.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/dashboard/loading-834640c7cc06fd2d.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/dashboard/page-5c67838950147231.js',
        },
        { revision: null, url: '/_next/static/chunks/app/%5Blocale%5D/error-797f9b6fc20418fa.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/eserler/edit/page-a82fcd020d1d64a4.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/eserler/page-3dbf0f99da2343f1.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/feedback/page-cb60241bff1d43c1.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/forgot-password/page-a8fbafd1ecc22793.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/gizlilik/page-681481d3d0131705.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/hakkimizda/page-521762174ae3798d.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/iletisim/page-487c185aaa973175.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/karsilastir/page-c6c1596e6c59825d.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kategori/%5Bslug%5D/page-44831f14a156e154.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kesfet/error-42413e0324a7cd0a.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kesfet/loading-3f7920425fcc63cf.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kesfet/page-3501c7f8a4de1ada.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/koleksiyonlar/%5Bslug%5D/page-a981a2d4d5129714.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/koleksiyonlar/page-3c88bec47c79f138.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kullanim-kosullari/page-7137a4264497bbd1.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/launchpad/page-04d511592bfe5cfe.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/launchpad/submit/page-b623fc844b8516b0.js',
        },
        { revision: null, url: '/_next/static/chunks/app/%5Blocale%5D/layout-40b3047a4fb4eedd.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/leaderboard/page-47f08738924ffa46.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/login/page-47d345c54e9f07bf.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/mesajlar/%5BconversationId%5D/page-2ba816eee745f282.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/mesajlar/layout-b78856adec7d47d2.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/mesajlar/page-63fac49751cb5c4e.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/not-found-cbdc648d597d1224.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/odul-avciligi/%5Bid%5D/page-3aff465ea6b81188.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/odul-avciligi/page-fe994871bdc85dce.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/ogren/page-a1dd0f05da0f2dd9.js',
        },
        { revision: null, url: '/_next/static/chunks/app/%5Blocale%5D/page-9f55935138dccfc1.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/profile/collections/%5Bid%5D/edit/page-c79eb8a2a4310453.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/profile/error-9ab190521452aa96.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/profile/loading-6b17917675760ab5.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/profile/page-38e2ffc4a3b354df.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/profile/projects/%5Bid%5D/edit/page-0b12d2da8bc619b2.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/random-tools/page-81b91a8811fef7c3.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/reset-password/page-38880924f0449969.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/signup/page-704bd7224064c207.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/studyo/error-c9c65577be3510b4.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/studyo/loading-ae517177573a0ada.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/studyo/page-652be1ad7bd5773f.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/submit/page-c5158442d8502cdb.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/tavsiye/page-b6a0db91cecaf22c.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/tool/%5Bslug%5D/error-3a55ab370f3a03e8.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/tool/%5Bslug%5D/loading-135d2ba10a76d8b5.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/tool/%5Bslug%5D/page-044273cc5932d6b4.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/topluluk/page-94663c1fc6cd9b94.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/u/%5Busername%5D/followers/page-7c76fa3eb320161a.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/u/%5Busername%5D/following/page-c53a703026b7dc5a.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/u/%5Busername%5D/page-febc993aeaf2fb1c.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/uyelik/page-5a00a412bc2d73f5.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/yarisma/page-57c83898816eb7e3.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/~offline/page-c0c3e70f2a9d6eab.js',
        },
        { revision: null, url: '/_next/static/chunks/app/_not-found/page-3199e217aa70bba7.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/cron/link-audit/route-5b70ebe191ec595d.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/stripe-webhook/route-db2233cfd0d43544.js',
        },
        { revision: null, url: '/_next/static/chunks/app/api/tool-icon/route-eec5c232b6eeddd1.js' },
        { revision: null, url: '/_next/static/chunks/app/global-error-d05d931083e36acf.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/manifest.webmanifest/route-8fbaa5e434d083f9.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/opengraph-image/route-bd1259da8df0b0ca.js',
        },
        { revision: null, url: '/_next/static/chunks/app/robots.txt/route-2f6130c0b5b50d5e.js' },
        { revision: null, url: '/_next/static/chunks/app/sitemap.xml/route-2dafcb461f269db9.js' },
        { revision: null, url: '/_next/static/chunks/framework-e0082436dfdc054b.js' },
        { revision: null, url: '/_next/static/chunks/main-06133df59be74b83.js' },
        { revision: null, url: '/_next/static/chunks/main-app-0fb2a1f2e0e568d5.js' },
        { revision: null, url: '/_next/static/chunks/pages/_app-b989d26e86ab5861.js' },
        { revision: null, url: '/_next/static/chunks/pages/_error-02f391e37014e579.js' },
        {
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
        },
        { revision: null, url: '/_next/static/chunks/webpack-fb746e73870667e5.js' },
        { revision: null, url: '/_next/static/css/2312b98d0fe3d079.css' },
        { revision: null, url: '/_next/static/css/925cbc81caebf192.css' },
        {
          revision: '22e8a57a9bdbcec28f5596f245c1cd2b',
          url: '/_next/static/i_2FWIFph90c6kM-VI-eK/_buildManifest.js',
        },
        {
          revision: 'b6652df95db52feb4daf4eca35380933',
          url: '/_next/static/i_2FWIFph90c6kM-VI-eK/_ssgManifest.js',
        },
        {
          revision: '2c6e370c5824bbc9e32cb1ba7e026e11',
          url: '/_next/static/media/4c4943bfceab8361-s.woff2',
        },
        {
          revision: '1c318527f22cf211a2f5ceec29af8a50',
          url: '/_next/static/media/6e50af2f4c313e23-s.p.woff2',
        },
        {
          revision: '3b92358d7d385eabb6c65acc7f354fbe',
          url: '/_next/static/media/7bb4ad34d7ebf0d7-s.woff2',
        },
        {
          revision: '3c837520cb012e79d6b3cfb99ecbac9b',
          url: '/_next/static/media/c1f853e4758089a8-s.woff2',
        },
        { revision: '93a1151f6147b94ef10373c640c24740', url: '/favicon.ico' },
        { revision: 'd09f95206c3fa0bb9bd9fefabfd0ea71', url: '/file.svg' },
        { revision: '2aaafa6a49b6563925fe440891e32717', url: '/globe.svg' },
        { revision: 'e54fd3ac0c3058e8a247e24b94074df8', url: '/icons\\icon-192x192.png' },
        { revision: '397290b04735804959fade3519a41f77', url: '/icons\\icon-512x512.png' },
        { revision: '8e061864f388b47f33a1c3780831193e', url: '/next.svg' },
        { revision: 'c0af2f507b369b085b35ef4bbe3bcf1e', url: '/vercel.svg' },
        { revision: 'a2760511c65806022ad20adf74370ff3', url: '/window.svg' },
      ],
      skipWaiting: !0,
      clientsClaim: !0,
      navigationPreload: !0,
      runtimeCaching: G,
      fallbacks: {
        entries: [
          {
            url: '/~offline',
            matcher(e) {
              let { request: t } = e;
              return 'document' === t.destination;
            },
          },
        ],
      },
    }).addEventListeners(),
      self.addEventListener('push', function (e) {
        let t = {};
        try {
          e.data && (t = e.data.json());
        } catch (a) {
          t = { title: 'AI Keşif Platformu', body: e.data ? e.data.text() : '' };
        }
        let a = t.title || 'AI Keşif Platformu',
          s = {
            body: t.body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            data: { url: t.url },
          };
        e.waitUntil(self.registration.showNotification(a, s));
      }),
      self.addEventListener('notificationclick', function (e) {
        var t;
        e.notification.close();
        let a = (null == (t = e.notification.data) ? void 0 : t.url) || '/';
        e.waitUntil(clients.openWindow(a));
      }));
  })());
