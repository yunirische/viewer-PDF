type PromiseWithExtras = PromiseConstructor & {
  try?: <T>(callback: () => T | PromiseLike<T>) => Promise<T>;
  withResolvers?: <T>() => {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: unknown) => void;
  };
};

const PromiseCompat = Promise as PromiseWithExtras;

if (!PromiseCompat.try) {
  PromiseCompat.try = (callback) => {
    try {
      return Promise.resolve(callback());
    } catch (error) {
      return Promise.reject(error);
    }
  };
}

if (!PromiseCompat.withResolvers) {
  PromiseCompat.withResolvers = <T>() => {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((promiseResolve, promiseReject) => {
      resolve = promiseResolve;
      reject = promiseReject;
    });
    return { promise, resolve, reject };
  };
}

type URLWithParse = typeof URL & {
  parse?: (url: string, base?: string) => URL | null;
};

const URLCompat = URL as URLWithParse;

if (!URLCompat.parse) {
  URLCompat.parse = (url: string, base?: string) => {
    try {
      return new URL(url, base);
    } catch {
      return null;
    }
  };
}
