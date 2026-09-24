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
      (e._sentryDebugIds[t] = 'e6281e2f-1842-4a7b-8b02-c07b1d8d3bb8'),
      (e._sentryDebugIdIdentifier = 'sentry-dbid-e6281e2f-1842-4a7b-8b02-c07b1d8d3bb8'));
  } catch (e) {}
})(),
  (() => {
    'use strict';
    let e,
      t,
      a,
      s,
      r,
      n = {
        googleAnalytics: 'googleAnalytics',
        precache: 'precache-v2',
        prefix: 'serwist',
        runtime: 'runtime',
        suffix: 'undefined' != typeof registration ? registration.scope : '',
      },
      i = (e) => [n.prefix, e, n.suffix].filter((e) => e && e.length > 0).join('-'),
      c = {
        updateDetails: (e) => {
          var t = (t) => {
            let a = e[t];
            'string' == typeof a && (n[t] = a);
          };
          for (let e of Object.keys(n)) t(e);
        },
        getGoogleAnalyticsName: (e) => e || i(n.googleAnalytics),
        getPrecacheName: (e) => e || i(n.precache),
        getRuntimeName: (e) => e || i(n.runtime),
      };
    var o = class extends Error {
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
    function l(e) {
      return new Promise((t) => setTimeout(t, e));
    }
    let h = new Set();
    function u(e, t) {
      let a = new URL(e);
      for (let e of t) a.searchParams.delete(e);
      return a.href;
    }
    async function d(e, t, a, s) {
      let r = u(t.url, a);
      if (t.url === r) return e.match(t, s);
      let n = { ...s, ignoreSearch: !0 };
      for (let i of await e.keys(t, n)) if (r === u(i.url, a)) return e.match(i, s);
    }
    var m = class {
      promise;
      resolve;
      reject;
      constructor() {
        this.promise = new Promise((e, t) => {
          ((this.resolve = e), (this.reject = t));
        });
      }
    };
    let f = async () => {
        for (let e of h) await e();
      },
      g = '-precache-',
      w = async (e, t = g) => {
        let a = (await self.caches.keys()).filter(
          (a) => a.includes(t) && a.includes(self.registration.scope) && a !== e
        );
        return (await Promise.all(a.map((e) => self.caches.delete(e))), a);
      },
      p = (e, t) => {
        let a = t();
        return (e.waitUntil(a), a);
      },
      y = (e, t) => t.some((t) => e instanceof t),
      _ = new WeakMap(),
      b = new WeakMap(),
      x = new WeakMap(),
      v = {
        get(e, t, a) {
          if (e instanceof IDBTransaction) {
            if ('done' === t) return _.get(e);
            if ('store' === t)
              return a.objectStoreNames[1] ? void 0 : a.objectStore(a.objectStoreNames[0]);
          }
          return E(e[t]);
        },
        set: (e, t, a) => ((e[t] = a), !0),
        has: (e, t) => (e instanceof IDBTransaction && ('done' === t || 'store' === t)) || t in e,
      };
    function E(e) {
      if (e instanceof IDBRequest) {
        let t = new Promise((t, a) => {
          let s = () => {
              (e.removeEventListener('success', r), e.removeEventListener('error', n));
            },
            r = () => {
              (t(E(e.result)), s());
            },
            n = () => {
              (a(e.error), s());
            };
          (e.addEventListener('success', r), e.addEventListener('error', n));
        });
        return (x.set(t, e), t);
      }
      if (b.has(e)) return b.get(e);
      let s = (function (e) {
        if ('function' == typeof e)
          return (
            a ||
            (a = [
              IDBCursor.prototype.advance,
              IDBCursor.prototype.continue,
              IDBCursor.prototype.continuePrimaryKey,
            ])
          ).includes(e)
            ? function (...t) {
                return (e.apply(R(this), t), E(this.request));
              }
            : function (...t) {
                return E(e.apply(R(this), t));
              };
        return (e instanceof IDBTransaction &&
          (function (e) {
            if (_.has(e)) return;
            let t = new Promise((t, a) => {
              let s = () => {
                  (e.removeEventListener('complete', r),
                    e.removeEventListener('error', n),
                    e.removeEventListener('abort', n));
                },
                r = () => {
                  (t(), s());
                },
                n = () => {
                  (a(e.error || new DOMException('AbortError', 'AbortError')), s());
                };
              (e.addEventListener('complete', r),
                e.addEventListener('error', n),
                e.addEventListener('abort', n));
            });
            _.set(e, t);
          })(e),
        y(e, t || (t = [IDBDatabase, IDBObjectStore, IDBIndex, IDBCursor, IDBTransaction])))
          ? new Proxy(e, v)
          : e;
      })(e);
      return (s !== e && (b.set(e, s), x.set(s, e)), s);
    }
    let R = (e) => x.get(e);
    function q(e, t, { blocked: a, upgrade: s, blocking: r, terminated: n } = {}) {
      let i = indexedDB.open(e, t),
        c = E(i);
      return (
        s &&
          i.addEventListener('upgradeneeded', (e) => {
            s(E(i.result), e.oldVersion, e.newVersion, E(i.transaction), e);
          }),
        a && i.addEventListener('blocked', (e) => a(e.oldVersion, e.newVersion, e)),
        c
          .then((e) => {
            (n && e.addEventListener('close', () => n()),
              r && e.addEventListener('versionchange', (e) => r(e.oldVersion, e.newVersion, e)));
          })
          .catch(() => {}),
        c
      );
    }
    let D = ['get', 'getKey', 'getAll', 'getAllKeys', 'count'],
      S = ['put', 'add', 'delete', 'clear'],
      C = new Map();
    function N(e, t) {
      if (!(e instanceof IDBDatabase && !(t in e) && 'string' == typeof t)) return;
      if (C.get(t)) return C.get(t);
      let a = t.replace(/FromIndex$/, ''),
        s = t !== a,
        r = S.includes(a);
      if (!(a in (s ? IDBIndex : IDBObjectStore).prototype) || !(r || D.includes(a))) return;
      let n = async function (e, ...t) {
        let n = this.transaction(e, r ? 'readwrite' : 'readonly'),
          i = n.store;
        return (s && (i = i.index(t.shift())), (await Promise.all([i[a](...t), r && n.done]))[0]);
      };
      return (C.set(t, n), n);
    }
    v = ((e) => ({
      ...e,
      get: (t, a, s) => N(t, a) || e.get(t, a, s),
      has: (t, a) => !!N(t, a) || e.has(t, a),
    }))(v);
    let L = ['continue', 'continuePrimaryKey', 'advance'],
      T = {},
      A = new WeakMap(),
      P = new WeakMap(),
      k = {
        get(e, t) {
          if (!L.includes(t)) return e[t];
          let a = T[t];
          return (
            a ||
              (a = T[t] =
                function (...e) {
                  A.set(this, P.get(this)[t](...e));
                }),
            a
          );
        },
      };
    async function* I(...e) {
      let t = this;
      if ((t instanceof IDBCursor || (t = await t.openCursor(...e)), !t)) return;
      let a = new Proxy(t, k);
      for (P.set(a, t), x.set(a, R(t)); t;)
        (yield a, (t = await (A.get(a) || t.continue())), A.delete(a));
    }
    function U(e, t) {
      return (
        (t === Symbol.asyncIterator && y(e, [IDBIndex, IDBObjectStore, IDBCursor])) ||
        ('iterate' === t && y(e, [IDBIndex, IDBObjectStore]))
      );
    }
    v = ((e) => ({
      ...e,
      get: (t, a, s) => (U(t, a) ? I : e.get(t, a, s)),
      has: (t, a) => U(t, a) || e.has(t, a),
    }))(v);
    let F = async (t, a) => {
        let s = null;
        if ((t.url && (s = new URL(t.url).origin), s !== self.location.origin))
          throw new o('cross-origin-copy-response', { origin: s });
        let r = t.clone(),
          n = { headers: new Headers(r.headers), status: r.status, statusText: r.statusText },
          i = a ? a(n) : n,
          c = !(function () {
            if (void 0 === e) {
              let t = new Response('');
              if ('body' in t)
                try {
                  (new Response(t.body), (e = !0));
                } catch {
                  e = !1;
                }
              e = !1;
            }
            return e;
          })()
            ? await r.blob()
            : r.body;
        return new Response(c, i);
      },
      B = 'requests',
      K = 'queueName';
    var M = class {
        _db = null;
        async addEntry(e) {
          let t = (await this.getDb()).transaction(B, 'readwrite', { durability: 'relaxed' });
          (await t.store.add(e), await t.done);
        }
        async getFirstEntryId() {
          return (await (await this.getDb()).transaction(B).store.openCursor())?.value.id;
        }
        async getAllEntriesByQueueName(e) {
          return (await (await this.getDb()).getAllFromIndex(B, K, IDBKeyRange.only(e))) || [];
        }
        async getEntryCountByQueueName(e) {
          return (await this.getDb()).countFromIndex(B, K, IDBKeyRange.only(e));
        }
        async deleteEntry(e) {
          await (await this.getDb()).delete(B, e);
        }
        async getFirstEntryByQueueName(e) {
          return await this.getEndEntryFromIndex(IDBKeyRange.only(e), 'next');
        }
        async getLastEntryByQueueName(e) {
          return await this.getEndEntryFromIndex(IDBKeyRange.only(e), 'prev');
        }
        async getEndEntryFromIndex(e, t) {
          return (await (await this.getDb()).transaction(B).store.index(K).openCursor(e, t))?.value;
        }
        async getDb() {
          return (
            this._db ||
              (this._db = await q('serwist-background-sync', 3, { upgrade: this._upgradeDb })),
            this._db
          );
        }
        _upgradeDb(e, t) {
          (t > 0 && t < 3 && e.objectStoreNames.contains(B) && e.deleteObjectStore(B),
            e
              .createObjectStore(B, { autoIncrement: !0, keyPath: 'id' })
              .createIndex(K, K, { unique: !1 }));
        }
      },
      O = class {
        _queueName;
        _queueDb;
        constructor(e) {
          ((this._queueName = e), (this._queueDb = new M()));
        }
        async pushEntry(e) {
          (delete e.id, (e.queueName = this._queueName), await this._queueDb.addEntry(e));
        }
        async unshiftEntry(e) {
          let t = await this._queueDb.getFirstEntryId();
          (t ? (e.id = t - 1) : delete e.id,
            (e.queueName = this._queueName),
            await this._queueDb.addEntry(e));
        }
        async popEntry() {
          return this._removeEntry(await this._queueDb.getLastEntryByQueueName(this._queueName));
        }
        async shiftEntry() {
          return this._removeEntry(await this._queueDb.getFirstEntryByQueueName(this._queueName));
        }
        async getAll() {
          return await this._queueDb.getAllEntriesByQueueName(this._queueName);
        }
        async size() {
          return await this._queueDb.getEntryCountByQueueName(this._queueName);
        }
        async deleteEntry(e) {
          await this._queueDb.deleteEntry(e);
        }
        async _removeEntry(e) {
          return (e && (await this.deleteEntry(e.id)), e);
        }
      };
    let W = [
      'method',
      'referrer',
      'referrerPolicy',
      'mode',
      'credentials',
      'cache',
      'redirect',
      'integrity',
      'keepalive',
    ];
    var j = class e {
      _requestData;
      static async fromRequest(t) {
        let a = { url: t.url, headers: {} };
        for (let e of ('GET' !== t.method && (a.body = await t.clone().arrayBuffer()),
        t.headers.forEach((e, t) => {
          a.headers[t] = e;
        }),
        W))
          void 0 !== t[e] && (a[e] = t[e]);
        return new e(a);
      }
      constructor(e) {
        ('navigate' === e.mode && (e.mode = 'same-origin'), (this._requestData = e));
      }
      toObject() {
        let e = Object.assign({}, this._requestData);
        return (
          (e.headers = Object.assign({}, this._requestData.headers)),
          e.body && (e.body = e.body.slice(0)),
          e
        );
      }
      toRequest() {
        return new Request(this._requestData.url, this._requestData);
      }
      clone() {
        return new e(this.toObject());
      }
    };
    let H = 'serwist-background-sync',
      $ = new Set(),
      G = (e) => {
        let t = { request: new j(e.requestData).toRequest(), timestamp: e.timestamp };
        return (e.metadata && (t.metadata = e.metadata), t);
      };
    var Q = class {
        _name;
        _onSync;
        _maxRetentionTime;
        _queueStore;
        _forceSyncFallback;
        _syncInProgress = !1;
        _requestsAddedDuringSync = !1;
        constructor(e, { forceSyncFallback: t, onSync: a, maxRetentionTime: s } = {}) {
          if ($.has(e)) throw new o('duplicate-queue-name', { name: e });
          ($.add(e),
            (this._name = e),
            (this._onSync = a || this.replayRequests),
            (this._maxRetentionTime = s || 10080),
            (this._forceSyncFallback = !!t),
            (this._queueStore = new O(this._name)),
            this._addSyncListener());
        }
        get name() {
          return this._name;
        }
        async pushRequest(e) {
          await this._addRequest(e, 'push');
        }
        async unshiftRequest(e) {
          await this._addRequest(e, 'unshift');
        }
        async popRequest() {
          return this._removeRequest('pop');
        }
        async shiftRequest() {
          return this._removeRequest('shift');
        }
        async getAll() {
          let e = await this._queueStore.getAll(),
            t = Date.now(),
            a = [];
          for (let s of e) {
            let e = 60 * this._maxRetentionTime * 1e3;
            t - s.timestamp > e ? await this._queueStore.deleteEntry(s.id) : a.push(G(s));
          }
          return a;
        }
        async size() {
          return await this._queueStore.size();
        }
        async _addRequest({ request: e, metadata: t, timestamp: a = Date.now() }, s) {
          let r = { requestData: (await j.fromRequest(e.clone())).toObject(), timestamp: a };
          switch ((t && (r.metadata = t), s)) {
            case 'push':
              await this._queueStore.pushEntry(r);
              break;
            case 'unshift':
              await this._queueStore.unshiftEntry(r);
          }
          this._syncInProgress ? (this._requestsAddedDuringSync = !0) : await this.registerSync();
        }
        async _removeRequest(e) {
          let t,
            a = Date.now();
          switch (e) {
            case 'pop':
              t = await this._queueStore.popEntry();
              break;
            case 'shift':
              t = await this._queueStore.shiftEntry();
          }
          if (t) {
            let s = 60 * this._maxRetentionTime * 1e3;
            return a - t.timestamp > s ? this._removeRequest(e) : G(t);
          }
        }
        async replayRequests() {
          let e;
          for (; (e = await this.shiftRequest());)
            try {
              await fetch(e.request.clone());
            } catch {
              throw (
                await this.unshiftRequest(e),
                new o('queue-replay-failed', { name: this._name })
              );
            }
        }
        async registerSync() {
          if ('sync' in self.registration && !this._forceSyncFallback)
            try {
              await self.registration.sync.register(`${H}:${this._name}`);
            } catch (e) {}
        }
        _addSyncListener() {
          'sync' in self.registration && !this._forceSyncFallback
            ? self.addEventListener('sync', (e) => {
                if (e.tag === `${H}:${this._name}`) {
                  let t = async () => {
                    let t;
                    this._syncInProgress = !0;
                    try {
                      await this._onSync({ queue: this });
                    } catch (e) {
                      if (e instanceof Error) throw e;
                    } finally {
                      (this._requestsAddedDuringSync &&
                        !(t && !e.lastChance) &&
                        (await this.registerSync()),
                        (this._syncInProgress = !1),
                        (this._requestsAddedDuringSync = !1));
                    }
                  };
                  e.waitUntil(t());
                }
              })
            : this._onSync({ queue: this });
        }
        static get _queueNames() {
          return $;
        }
      },
      V = class {
        _queue;
        constructor(e, t) {
          this._queue = new Q(e, t);
        }
        async fetchDidFail({ request: e }) {
          await this._queue.pushRequest({ request: e });
        }
      };
    let z = {
      cacheWillUpdate: async ({ response: e }) => (200 === e.status || 0 === e.status ? e : null),
    };
    function J(e) {
      return 'string' == typeof e ? new Request(e) : e;
    }
    var X = class {
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
          (this._handlerDeferred = new m()),
          (this._extendLifetimePromises = []),
          (this._plugins = [...e.plugins]),
          (this._pluginStateMap = new Map()),
          this._plugins))
            this._pluginStateMap.set(a, {});
          this.event.waitUntil(this._handlerDeferred.promise);
        }
        async fetch(e) {
          let { event: t } = this,
            a = J(e),
            s = await this.getPreloadResponse();
          if (s) return s;
          let r = this.hasCallback('fetchDidFail') ? a.clone() : null;
          try {
            for (let e of this.iterateCallbacks('requestWillFetch'))
              a = await e({ request: a.clone(), event: t });
          } catch (e) {
            if (e instanceof Error)
              throw new o('plugin-error-request-will-fetch', { thrownErrorMessage: e.message });
          }
          let n = a.clone();
          try {
            let e;
            for (let s of ((e = await fetch(
              a,
              'navigate' === a.mode ? void 0 : this._strategy.fetchOptions
            )),
            this.iterateCallbacks('fetchDidSucceed')))
              e = await s({ event: t, request: n, response: e });
            return e;
          } catch (e) {
            throw (
              r &&
                (await this.runCallbacks('fetchDidFail', {
                  error: e,
                  event: t,
                  originalRequest: r.clone(),
                  request: n.clone(),
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
            a = J(e),
            { cacheName: s, matchOptions: r } = this._strategy,
            n = await this.getCacheKey(a, 'read'),
            i = { ...r, cacheName: s };
          for (let e of ((t = await caches.match(n, i)),
          this.iterateCallbacks('cachedResponseWillBeUsed')))
            t =
              (await e({
                cacheName: s,
                matchOptions: r,
                cachedResponse: t,
                request: n,
                event: this.event,
              })) || void 0;
          return t;
        }
        async cachePut(e, t) {
          let a = J(e);
          await l(0);
          let s = await this.getCacheKey(a, 'write');
          if (!t)
            throw new o('cache-put-with-no-response', {
              url: new URL(String(s.url), location.href).href.replace(
                RegExp(`^${location.origin}`),
                ''
              ),
            });
          let r = await this._ensureResponseSafeToCache(t);
          if (!r) return !1;
          let { cacheName: n, matchOptions: i } = this._strategy,
            c = await self.caches.open(n),
            h = this.hasCallback('cacheDidUpdate'),
            u = h ? await d(c, s.clone(), ['__WB_REVISION__'], i) : null;
          try {
            await c.put(s, h ? r.clone() : r);
          } catch (e) {
            if (e instanceof Error) throw ('QuotaExceededError' === e.name && (await f()), e);
          }
          for (let e of this.iterateCallbacks('cacheDidUpdate'))
            await e({
              cacheName: n,
              oldResponse: u,
              newResponse: r.clone(),
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
              s = J(await e({ mode: t, request: s, event: this.event, params: this.params }));
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
                  let r = { ...s, state: a };
                  return t[e](r);
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
      Y = class {
        cacheName;
        plugins;
        fetchOptions;
        matchOptions;
        constructor(e = {}) {
          ((this.cacheName = c.getRuntimeName(e.cacheName)),
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
            s = new X(
              this,
              e.url
                ? { event: t, request: a, url: e.url, params: e.params }
                : { event: t, request: a }
            ),
            r = this._getResponse(s, a, t);
          return [r, this._awaitComplete(r, s, a, t)];
        }
        async _getResponse(e, t, a) {
          let s;
          await e.runCallbacks('handlerWillStart', { event: a, request: t });
          try {
            if (((s = await this._handle(t, e)), void 0 === s || 'error' === s.type))
              throw new o('no-response', { url: t.url });
          } catch (r) {
            if (r instanceof Error) {
              for (let n of e.iterateCallbacks('handlerDidError'))
                if (void 0 !== (s = await n({ error: r, event: a, request: t }))) break;
            }
            if (!s) throw r;
          }
          for (let r of e.iterateCallbacks('handlerWillRespond'))
            s = await r({ event: a, request: t, response: s });
          return s;
        }
        async _awaitComplete(e, t, a, s) {
          let r, n;
          try {
            r = await e;
          } catch {}
          try {
            (await t.runCallbacks('handlerDidRespond', { event: s, request: a, response: r }),
              await t.doneWaiting());
          } catch (e) {
            e instanceof Error && (n = e);
          }
          if (
            (await t.runCallbacks('handlerDidComplete', {
              event: s,
              request: a,
              response: r,
              error: n,
            }),
            t.destroy(),
            n)
          )
            throw n;
        }
      },
      Z = class extends Y {
        _networkTimeoutSeconds;
        constructor(e = {}) {
          (super(e),
            this.plugins.some((e) => 'cacheWillUpdate' in e) || this.plugins.unshift(z),
            (this._networkTimeoutSeconds = e.networkTimeoutSeconds || 0));
        }
        async _handle(e, t) {
          let a,
            s = [],
            r = [];
          if (this._networkTimeoutSeconds) {
            let { id: n, promise: i } = this._getTimeoutPromise({
              request: e,
              logs: s,
              handler: t,
            });
            ((a = n), r.push(i));
          }
          let n = this._getNetworkPromise({ timeoutId: a, request: e, logs: s, handler: t });
          r.push(n);
          let i = await t.waitUntil(
            (async () => (await t.waitUntil(Promise.race(r))) || (await n))()
          );
          if (!i) throw new o('no-response', { url: e.url });
          return i;
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
          let r, n;
          try {
            n = await s.fetchAndCachePut(t);
          } catch (e) {
            e instanceof Error && (r = e);
          }
          return (e && clearTimeout(e), (r || !n) && (n = await s.cacheMatch(t)), n);
        }
      },
      ee = class extends Y {
        _networkTimeoutSeconds;
        constructor(e = {}) {
          (super(e), (this._networkTimeoutSeconds = e.networkTimeoutSeconds || 0));
        }
        async _handle(e, t) {
          let a, s;
          try {
            let a = [t.fetch(e)];
            if (this._networkTimeoutSeconds) {
              let e = l(1e3 * this._networkTimeoutSeconds);
              a.push(e);
            }
            if (!(s = await Promise.race(a)))
              throw Error(
                `Timed out the network response after ${this._networkTimeoutSeconds} seconds.`
              );
          } catch (e) {
            e instanceof Error && (a = e);
          }
          if (!s) throw new o('no-response', { url: e.url, error: a });
          return s;
        }
      };
    let et = (e) => (e && 'object' == typeof e ? e : { handle: e });
    var ea = class {
        handler;
        match;
        method;
        catchHandler;
        constructor(e, t, a = 'GET') {
          ((this.handler = et(t)), (this.match = e), (this.method = a));
        }
        setCatchHandler(e) {
          this.catchHandler = et(e);
        }
      },
      es = class e extends Y {
        _fallbackToNetwork;
        static defaultPrecacheCacheabilityPlugin = {
          cacheWillUpdate: async ({ response: e }) => (!e || e.status >= 400 ? null : e),
        };
        static copyRedirectedCacheableResponsesPlugin = {
          cacheWillUpdate: async ({ response: e }) => (e.redirected ? await F(e) : e),
        };
        constructor(t = {}) {
          ((t.cacheName = c.getPrecacheName(t.cacheName)),
            super(t),
            (this._fallbackToNetwork = !1 !== t.fallbackToNetwork),
            this.plugins.push(e.copyRedirectedCacheableResponsesPlugin));
        }
        async _handle(e, t) {
          let a = await t.getPreloadResponse();
          if (a) return a;
          let s = await t.cacheMatch(e);
          return (
            s ||
            (t.event && 'install' === t.event.type
              ? await this._handleInstall(e, t)
              : await this._handleFetch(e, t))
          );
        }
        async _handleFetch(e, t) {
          let a,
            s = t.params || {};
          if (this._fallbackToNetwork) {
            let r = s.integrity,
              n = e.integrity,
              i = !n || n === r;
            ((a = await t.fetch(
              new Request(e, { integrity: 'no-cors' !== e.mode ? n || r : void 0 })
            )),
              r &&
                i &&
                'no-cors' !== e.mode &&
                (this._useDefaultCacheabilityPluginIfNeeded(), await t.cachePut(e, a.clone())));
          } else throw new o('missing-precache-entry', { cacheName: this.cacheName, url: e.url });
          return a;
        }
        async _handleInstall(e, t) {
          this._useDefaultCacheabilityPluginIfNeeded();
          let a = await t.fetch(e);
          if (!(await t.cachePut(e, a.clone())))
            throw new o('bad-precaching-response', { url: e.url, status: a.status });
          return a;
        }
        _useDefaultCacheabilityPluginIfNeeded() {
          let t = null,
            a = 0;
          for (let [s, r] of this.plugins.entries())
            r !== e.copyRedirectedCacheableResponsesPlugin &&
              (r === e.defaultPrecacheCacheabilityPlugin && (t = s), r.cacheWillUpdate && a++);
          0 === a
            ? this.plugins.push(e.defaultPrecacheCacheabilityPlugin)
            : a > 1 && null !== t && this.plugins.splice(t, 1);
        }
      },
      er = class extends ea {
        _allowlist;
        _denylist;
        constructor(e, { allowlist: t = [/./], denylist: a = [] } = {}) {
          (super((e) => this._match(e), e), (this._allowlist = t), (this._denylist = a));
        }
        _match({ url: e, request: t }) {
          if (t && 'navigate' !== t.mode) return !1;
          let a = e.pathname + e.search;
          for (let e of this._denylist) if (e.test(a)) return !1;
          return !!this._allowlist.some((e) => e.test(a));
        }
      };
    function* en(
      e,
      {
        directoryIndex: t = 'index.html',
        ignoreURLParametersMatching: a = [/^utm_/, /^fbclid$/],
        cleanURLs: s = !0,
        urlManipulation: r,
      } = {}
    ) {
      let n = new URL(e, location.href);
      ((n.hash = ''), yield n.href);
      let i = ((e, t = []) => {
        for (let a of [...e.searchParams.keys()])
          t.some((e) => e.test(a)) && e.searchParams.delete(a);
        return e;
      })(n, a);
      if ((yield i.href, t && i.pathname.endsWith('/'))) {
        let e = new URL(i.href);
        ((e.pathname += t), yield e.href);
      }
      if (s) {
        let e = new URL(i.href);
        ((e.pathname += '.html'), yield e.href);
      }
      if (r) for (let e of r({ url: n })) yield e.href;
    }
    var ei = class extends ea {
      constructor(e, t, a) {
        super(
          ({ url: t }) => {
            let a = e.exec(t.href);
            if (a) return t.origin !== location.origin && 0 !== a.index ? void 0 : a.slice(1);
          },
          t,
          a
        );
      }
    };
    let ec = (e) => {
      if (!e) throw new o('add-to-cache-list-unexpected-type', { entry: e });
      if ('string' == typeof e) {
        let t = new URL(e, location.href);
        return { cacheKey: t.href, url: t.href };
      }
      let { revision: t, url: a } = e;
      if (!a) throw new o('add-to-cache-list-unexpected-type', { entry: e });
      if (!t) {
        let e = new URL(a, location.href);
        return { cacheKey: e.href, url: e.href };
      }
      let s = new URL(a, location.href),
        r = new URL(a, location.href);
      return (s.searchParams.set('__WB_REVISION__', t), { cacheKey: s.href, url: r.href });
    };
    var eo = class {
      updatedURLs = [];
      notUpdatedURLs = [];
      handlerWillStart = async ({ request: e, state: t }) => {
        t && (t.originalRequest = e);
      };
      cachedResponseWillBeUsed = async ({ event: e, state: t, cachedResponse: a }) => {
        if ('install' === e.type && t?.originalRequest && t.originalRequest instanceof Request) {
          let e = t.originalRequest.url;
          a ? this.notUpdatedURLs.push(e) : this.updatedURLs.push(e);
        }
        return a;
      };
    };
    'undefined' != typeof navigator && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    let el = 'cache-entries',
      eh = (e) => {
        let t = new URL(e, location.href);
        return ((t.hash = ''), t.href);
      };
    var eu = class {
        _cacheName;
        _db = null;
        constructor(e) {
          this._cacheName = e;
        }
        _getId(e) {
          return `${this._cacheName}|${eh(e)}`;
        }
        _upgradeDb(e) {
          let t = e.createObjectStore(el, { keyPath: 'id' });
          (t.createIndex('cacheName', 'cacheName', { unique: !1 }),
            t.createIndex('timestamp', 'timestamp', { unique: !1 }));
        }
        _upgradeDbAndDeleteOldDbs(e) {
          (this._upgradeDb(e),
            this._cacheName &&
              (function (e, { blocked: t } = {}) {
                let a = indexedDB.deleteDatabase(e);
                (t && a.addEventListener('blocked', (e) => t(e.oldVersion, e)),
                  E(a).then(() => void 0));
              })(this._cacheName));
        }
        async setTimestamp(e, t) {
          e = eh(e);
          let a = { id: this._getId(e), cacheName: this._cacheName, url: e, timestamp: t },
            s = (await this.getDb()).transaction(el, 'readwrite', { durability: 'relaxed' });
          (await s.store.put(a), await s.done);
        }
        async getTimestamp(e) {
          return (await (await this.getDb()).get(el, this._getId(e)))?.timestamp;
        }
        async expireEntries(e, t) {
          let a = await (
              await this.getDb()
            )
              .transaction(el, 'readwrite')
              .store.index('timestamp')
              .openCursor(null, 'prev'),
            s = [],
            r = 0;
          for (; a;) {
            let n = a.value;
            (n.cacheName === this._cacheName &&
              ((e && n.timestamp < e) || (t && r >= t) ? (a.delete(), s.push(n.url)) : r++),
              (a = await a.continue()));
          }
          return s;
        }
        async getDb() {
          return (
            this._db ||
              (this._db = await q('serwist-expiration', 1, {
                upgrade: this._upgradeDbAndDeleteOldDbs.bind(this),
              })),
            this._db
          );
        }
      },
      ed = class {
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
            (this._timestampModel = new eu(e)));
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
      em = class {
        _config;
        _cacheExpirations;
        constructor(e = {}) {
          var t;
          ((this._config = e),
            (this._cacheExpirations = new Map()),
            this._config.maxAgeFrom || (this._config.maxAgeFrom = 'last-fetched'),
            this._config.purgeOnQuotaError &&
              ((t = () => this.deleteCacheAndMetadata()), h.add(t)));
        }
        _getCacheExpiration(e) {
          if (e === c.getRuntimeName()) throw new o('expire-custom-caches-only');
          let t = this._cacheExpirations.get(e);
          return (t || ((t = new ed(e, this._config)), this._cacheExpirations.set(e, t)), t);
        }
        cachedResponseWillBeUsed({ event: e, cacheName: t, request: a, cachedResponse: s }) {
          if (!s) return null;
          let r = this._isResponseDateFresh(s),
            n = this._getCacheExpiration(t),
            i = 'last-used' === this._config.maxAgeFrom,
            c = (async () => {
              (i && (await n.updateTimestamp(a.url)), await n.expireEntries());
            })();
          try {
            e.waitUntil(c);
          } catch {}
          return r ? s : null;
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
    let ef = async (e, t) => {
      try {
        if (206 === t.status) return t;
        let a = e.headers.get('range');
        if (!a) throw new o('no-range-header');
        let s = ((e) => {
            let t = e.trim().toLowerCase();
            if (!t.startsWith('bytes='))
              throw new o('unit-must-be-bytes', { normalizedRangeHeader: t });
            if (t.includes(',')) throw new o('single-range-only', { normalizedRangeHeader: t });
            let a = /(\d*)-(\d*)/.exec(t);
            if (!a || !(a[1] || a[2]))
              throw new o('invalid-range-values', { normalizedRangeHeader: t });
            return {
              start: '' === a[1] ? void 0 : Number(a[1]),
              end: '' === a[2] ? void 0 : Number(a[2]),
            };
          })(a),
          r = await t.blob(),
          n = ((e, t, a) => {
            let s,
              r,
              n = e.size;
            if ((a && a > n) || (t && t < 0))
              throw new o('range-not-satisfiable', { size: n, end: a, start: t });
            return (
              void 0 !== t && void 0 !== a
                ? ((s = t), (r = a + 1))
                : void 0 !== t && void 0 === a
                  ? ((s = t), (r = n))
                  : void 0 !== a && void 0 === t && ((s = n - a), (r = n)),
              { start: s, end: r }
            );
          })(r, s.start, s.end),
          i = r.slice(n.start, n.end),
          c = i.size,
          l = new Response(i, { status: 206, statusText: 'Partial Content', headers: t.headers });
        return (
          l.headers.set('Content-Length', String(c)),
          l.headers.set('Content-Range', `bytes ${n.start}-${n.end - 1}/${r.size}`),
          l
        );
      } catch (e) {
        return new Response('', { status: 416, statusText: 'Range Not Satisfiable' });
      }
    };
    var eg = class {
        cachedResponseWillBeUsed = async ({ request: e, cachedResponse: t }) =>
          t && e.headers.has('range') ? await ef(e, t) : t;
      },
      ew = class extends Y {
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
          if (!s) throw new o('no-response', { url: e.url, error: a });
          return s;
        }
      },
      ep = class extends Y {
        constructor(e = {}) {
          (super(e), this.plugins.some((e) => 'cacheWillUpdate' in e) || this.plugins.unshift(z));
        }
        async _handle(e, t) {
          let a,
            s = t.fetchAndCachePut(e).catch(() => {});
          t.waitUntil(s);
          let r = await t.cacheMatch(e);
          if (r);
          else
            try {
              r = await s;
            } catch (e) {
              e instanceof Error && (a = e);
            }
          if (!r) throw new o('no-response', { url: e.url, error: a });
          return r;
        }
      };
    let ey = { rscPrefetch: 'pages-rsc-prefetch', rsc: 'pages-rsc', html: 'pages' },
      e_ = [
        {
          matcher: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
          handler: new ew({
            cacheName: 'google-fonts-webfonts',
            plugins: [new em({ maxEntries: 4, maxAgeSeconds: 31536e3, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
          handler: new ep({
            cacheName: 'google-fonts-stylesheets',
            plugins: [new em({ maxEntries: 4, maxAgeSeconds: 604800, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
          handler: new ep({
            cacheName: 'static-font-assets',
            plugins: [new em({ maxEntries: 4, maxAgeSeconds: 604800, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
          handler: new ep({
            cacheName: 'static-image-assets',
            plugins: [new em({ maxEntries: 64, maxAgeSeconds: 2592e3, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /\/_next\/static.+\.js$/i,
          handler: new ew({
            cacheName: 'next-static-js-assets',
            plugins: [new em({ maxEntries: 64, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /\/_next\/image\?url=.+$/i,
          handler: new ep({
            cacheName: 'next-image',
            plugins: [new em({ maxEntries: 64, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /\.(?:mp3|wav|ogg)$/i,
          handler: new ew({
            cacheName: 'static-audio-assets',
            plugins: [
              new em({ maxEntries: 32, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' }),
              new eg(),
            ],
          }),
        },
        {
          matcher: /\.(?:mp4|webm)$/i,
          handler: new ew({
            cacheName: 'static-video-assets',
            plugins: [
              new em({ maxEntries: 32, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' }),
              new eg(),
            ],
          }),
        },
        {
          matcher: /\.(?:js)$/i,
          handler: new ep({
            cacheName: 'static-js-assets',
            plugins: [new em({ maxEntries: 48, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /\.(?:css|less)$/i,
          handler: new ep({
            cacheName: 'static-style-assets',
            plugins: [new em({ maxEntries: 32, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /\/_next\/data\/.+\/.+\.json$/i,
          handler: new Z({
            cacheName: 'next-data',
            plugins: [new em({ maxEntries: 32, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' })],
          }),
        },
        {
          matcher: /\.(?:json|xml|csv)$/i,
          handler: new Z({
            cacheName: 'static-data-assets',
            plugins: [new em({ maxEntries: 32, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' })],
          }),
        },
        { matcher: /\/api\/auth\/.*/, handler: new ee({ networkTimeoutSeconds: 10 }) },
        {
          matcher: ({ sameOrigin: e, url: { pathname: t } }) => e && t.startsWith('/api/'),
          method: 'GET',
          handler: new Z({
            cacheName: 'apis',
            plugins: [new em({ maxEntries: 16, maxAgeSeconds: 86400, maxAgeFrom: 'last-used' })],
            networkTimeoutSeconds: 10,
          }),
        },
        {
          matcher: ({ request: e, url: { pathname: t }, sameOrigin: a }) =>
            '1' === e.headers.get('RSC') &&
            '1' === e.headers.get('Next-Router-Prefetch') &&
            a &&
            !t.startsWith('/api/'),
          handler: new Z({
            cacheName: ey.rscPrefetch,
            plugins: [new em({ maxEntries: 32, maxAgeSeconds: 86400 })],
          }),
        },
        {
          matcher: ({ request: e, url: { pathname: t }, sameOrigin: a }) =>
            '1' === e.headers.get('RSC') && a && !t.startsWith('/api/'),
          handler: new Z({
            cacheName: ey.rsc,
            plugins: [new em({ maxEntries: 32, maxAgeSeconds: 86400 })],
          }),
        },
        {
          matcher: ({ request: e, url: { pathname: t }, sameOrigin: a }) =>
            e.headers.get('Content-Type')?.includes('text/html') && a && !t.startsWith('/api/'),
          handler: new Z({
            cacheName: ey.html,
            plugins: [new em({ maxEntries: 32, maxAgeSeconds: 86400 })],
          }),
        },
        {
          matcher: ({ url: { pathname: e }, sameOrigin: t }) => t && !e.startsWith('/api/'),
          handler: new Z({
            cacheName: 'others',
            plugins: [new em({ maxEntries: 32, maxAgeSeconds: 86400 })],
          }),
        },
        {
          matcher: ({ sameOrigin: e }) => !e,
          handler: new Z({
            cacheName: 'cross-origin',
            plugins: [new em({ maxEntries: 32, maxAgeSeconds: 3600 })],
            networkTimeoutSeconds: 10,
          }),
        },
        { matcher: /.*/i, method: 'GET', handler: new ee() },
      ],
      eb = async (e, t, a) => {
        let s = t.map((e, t) => ({ index: t, item: e })),
          r = async (e) => {
            let t = [];
            for (;;) {
              let r = s.pop();
              if (!r) return e(t);
              let n = await a(r.item);
              t.push({ result: n, index: r.index });
            }
          },
          n = Array.from({ length: e }, () => new Promise(r));
        return (await Promise.all(n))
          .flat()
          .sort((e, t) => (e.index < t.index ? -1 : 1))
          .map((e) => e.result);
      };
    var ex = class {
        _precacheController;
        constructor({ precacheController: e }) {
          this._precacheController = e;
        }
        cacheKeyWillBeUsed = async ({ request: e, params: t }) => {
          let a = t?.cacheKey || this._precacheController.getCacheKeyForURL(e.url);
          return a ? new Request(a, { headers: e.headers }) : e;
        };
      },
      ev = class {
        _installAndActiveListenersAdded;
        _concurrentPrecaching;
        _strategy;
        _urlsToCacheKeys = new Map();
        _urlsToCacheModes = new Map();
        _cacheKeysToIntegrities = new Map();
        constructor({
          cacheName: e,
          plugins: t = [],
          fallbackToNetwork: a = !0,
          concurrentPrecaching: s = 1,
        } = {}) {
          ((this._concurrentPrecaching = s),
            (this._strategy = new es({
              cacheName: c.getPrecacheName(e),
              plugins: [...t, new ex({ precacheController: this })],
              fallbackToNetwork: a,
            })),
            (this.install = this.install.bind(this)),
            (this.activate = this.activate.bind(this)));
        }
        get strategy() {
          return this._strategy;
        }
        precache(e) {
          (this.addToCacheList(e),
            this._installAndActiveListenersAdded ||
              (self.addEventListener('install', this.install),
              self.addEventListener('activate', this.activate),
              (this._installAndActiveListenersAdded = !0)));
        }
        addToCacheList(e) {
          let t = [];
          for (let a of e) {
            'string' == typeof a
              ? t.push(a)
              : a && !a.integrity && void 0 === a.revision && t.push(a.url);
            let { cacheKey: e, url: s } = ec(a),
              r = 'string' != typeof a && a.revision ? 'reload' : 'default';
            if (this._urlsToCacheKeys.has(s) && this._urlsToCacheKeys.get(s) !== e)
              throw new o('add-to-cache-list-conflicting-entries', {
                firstEntry: this._urlsToCacheKeys.get(s),
                secondEntry: e,
              });
            if ('string' != typeof a && a.integrity) {
              if (
                this._cacheKeysToIntegrities.has(e) &&
                this._cacheKeysToIntegrities.get(e) !== a.integrity
              )
                throw new o('add-to-cache-list-conflicting-integrities', { url: s });
              this._cacheKeysToIntegrities.set(e, a.integrity);
            }
            (this._urlsToCacheKeys.set(s, e),
              this._urlsToCacheModes.set(s, r),
              t.length > 0 &&
                console.warn(`Serwist is precaching URLs without revision info: ${t.join(', ')}
This is generally NOT safe. Learn more at https://bit.ly/wb-precache`));
          }
        }
        install(e) {
          return p(e, async () => {
            let t = new eo();
            (this.strategy.plugins.push(t),
              await eb(
                this._concurrentPrecaching,
                Array.from(this._urlsToCacheKeys.entries()),
                async ([t, a]) => {
                  let s = this._cacheKeysToIntegrities.get(a),
                    r = this._urlsToCacheModes.get(t),
                    n = new Request(t, { integrity: s, cache: r, credentials: 'same-origin' });
                  await Promise.all(
                    this.strategy.handleAll({
                      event: e,
                      request: n,
                      url: new URL(n.url),
                      params: { cacheKey: a },
                    })
                  );
                }
              ));
            let { updatedURLs: a, notUpdatedURLs: s } = t;
            return { updatedURLs: a, notUpdatedURLs: s };
          });
        }
        activate(e) {
          return p(e, async () => {
            let e = await self.caches.open(this.strategy.cacheName),
              t = await e.keys(),
              a = new Set(this._urlsToCacheKeys.values()),
              s = [];
            for (let r of t) a.has(r.url) || (await e.delete(r), s.push(r.url));
            return { deletedCacheRequests: s };
          });
        }
        getURLsToCacheKeys() {
          return this._urlsToCacheKeys;
        }
        getCachedURLs() {
          return [...this._urlsToCacheKeys.keys()];
        }
        getCacheKeyForURL(e) {
          let t = new URL(e, location.href);
          return this._urlsToCacheKeys.get(t.href);
        }
        getIntegrityForCacheKey(e) {
          return this._cacheKeysToIntegrities.get(e);
        }
        async matchPrecache(e) {
          let t = e instanceof Request ? e.url : e,
            a = this.getCacheKeyForURL(t);
          if (a) return (await self.caches.open(this.strategy.cacheName)).match(a);
        }
        createHandlerBoundToURL(e) {
          let t = this.getCacheKeyForURL(e);
          if (!t) throw new o('non-precached-url', { url: e });
          return (a) => (
            (a.request = new Request(e)),
            (a.params = { cacheKey: t, ...a.params }),
            this.strategy.handle(a)
          );
        }
      };
    let eE = () => (s || (s = new ev()), s);
    var eR = class extends ea {
        constructor(e, t) {
          super(({ request: a }) => {
            let s = e.getURLsToCacheKeys();
            for (let r of en(a.url, t)) {
              let t = s.get(r);
              if (t) return { cacheKey: t, integrity: e.getIntegrityForCacheKey(t) };
            }
          }, e.strategy);
        }
      },
      eq = class {
        _routes;
        _defaultHandlerMap;
        _fetchListenerHandler = null;
        _cacheListenerHandler = null;
        _catchHandler;
        constructor() {
          ((this._routes = new Map()), (this._defaultHandlerMap = new Map()));
        }
        get routes() {
          return this._routes;
        }
        addFetchListener() {
          this._fetchListenerHandler ||
            ((this._fetchListenerHandler = (e) => {
              let { request: t } = e,
                a = this.handleRequest({ request: t, event: e });
              a && e.respondWith(a);
            }),
            self.addEventListener('fetch', this._fetchListenerHandler));
        }
        removeFetchListener() {
          this._fetchListenerHandler &&
            (self.removeEventListener('fetch', this._fetchListenerHandler),
            (this._fetchListenerHandler = null));
        }
        addCacheListener() {
          this._cacheListenerHandler ||
            ((this._cacheListenerHandler = (e) => {
              if (e.data && 'CACHE_URLS' === e.data.type) {
                let { payload: t } = e.data,
                  a = Promise.all(
                    t.urlsToCache.map((t) => {
                      'string' == typeof t && (t = [t]);
                      let a = new Request(...t);
                      return this.handleRequest({ request: a, event: e });
                    })
                  );
                (e.waitUntil(a), e.ports?.[0] && a.then(() => e.ports[0].postMessage(!0)));
              }
            }),
            self.addEventListener('message', this._cacheListenerHandler));
        }
        removeCacheListener() {
          this._cacheListenerHandler &&
            self.removeEventListener('message', this._cacheListenerHandler);
        }
        handleRequest({ request: e, event: t }) {
          let a,
            s = new URL(e.url, location.href);
          if (!s.protocol.startsWith('http')) return;
          let r = s.origin === location.origin,
            { params: n, route: i } = this.findMatchingRoute({
              event: t,
              request: e,
              sameOrigin: r,
              url: s,
            }),
            c = i?.handler,
            o = e.method;
          if ((!c && this._defaultHandlerMap.has(o) && (c = this._defaultHandlerMap.get(o)), !c))
            return;
          try {
            a = c.handle({ url: s, request: e, event: t, params: n });
          } catch (e) {
            a = Promise.reject(e);
          }
          let l = i?.catchHandler;
          return (
            a instanceof Promise &&
              (this._catchHandler || l) &&
              (a = a.catch(async (a) => {
                if (l)
                  try {
                    return await l.handle({ url: s, request: e, event: t, params: n });
                  } catch (e) {
                    e instanceof Error && (a = e);
                  }
                if (this._catchHandler)
                  return this._catchHandler.handle({ url: s, request: e, event: t });
                throw a;
              })),
            a
          );
        }
        findMatchingRoute({ url: e, sameOrigin: t, request: a, event: s }) {
          for (let r of this._routes.get(a.method) || []) {
            let n,
              i = r.match({ url: e, sameOrigin: t, request: a, event: s });
            if (i)
              return (
                (Array.isArray((n = i)) && 0 === n.length) ||
                (i.constructor === Object && 0 === Object.keys(i).length)
                  ? (n = void 0)
                  : 'boolean' == typeof i && (n = void 0),
                { route: r, params: n }
              );
          }
          return {};
        }
        setDefaultHandler(e, t = 'GET') {
          this._defaultHandlerMap.set(t, et(e));
        }
        setCatchHandler(e) {
          this._catchHandler = et(e);
        }
        registerCapture(e, t, a) {
          let s = ((e, t, a) => {
            if ('string' == typeof e) {
              let s = new URL(e, location.href);
              return new ea(({ url: e }) => e.href === s.href, t, a);
            }
            if (e instanceof RegExp) return new ei(e, t, a);
            if ('function' == typeof e) return new ea(e, t, a);
            if (e instanceof ea) return e;
            throw new o('unsupported-route-type', {
              moduleName: 'serwist',
              funcName: 'parseRoute',
              paramName: 'capture',
            });
          })(e, t, a);
          return (this.registerRoute(s), s);
        }
        registerRoute(e) {
          (this._routes.has(e.method) || this._routes.set(e.method, []),
            this._routes.get(e.method).push(e));
        }
        unregisterRoute(e) {
          if (!this._routes.has(e.method))
            throw new o('unregister-route-but-not-found-with-method', { method: e.method });
          let t = this._routes.get(e.method).indexOf(e);
          if (t > -1) this._routes.get(e.method).splice(t, 1);
          else throw new o('unregister-route-route-not-registered');
        }
      };
    let eD = () => (r || ((r = new eq()).addFetchListener(), r.addCacheListener()), r),
      eS = (e, t, a) => eD().registerCapture(e, t, a);
    var eC = class {
      _fallbackUrls;
      _precacheController;
      constructor({ fallbackUrls: e, precacheController: t }) {
        ((this._fallbackUrls = e), (this._precacheController = t || eE()));
      }
      async handlerDidError(e) {
        for (let t of this._fallbackUrls)
          if ('string' == typeof t) {
            let e = await this._precacheController.matchPrecache(t);
            if (void 0 !== e) return e;
          } else if (t.matcher(e)) {
            let e = await this._precacheController.matchPrecache(t.url);
            if (void 0 !== e) return e;
          }
      }
    };
    let eN = /^\/(\w+\/)?collect/,
      eL = ({ router: e = eD(), cacheName: t, ...a } = {}) => {
        let s = c.getGoogleAnalyticsName(t),
          r = new V('serwist-google-analytics', {
            maxRetentionTime: 2880,
            onSync: (
              (e) =>
              async ({ queue: t }) => {
                let a;
                for (; (a = await t.shiftRequest());) {
                  let { request: s, timestamp: r } = a,
                    n = new URL(s.url);
                  try {
                    let t =
                        'POST' === s.method
                          ? new URLSearchParams(await s.clone().text())
                          : n.searchParams,
                      a = r - (Number(t.get('qt')) || 0),
                      i = Date.now() - a;
                    if ((t.set('qt', String(i)), e.parameterOverrides))
                      for (let a of Object.keys(e.parameterOverrides)) {
                        let s = e.parameterOverrides[a];
                        t.set(a, s);
                      }
                    ('function' == typeof e.hitFilter && e.hitFilter.call(null, t),
                      await fetch(
                        new Request(n.origin + n.pathname, {
                          body: t.toString(),
                          method: 'POST',
                          mode: 'cors',
                          credentials: 'omit',
                          headers: { 'Content-Type': 'text/plain' },
                        })
                      ));
                  } catch (e) {
                    throw (await t.unshiftRequest(a), e);
                  }
                }
              }
            )(a),
          });
        for (let t of [
          new ea(
            ({ url: e }) => 'www.googletagmanager.com' === e.hostname && '/gtm.js' === e.pathname,
            new Z({ cacheName: s }),
            'GET'
          ),
          new ea(
            ({ url: e }) =>
              'www.google-analytics.com' === e.hostname && '/analytics.js' === e.pathname,
            new Z({ cacheName: s }),
            'GET'
          ),
          new ea(
            ({ url: e }) => 'www.googletagmanager.com' === e.hostname && '/gtag/js' === e.pathname,
            new Z({ cacheName: s }),
            'GET'
          ),
          ...((e) => {
            let t = ({ url: e }) =>
                'www.google-analytics.com' === e.hostname && eN.test(e.pathname),
              a = new ee({ plugins: [e] });
            return [new ea(t, a, 'GET'), new ea(t, a, 'POST')];
          })(r),
        ])
          e.registerRoute(t);
      };
    ((({
      precacheController: e = eE(),
      router: t = eD(),
      precacheEntries: a,
      precacheOptions: s,
      cleanupOutdatedCaches: r,
      navigateFallback: n,
      navigateFallbackAllowlist: i,
      navigateFallbackDenylist: o,
      skipWaiting: l,
      importScripts: h,
      navigationPreload: u = !1,
      cacheId: d,
      clientsClaim: m = !1,
      runtimeCaching: f,
      offlineAnalyticsConfig: g,
      disableDevLogs: p = !1,
      fallbacks: y,
    }) => {
      (h && h.length > 0 && self.importScripts(...h),
        u &&
          self.registration?.navigationPreload &&
          self.addEventListener('activate', (e) => {
            e.waitUntil(self.registration.navigationPreload.enable().then(() => {}));
          }),
        void 0 !== d && c.updateDetails({ prefix: d }),
        l
          ? self.skipWaiting()
          : self.addEventListener('message', (e) => {
              e.data && 'SKIP_WAITING' === e.data.type && self.skipWaiting();
            }),
        m && self.addEventListener('activate', () => self.clients.claim()),
        (({
          precacheController: e = eE(),
          router: t = eD(),
          precacheEntries: a,
          precacheOptions: s,
          cleanupOutdatedCaches: r = !1,
          navigateFallback: n,
          navigateFallbackAllowlist: i,
          navigateFallbackDenylist: o,
        }) => {
          a &&
            a.length > 0 &&
            (e.precache(a),
            t.registerRoute(new eR(e, s)),
            r &&
              self.addEventListener('activate', (e) => {
                e.waitUntil(w(c.getPrecacheName(void 0)).then((e) => {}));
              }),
            n &&
              t.registerRoute(
                new er(eE().createHandlerBoundToURL(n), { allowlist: i, denylist: o })
              ));
        })({
          precacheController: e,
          router: t,
          precacheEntries: a,
          precacheOptions: s,
          cleanupOutdatedCaches: r,
          navigateFallback: n,
          navigateFallbackAllowlist: i,
          navigateFallbackDenylist: o,
        }),
        void 0 !== f &&
          (void 0 !== y &&
            (f = (({
              precacheController: e = eE(),
              router: t = eD(),
              runtimeCaching: a,
              entries: s,
              precacheOptions: r,
            }) => {
              (e.precache(s), t.registerRoute(new eR(e, r)));
              let n = new eC({ fallbackUrls: s });
              return (
                a.forEach((e) => {
                  e.handler instanceof Y &&
                    !e.handler.plugins.some((e) => 'handlerDidError' in e) &&
                    e.handler.plugins.push(n);
                }),
                a
              );
            })({
              precacheController: e,
              router: t,
              runtimeCaching: f,
              entries: y.entries,
              precacheOptions: s,
            })),
          ((...e) => {
            for (let t of e) eS(t.matcher, t.handler, t.method);
          })(...f)),
        void 0 !== g && ('boolean' == typeof g ? g && eL({ router: t }) : eL({ ...g, router: t })),
        p && (self.__WB_DISABLE_DEV_LOGS = !0));
    })({
      precacheEntries: [
        {
          revision: '32ecafa4bde94e424d9c45b02a572ba0',
          url: '/_next/static/Jz3j9siKrsS80J6ws9Y8L/_buildManifest.js',
        },
        {
          revision: 'b6652df95db52feb4daf4eca35380933',
          url: '/_next/static/Jz3j9siKrsS80J6ws9Y8L/_ssgManifest.js',
        },
        { revision: null, url: '/_next/static/chunks/1052-49b83c0b6bf34f44.js' },
        { revision: null, url: '/_next/static/chunks/1054.29c56c5e45d3ab0e.js' },
        { revision: null, url: '/_next/static/chunks/1356-e2a41a1484469085.js' },
        { revision: null, url: '/_next/static/chunks/1534-9a6ae26e45afb254.js' },
        { revision: null, url: '/_next/static/chunks/1567-bf7c76d1a420e54c.js' },
        { revision: null, url: '/_next/static/chunks/1618-6e6c21ac3f1d1410.js' },
        { revision: null, url: '/_next/static/chunks/1668.f76d182a3c88c2dc.js' },
        { revision: null, url: '/_next/static/chunks/1762-d7c5d69789699a1b.js' },
        { revision: null, url: '/_next/static/chunks/1a258343-12fc8ba8e962a11d.js' },
        { revision: null, url: '/_next/static/chunks/2003-ae5b35a8f11641fb.js' },
        { revision: null, url: '/_next/static/chunks/2073.bd5caff55f3ea361.js' },
        { revision: null, url: '/_next/static/chunks/2190-adbca6135791a6d0.js' },
        { revision: null, url: '/_next/static/chunks/2455-e770969809d253d0.js' },
        { revision: null, url: '/_next/static/chunks/2511-6ea71588f8227cde.js' },
        { revision: null, url: '/_next/static/chunks/2619-53e2725f35d73646.js' },
        { revision: null, url: '/_next/static/chunks/2638-5cde0cbe7fb6b64c.js' },
        { revision: null, url: '/_next/static/chunks/2777-69e413dc4bbdcb0f.js' },
        { revision: null, url: '/_next/static/chunks/3081-e60e996de9d5d0eb.js' },
        { revision: null, url: '/_next/static/chunks/3433-c2cc38aa16a91431.js' },
        { revision: null, url: '/_next/static/chunks/354-d495498a6489035d.js' },
        { revision: null, url: '/_next/static/chunks/3565-23867dfe66d769d6.js' },
        { revision: null, url: '/_next/static/chunks/3760-7236c267e3d1e6bb.js' },
        { revision: null, url: '/_next/static/chunks/4095-40ae85520e09404a.js' },
        { revision: null, url: '/_next/static/chunks/4127-dd2c537fdcb61707.js' },
        { revision: null, url: '/_next/static/chunks/4166-37a6fb47851eecb3.js' },
        { revision: null, url: '/_next/static/chunks/422-24412a19063ae29e.js' },
        { revision: null, url: '/_next/static/chunks/4493-58da93d67b45b052.js' },
        { revision: null, url: '/_next/static/chunks/4615-a36e4474dd4b04c4.js' },
        { revision: null, url: '/_next/static/chunks/4909-115465437705e4aa.js' },
        { revision: null, url: '/_next/static/chunks/4a7b0c69-c28b3c0d6d42b12c.js' },
        { revision: null, url: '/_next/static/chunks/4bd1b696-6746545dc22de232.js' },
        { revision: null, url: '/_next/static/chunks/5144-1916f0038c87a4f4.js' },
        { revision: null, url: '/_next/static/chunks/5208-c6f1d129659edb41.js' },
        { revision: null, url: '/_next/static/chunks/5381-bf8721830ab982fe.js' },
        { revision: null, url: '/_next/static/chunks/5453-04495c404f1d1e0d.js' },
        { revision: null, url: '/_next/static/chunks/5981-4839a933f3baf8dd.js' },
        { revision: null, url: '/_next/static/chunks/6093-f5874b4ddfb02315.js' },
        { revision: null, url: '/_next/static/chunks/6199-31f6ea90bd843642.js' },
        { revision: null, url: '/_next/static/chunks/6521-cab3ce7eb0ec7ad7.js' },
        { revision: null, url: '/_next/static/chunks/6630-76ba4bc6e02e3b95.js' },
        { revision: null, url: '/_next/static/chunks/6679-ee9480d6c756dd02.js' },
        { revision: null, url: '/_next/static/chunks/671-1e3739aecb41c0cb.js' },
        { revision: null, url: '/_next/static/chunks/6809-b2c5c5a3c6b0b9b7.js' },
        { revision: null, url: '/_next/static/chunks/7116-37becd4c0db2e4ed.js' },
        { revision: null, url: '/_next/static/chunks/7134-351b3c4a7c39fd7b.js' },
        { revision: null, url: '/_next/static/chunks/7681-9a83bd787f1aaf1c.js' },
        { revision: null, url: '/_next/static/chunks/7710-59d0d78de2266428.js' },
        { revision: null, url: '/_next/static/chunks/7899-1f508d200213c461.js' },
        { revision: null, url: '/_next/static/chunks/7945-9b8c3a1445934982.js' },
        { revision: null, url: '/_next/static/chunks/8769-dd20c4483a826d12.js' },
        { revision: null, url: '/_next/static/chunks/8775-e091ebd23d0eab3c.js' },
        { revision: null, url: '/_next/static/chunks/8861-15eb2bdb9ec2288b.js' },
        { revision: null, url: '/_next/static/chunks/8930-4df0720b5b19a49e.js' },
        { revision: null, url: '/_next/static/chunks/8971.e1d243d5eaceea12.js' },
        { revision: null, url: '/_next/static/chunks/8986.41e031cafb4f8e77.js' },
        { revision: null, url: '/_next/static/chunks/8b30ef62.2b25a563b88c9ae5.js' },
        { revision: null, url: '/_next/static/chunks/9009-681ac07ec38da28f.js' },
        { revision: null, url: '/_next/static/chunks/9175.5f823ffec8bc24ae.js' },
        { revision: null, url: '/_next/static/chunks/9985-fe91b447bc42101d.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/analytics/page-c88d3c0df7fb1cbe.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/bulk-import/page-7c53548c3f816574.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/challenges/%5Bid%5D/edit/page-c4edb05010ecf34a.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/co-pilot/page-66c24140deee9e47.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/error-ffe7309f19b92ff2.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/loading-06451aa20350e7ed.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/page-eda32f3366c4b56a.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/posts/%5Bid%5D/edit/page-079df204cfacd725.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/posts/%5Bid%5D/preview/page-3ef51d4b7c55a79e.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/akis/page-7680e521a1aa3ed8.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/arastirma/page-7cec3ec1e0920135.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/auth/callback/route-c7bc24566c6f9829.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/blog/%5Bslug%5D/page-8cccb10206ba78b9.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/blog/loading-8a6eda1e89539077.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/blog/page-1f4f716a63b14f63.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/bulten/%5Bslug%5D/page-b5c969093e892ed6.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/bulten/page-67031ec1200943b4.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/dashboard/error-909ec7f3661a092a.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/dashboard/loading-eb3be123d80da75d.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/dashboard/page-e06c9b81a3b2b828.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/developer/error-84781b3e6508cd5b.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/developer/loading-55e06e5c4c355a8b.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/developer/page-fd069ca862caa529.js',
        },
        { revision: null, url: '/_next/static/chunks/app/%5Blocale%5D/error-227dbe525bc2f3a2.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/eserler/edit/page-249a59e7ee718901.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/eserler/error-0e73cffa0c0d81e0.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/eserler/loading-0b4dd5f260ac1821.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/eserler/page-a0fad1ea5ee00e2a.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/feedback/page-ccc25d5a35a689d1.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/forgot-password/page-72fc5ce6d7b9fd0f.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/gizlilik/page-54fbc2851ace54ff.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/hakkimizda/page-220c1947f8643928.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/icerik/%5Bid%5D/edit/page-f7c10921d48aad1b.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/icerik/%5Bid%5D/preview/page-4e14673d0ee13605.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/icerik/page-8fa9a8650e401c20.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/iletisim/layout-892d415fff83984a.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/iletisim/page-82171f9e6feb211a.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/karsilastir/loading-321a0270b93c378d.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/karsilastir/page-53a2cddcdb8d9031.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kasif-deney/page-1742d5f4d8e87bbc.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kasif/page-ad4bf51108682c20.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kasif/receipt/page-8fdcb77636f6f3f0.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kategori/%5Bslug%5D/error-f268ababd6f16726.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kategori/%5Bslug%5D/loading-57c1aeeed16983d3.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kategori/%5Bslug%5D/page-285c0a1e5e1fc3e4.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kategori/page-41e2874e336517f9.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kesfet/error-2f32099dc916d718.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kesfet/loading-50e14066b74d1dc7.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kesfet/page-28db414e4d7256b6.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/koleksiyonlar/%5Bslug%5D/page-017c847732a9c57f.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/koleksiyonlar/error-37208a165fd2fed3.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/koleksiyonlar/loading-fc5c74fb7580796e.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/koleksiyonlar/page-cb66566ccd190af2.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kullanim-kosullari/page-e9f7943136fddc0c.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/launchpad/page-9a7bfdb9ff5edb79.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/launchpad/submit/page-7b3fdb5d61381411.js',
        },
        { revision: null, url: '/_next/static/chunks/app/%5Blocale%5D/layout-db639bd2f5f9706d.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/leaderboard/error-257a29a6d27d5791.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/leaderboard/loading-7874f9b09f88a696.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/leaderboard/page-c9aeff894d57f6b9.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/login/page-2c9e3d4162d501f2.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/mesajlar/%5BconversationId%5D/page-e7e6d13f59381536.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/mesajlar/layout-8ae9e3b9b590e246.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/mesajlar/page-fad63df7289156cb.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/not-found-fe6bed3d6648671a.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/odul-avciligi/%5Bid%5D/page-350265c21cd02e8d.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/odul-avciligi/error-7005da7345b3cc09.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/odul-avciligi/loading-1a6c8c5e69ee1ccd.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/odul-avciligi/page-facfbd48e6bef393.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/ogren/kasif/page-a310a6549811ab63.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/ogren/page-ea7dd0b032a069b7.js',
        },
        { revision: null, url: '/_next/static/chunks/app/%5Blocale%5D/page-e8616f95a67cd67b.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/profile/collections/%5Bid%5D/edit/page-82081a167e24b0d2.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/profile/error-994c4a9741757b10.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/profile/loading-736eb35827bc1ecd.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/profile/page-68d7f7fa3190e24b.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/profile/projects/%5Bid%5D/edit/page-113933c59530122c.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/random-tools/error-e69c4556ddf2b249.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/random-tools/loading-bb0f2c409a9633af.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/random-tools/page-c3fb6f38c7e3ea89.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/reset-password/page-61597227a50c9ac5.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/signup/page-762bfe13529d51fe.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/sso/page-84b659631e28be3e.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/studyo/error-3642e7a824d18aa2.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/studyo/loading-dfd712c20faf44fa.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/studyo/page-5bf63d04da3d6dbe.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/submit/page-3d407614f35cc559.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/tavsiye/page-3969bb2c50c51b53.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/tool/%5Bslug%5D/error-dddfc2edab397d5d.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/tool/%5Bslug%5D/loading-7e4674d83abc1c73.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/tool/%5Bslug%5D/page-e2f8924a368f95c0.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/topluluk/error-e1cb4da8bc948812.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/topluluk/loading-f0b82c0a34118f34.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/topluluk/page-4f01fee7372bd0a3.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/u/%5Busername%5D/followers/page-2c6b94a166759d27.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/u/%5Busername%5D/following/page-1bceec470be7c38d.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/u/%5Busername%5D/page-153dabea14f903fb.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/uyelik/page-ef040a4ddfc2ba81.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/workmind/page-b539153912e648da.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/yarisma/error-3a35732c9d9dcb3e.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/yarisma/loading-be2320aa13eadf51.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/yarisma/page-9909c7b0ddd998cf.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/~offline/page-eb58011909e36b81.js',
        },
        { revision: null, url: '/_next/static/chunks/app/_not-found/page-4166fb7fb8683d52.js' },
        { revision: null, url: '/_next/static/chunks/app/api/blog/view/route-4e8e99d137e319ca.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/cron/kasif-goal-candidates/route-a8f99c023f2f2f19.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/cron/kasif-ops-digest/route-3520d589cf206674.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/cron/link-audit-pending/route-ea5fe273862af0cb.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/cron/link-audit/route-31fca812eef2db39.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/cron/quality/route-ec7d2ad6c3041a76.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/cron/quests-reassign/route-880aa791da0ba825.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/cron/tool-discovery/route-c0139d32382e6470.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/cron/tool-embeddings/route-f738bc2be8590359.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/cron/tool-enrichment/route-49bbb914c6341d00.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/cron/tool-scrape/route-0374f540b27d976a.js',
        },
        { revision: null, url: '/_next/static/chunks/app/api/health/route-2a5f171bb054a76b.js' },
        { revision: null, url: '/_next/static/chunks/app/api/kasif/ask/route-29dce795ef02be7b.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/kasif/completion-claim/route-885c34a03c966327.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/kasif/completion-webhook/%5Bprovider%5D/route-c6f1783629598add.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/kasif/feedback/route-e0d59850a16210c3.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/kasif/funnel/route-3b3780bbc5416a2d.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/kasif/job-session/route-634c33d3b592ac16.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/kasif/pack-access/route-d7390cd360a60015.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/kasif/pack-runner/route-64220bc36b2640a2.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/kasif/partner/status/route-2146b9e8881bc7d6.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/kasif/proactive/route-8960407437f87075.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/kasif/receipt-stats/route-835b6e987b7e6301.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/kasif/receipt/route-1c131f5a0e60fa12.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/kasif/result-bridge/route-9fe4d71c6c2f7032.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/kasif/soft-landing-config/route-ec614dba8752d126.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/kasif/status/route-f2bb98b1021cbc2a.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/stripe-webhook/route-1fad311ea152ee02.js',
        },
        { revision: null, url: '/_next/static/chunks/app/api/tool-icon/route-588efed2781b502e.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/v1/kasif/recommend/route-0b05081398e94492.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/v1/openapi/route-a58b44eab413154a.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/v1/tools/%5Bslug%5D/route-9ffb1d9c468e9fea.js',
        },
        { revision: null, url: '/_next/static/chunks/app/api/v1/tools/route-d2dc1ba054db85be.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/workmind/generate/route-6ee9218aac338332.js',
        },
        { revision: null, url: '/_next/static/chunks/app/global-error-0a1a5c98bd52c0eb.js' },
        { revision: null, url: '/_next/static/chunks/app/layout-ea71372bc11599c6.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/manifest.webmanifest/route-bb6d2f51fcc0a3d0.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/opengraph-image/route-e6e16e4b1daa4fd5.js',
        },
        { revision: null, url: '/_next/static/chunks/app/robots.txt/route-f58d8f613b3e7eac.js' },
        { revision: null, url: '/_next/static/chunks/app/rss.xml/route-fa61af0f0a3082cc.js' },
        { revision: null, url: '/_next/static/chunks/app/sitemap.xml/route-257f53cc906ecbb4.js' },
        { revision: null, url: '/_next/static/chunks/framework-e0082436dfdc054b.js' },
        { revision: null, url: '/_next/static/chunks/main-5c6fe34f617d2173.js' },
        { revision: null, url: '/_next/static/chunks/main-app-5b62dc156feb113c.js' },
        { revision: null, url: '/_next/static/chunks/pages/_app-234e6b9e34e0cdcc.js' },
        { revision: null, url: '/_next/static/chunks/pages/_error-643a698623d31499.js' },
        {
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
        },
        { revision: null, url: '/_next/static/chunks/webpack-e9ff2a0b59a2dafa.js' },
        { revision: null, url: '/_next/static/css/2312b98d0fe3d079.css' },
        { revision: null, url: '/_next/static/css/8584ffabdd5f8c16.css' },
        { revision: null, url: '/_next/static/css/aa94488fb30f8d6e.css' },
        { revision: null, url: '/_next/static/css/e07f2bf4fa519943.css' },
        { revision: null, url: '/_next/static/css/e8db45d2b915d30a.css' },
        { revision: null, url: '/_next/static/media/fontawesome-webfont.2b13baa7.eot' },
        { revision: null, url: '/_next/static/media/fontawesome-webfont.8a7cb27d.ttf' },
        { revision: null, url: '/_next/static/media/fontawesome-webfont.cf011583.woff' },
        { revision: null, url: '/_next/static/media/fontawesome-webfont.da909aa0.svg' },
        { revision: null, url: '/_next/static/media/fontawesome-webfont.e9955780.woff2' },
        { revision: '93a1151f6147b94ef10373c640c24740', url: '/favicon.ico' },
        { revision: 'd09f95206c3fa0bb9bd9fefabfd0ea71', url: '/file.svg' },
        { revision: '2aaafa6a49b6563925fe440891e32717', url: '/globe.svg' },
        { revision: 'e54fd3ac0c3058e8a247e24b94074df8', url: '/icons/icon-192x192.png' },
        { revision: '397290b04735804959fade3519a41f77', url: '/icons/icon-512x512.png' },
        { revision: '8e061864f388b47f33a1c3780831193e', url: '/next.svg' },
        { revision: '59ba6d35827e18a9bf4947bf545db882', url: '/offline.html' },
        { revision: 'c0af2f507b369b085b35ef4bbe3bcf1e', url: '/vercel.svg' },
        { revision: 'a2760511c65806022ad20adf74370ff3', url: '/window.svg' },
      ],
      skipWaiting: !0,
      clientsClaim: !0,
      navigationPreload: !0,
      runtimeCaching: e_,
    }),
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
