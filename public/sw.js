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
          revision: '08d1fbb38dc2aff811aa46fe8bf5c045',
          url: '/_next/static/VnxkG1vj2HzLaWv2xueoW/_buildManifest.js',
        },
        {
          revision: 'b6652df95db52feb4daf4eca35380933',
          url: '/_next/static/VnxkG1vj2HzLaWv2xueoW/_ssgManifest.js',
        },
        { revision: null, url: '/_next/static/chunks/1054.35ec197539ad51e7.js' },
        { revision: null, url: '/_next/static/chunks/1356-821c1d10c8a196fd.js' },
        { revision: null, url: '/_next/static/chunks/1556-f90b992c36d4ca8b.js' },
        { revision: null, url: '/_next/static/chunks/1567-3d8df1c5694a1030.js' },
        { revision: null, url: '/_next/static/chunks/1600-3a34d5b478fbd4d0.js' },
        { revision: null, url: '/_next/static/chunks/1646.2c8c06db20d728b6.js' },
        { revision: null, url: '/_next/static/chunks/1668.276732f4e1a36f64.js' },
        { revision: null, url: '/_next/static/chunks/1767-767db40645c7dfea.js' },
        { revision: null, url: '/_next/static/chunks/1a258343-a16fd1133670181c.js' },
        { revision: null, url: '/_next/static/chunks/2346-3d1264ae5cb62842.js' },
        { revision: null, url: '/_next/static/chunks/2397-7e7236a41a85c2c3.js' },
        { revision: null, url: '/_next/static/chunks/2511-6ea71588f8227cde.js' },
        { revision: null, url: '/_next/static/chunks/2619-0cfeadee0ed0e18c.js' },
        { revision: null, url: '/_next/static/chunks/2683-d468759e4b308bac.js' },
        { revision: null, url: '/_next/static/chunks/3292-eb1596d3a10b8a37.js' },
        { revision: null, url: '/_next/static/chunks/3577-85c68dba815d1821.js' },
        { revision: null, url: '/_next/static/chunks/3915-273da73d1dba8a81.js' },
        { revision: null, url: '/_next/static/chunks/4127-dd2c537fdcb61707.js' },
        { revision: null, url: '/_next/static/chunks/4356-fad11151ba37bdf9.js' },
        { revision: null, url: '/_next/static/chunks/4802-ef8142df89a9d4ea.js' },
        { revision: null, url: '/_next/static/chunks/4933-0685b1e4ce6bee71.js' },
        { revision: null, url: '/_next/static/chunks/4a7b0c69-c28b3c0d6d42b12c.js' },
        { revision: null, url: '/_next/static/chunks/4bd1b696-6746545dc22de232.js' },
        { revision: null, url: '/_next/static/chunks/501-20f16efebbc1d353.js' },
        { revision: null, url: '/_next/static/chunks/5139.e1c82892b4be809e.js' },
        { revision: null, url: '/_next/static/chunks/5239-de88eba65ea4649b.js' },
        { revision: null, url: '/_next/static/chunks/547-003b95779d3a1ec1.js' },
        { revision: null, url: '/_next/static/chunks/5997-c3cbe13b0ad41639.js' },
        { revision: null, url: '/_next/static/chunks/6093-f5874b4ddfb02315.js' },
        { revision: null, url: '/_next/static/chunks/6265-9c3ffaf3a9f498b7.js' },
        { revision: null, url: '/_next/static/chunks/6564-d0b86fde1b248e95.js' },
        { revision: null, url: '/_next/static/chunks/6641-d1661bed3e656251.js' },
        { revision: null, url: '/_next/static/chunks/770-23b029e223014af1.js' },
        { revision: null, url: '/_next/static/chunks/7754-158ce03d3ae202ef.js' },
        { revision: null, url: '/_next/static/chunks/7899-45ce483eeeef74a5.js' },
        { revision: null, url: '/_next/static/chunks/7985-b719a1a72b7dfca6.js' },
        { revision: null, url: '/_next/static/chunks/819-f9b778365e594036.js' },
        { revision: null, url: '/_next/static/chunks/8510-8362c247cbdbad66.js' },
        { revision: null, url: '/_next/static/chunks/8527-f4950acb9822df1a.js' },
        { revision: null, url: '/_next/static/chunks/8612-52c27bd6f618da5e.js' },
        { revision: null, url: '/_next/static/chunks/8971.9d5b0c1acf1cd2b4.js' },
        { revision: null, url: '/_next/static/chunks/8986.41e031cafb4f8e77.js' },
        { revision: null, url: '/_next/static/chunks/8b30ef62.2b25a563b88c9ae5.js' },
        { revision: null, url: '/_next/static/chunks/9088-3a925ccfdf3597be.js' },
        { revision: null, url: '/_next/static/chunks/9175.b7c46c146536cb6c.js' },
        { revision: null, url: '/_next/static/chunks/9266-8acfb274d72cd49b.js' },
        { revision: null, url: '/_next/static/chunks/9511-4b18cda8a0ad37b5.js' },
        { revision: null, url: '/_next/static/chunks/9516-2eba8514dd222d7c.js' },
        { revision: null, url: '/_next/static/chunks/9997.50d9ca89f70e8be9.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/analytics/page-0252a7407ce4ab9b.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/bulk-import/page-365ca145d3c3a660.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/challenges/%5Bid%5D/edit/page-9063ca509f0e2e6a.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/co-pilot/page-a4a4776928112c04.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/error-8841db1eb57dd031.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/loading-e91074d014815323.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/page-d3cbb30117264adb.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/posts/%5Bid%5D/edit/page-2ba2906d2e83aec0.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/admin/posts/%5Bid%5D/preview/page-ddde5ba74a056ccd.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/akis/page-978ac9d397f85737.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/arastirma/page-f1b63b6620d4d669.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/auth/callback/route-5e8a872146f54a7b.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/blog/%5Bslug%5D/page-8acd069ab58d9d13.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/blog/loading-4d4c6e2067257ee5.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/blog/page-2742d09e718764be.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/bulten/%5Bslug%5D/page-ec618bba258b1ead.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/bulten/page-3f864114a40be34d.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/dashboard/error-c24fe47d900225fc.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/dashboard/loading-1248975bf89f5661.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/dashboard/page-707fe3e337258cd6.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/developer/error-15e4546aaa530096.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/developer/loading-1a29f36edfadc6bc.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/developer/page-fd2e6056dfdeddbb.js',
        },
        { revision: null, url: '/_next/static/chunks/app/%5Blocale%5D/error-7f78af9be5acda68.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/eserler/edit/page-b8543b646b37cd4c.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/eserler/error-94540071e1ba97c6.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/eserler/loading-7b2310e791f29022.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/eserler/page-7b742a54c5292292.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/feedback/page-b753f5f426ee1fb3.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/forgot-password/page-11b791db71ea2497.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/gizlilik/page-c8e9efef95da6eba.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/hakkimizda/page-bb9c3610cbaa27ae.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/iletisim/layout-68de89cea0f17059.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/iletisim/page-62bc0e0ab181f10c.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/karsilastir/loading-f4ed612618f1a435.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/karsilastir/page-46532e7bd0d7456a.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kasif-deney/page-018f3d9cc30c638c.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kasif/page-74a94d82b0292ce8.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kategori/%5Bslug%5D/error-3cb8b04cc71d67e7.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kategori/%5Bslug%5D/loading-f8cdb80062f39d7d.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kategori/%5Bslug%5D/page-bfe7eaa516a7e29a.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kategori/page-e040135ee5b0c527.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kesfet/error-f5d27405890406bc.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kesfet/loading-1c6ed5787a29ebe2.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kesfet/page-1db547d81498fd31.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/koleksiyonlar/%5Bslug%5D/page-33df2a21b92ff872.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/koleksiyonlar/error-90965d2511986c2c.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/koleksiyonlar/loading-4d976ce1feda7e6c.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/koleksiyonlar/page-1abf0ee71b843caa.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/kullanim-kosullari/page-f0c20dd9fdefd195.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/launchpad/page-7c7599d3488cb120.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/launchpad/submit/page-d6d806c7340214eb.js',
        },
        { revision: null, url: '/_next/static/chunks/app/%5Blocale%5D/layout-dca36afd6be879de.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/leaderboard/error-70623afb7e0c3858.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/leaderboard/loading-b66c3bc6d3a21bf5.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/leaderboard/page-f6ea42235b8d9843.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/login/page-bbaefccaa533d4e5.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/mesajlar/%5BconversationId%5D/page-bca86c84121195d9.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/mesajlar/layout-7d77219e533adc1a.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/mesajlar/page-a901a79fc56f1be4.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/not-found-6d05161d6004dbe5.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/odul-avciligi/%5Bid%5D/page-94282e15e4b5cb16.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/odul-avciligi/error-1ae12f58f186b045.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/odul-avciligi/loading-1ff147d62cc759b8.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/odul-avciligi/page-b4934cd1b83b6b96.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/ogren/page-0aa5bdc051bbdc22.js',
        },
        { revision: null, url: '/_next/static/chunks/app/%5Blocale%5D/page-2cd5a8b70d806d6d.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/profile/collections/%5Bid%5D/edit/page-188e388e9f33b551.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/profile/error-c3684b799f82a4a6.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/profile/loading-1c9beb51d1f3034b.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/profile/page-d5fb5a42404c0fe2.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/profile/projects/%5Bid%5D/edit/page-7366ed35109dc949.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/random-tools/error-ff9ee9e400c9c26f.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/random-tools/loading-4d1808d37cd0999b.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/random-tools/page-1497faedbfd6ea2f.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/reset-password/page-7b632f218148952c.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/signup/page-f039afdf12e059fc.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/sso/page-23604a3d1c1fbcc3.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/studyo/error-a4a051f993e70d82.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/studyo/loading-f10dada801aa5183.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/studyo/page-adf0b729f82ab85d.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/submit/page-e92e68fdb28ce0a8.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/tavsiye/page-ce8e926d3d11b6c0.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/tool/%5Bslug%5D/error-c2fb7101a0508d3c.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/tool/%5Bslug%5D/loading-4a5ea89f65d829cd.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/tool/%5Bslug%5D/page-2623a6b51c8b468c.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/topluluk/error-6ee00bd87ebda67c.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/topluluk/loading-9765a75fb7450545.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/topluluk/page-4a05af4d7e865ed7.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/u/%5Busername%5D/followers/page-20063a9f231b9380.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/u/%5Busername%5D/following/page-7a2358e266072ebc.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/u/%5Busername%5D/page-63411f693215d3e9.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/uyelik/page-ecfd312dd4cb2062.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/workmind/page-014b191b3d54bf74.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/yarisma/error-f483c68363f5b21d.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/yarisma/loading-11263691a6c3e209.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/yarisma/page-15c9c3996bdc983d.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/%5Blocale%5D/~offline/page-adea352a03664e0b.js',
        },
        { revision: null, url: '/_next/static/chunks/app/_not-found/page-a85f18a017150db5.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/cron/link-audit/route-37ac5077e54c7309.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/cron/quality/route-eef2049729aebf1a.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/cron/tool-discovery/route-4ca52c5f3414a03b.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/cron/tool-enrichment/route-e5ab01855aca8229.js',
        },
        { revision: null, url: '/_next/static/chunks/app/api/health/route-412f43c3d9324eee.js' },
        { revision: null, url: '/_next/static/chunks/app/api/kasif/ask/route-4fa93869b911e8bb.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/kasif/feedback/route-2559abd493b4850e.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/stripe-webhook/route-f81ae459f979b76c.js',
        },
        { revision: null, url: '/_next/static/chunks/app/api/tool-icon/route-af7ce1a65ae12b22.js' },
        { revision: null, url: '/_next/static/chunks/app/api/v1/tools/route-70ae421dd688d04d.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/api/workmind/generate/route-391ab2d5d2d7e06f.js',
        },
        { revision: null, url: '/_next/static/chunks/app/global-error-086a013f8ef2eacb.js' },
        { revision: null, url: '/_next/static/chunks/app/layout-c963e8581ac6b05d.js' },
        {
          revision: null,
          url: '/_next/static/chunks/app/manifest.webmanifest/route-5c0e96344e588e27.js',
        },
        {
          revision: null,
          url: '/_next/static/chunks/app/opengraph-image/route-65fed349113fc3c2.js',
        },
        { revision: null, url: '/_next/static/chunks/app/robots.txt/route-5c5b1fdb8caf833b.js' },
        { revision: null, url: '/_next/static/chunks/app/rss.xml/route-b0e98665e58e369f.js' },
        { revision: null, url: '/_next/static/chunks/app/sitemap.xml/route-ee56c25b8c3468bb.js' },
        { revision: null, url: '/_next/static/chunks/framework-e0082436dfdc054b.js' },
        { revision: null, url: '/_next/static/chunks/main-app-7c2d8d50f113f4fd.js' },
        { revision: null, url: '/_next/static/chunks/main-fb90bf7876255db9.js' },
        { revision: null, url: '/_next/static/chunks/pages/_app-b616034e53fa4219.js' },
        { revision: null, url: '/_next/static/chunks/pages/_error-02f391e37014e579.js' },
        {
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
        },
        { revision: null, url: '/_next/static/chunks/webpack-5b6f0b888ff2376f.js' },
        { revision: null, url: '/_next/static/css/12f5d599806127df.css' },
        { revision: null, url: '/_next/static/css/2312b98d0fe3d079.css' },
        { revision: null, url: '/_next/static/css/5143a24dd788d79e.css' },
        { revision: null, url: '/_next/static/css/aa94488fb30f8d6e.css' },
        { revision: null, url: '/_next/static/css/e07f2bf4fa519943.css' },
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
        { revision: 'b6538ec959946364e63f81d7408fb600', url: '/offline.html' },
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
