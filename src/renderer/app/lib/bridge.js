// Thin wrapper over window.ytm (see src/preload/app.js). Svelte state objects are proxies,
// which can't cross the context bridge, so arguments are converted to plain data first.
import { fixtureBridge } from './fixtures.js';

const plain = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

const raw = window.ytm && !new URLSearchParams(location.search).has('fixtures') ? window.ytm : fixtureBridge();

export const ytm = {
  ...raw,
  api: (method, ...args) => raw.api(method, ...args.map(plain)),
  cmd: (name, arg) => raw.cmd(name, plain(arg)),
  setSetting: (key, value) => raw.setSetting(key, plain(value)),
  radioApi: (method, ...args) => raw.radioApi(method, ...args.map(plain)),
  setRadioState: (state) => raw.setRadioState(plain(state)),
};
