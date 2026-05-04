// Phase 28 Wave 0 — shared helpers for *.test.mjs files. Pure Node 24 builtins.
//
// Exposes four named utilities used by every test/*.test.mjs scaffold:
//   - readJsonFile(absolutePath)          → parsed JSON, with clear error context.
//   - writeJsonFile(absolutePath, data)   → JSON with 2-space indent + trailing newline.
//   - withTempDir(prefix, fn)             → unique temp dir, cleaned up after fn.
//   - makeMinimalDocumentStub()           → tiny <document> shim for DOM-flavoured tests.
//
// Intentionally tiny. Downstream waves (28-01..28-05) may extend the document stub
// in-place; the four named exports here are the locked contract.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export function readJsonFile(absolutePath) {
  return readFile(absolutePath, "utf8").then(
    (text) => JSON.parse(text),
    (cause) => {
      const reason = cause && cause.message ? cause.message : String(cause);
      throw new Error("readJsonFile failed: " + absolutePath + " — " + reason);
    },
  );
}

export function writeJsonFile(absolutePath, data) {
  return mkdir(dirname(absolutePath), { recursive: true }).then(() => {
    const serialized = JSON.stringify(data, null, 2) + "\n";
    return writeFile(absolutePath, serialized, "utf8");
  });
}

export function withTempDir(prefix, fn) {
  const safePrefix = String(prefix || "tt-beamer-test").replace(/[^A-Za-z0-9_.-]/g, "_");
  const dir = mkdtempSync(join(tmpdir(), safePrefix + "-"));
  return Promise.resolve()
    .then(() => fn(dir))
    .finally(() => {
      rmSync(dir, { recursive: true, force: true });
    });
}

export function makeMinimalDocumentStub() {
  const registry = new Map();

  function makeClassList() {
    const set = new Set();
    return {
      add(name) { set.add(String(name)); },
      remove(name) { set.delete(String(name)); },
      toggle(name, force) {
        const key = String(name);
        const has = set.has(key);
        if (force === true || (force === undefined && !has)) {
          set.add(key);
          return true;
        }
        if (force === false || (force === undefined && has)) {
          set.delete(key);
          return false;
        }
        return has;
      },
      contains(name) { return set.has(String(name)); },
    };
  }

  function makeAttributeBag() {
    const attrs = new Map();
    return {
      get(name) { return attrs.has(name) ? attrs.get(name) : null; },
      set(name, value) { attrs.set(String(name), String(value)); },
      remove(name) { attrs.delete(String(name)); },
      has(name) { return attrs.has(name); },
    };
  }

  function makeElement(tag) {
    const children = [];
    const dataset = {};
    const classList = makeClassList();
    const attributes = makeAttributeBag();
    const listeners = new Map();
    const el = {
      tagName: String(tag || "div").toUpperCase(),
      children,
      childNodes: children,
      dataset,
      classList,
      style: {},
      textContent: "",
      innerHTML: "",
      append(...nodes) {
        for (const n of nodes) children.push(n);
      },
      appendChild(node) {
        children.push(node);
        return node;
      },
      removeChild(node) {
        const idx = children.indexOf(node);
        if (idx >= 0) children.splice(idx, 1);
        return node;
      },
      setAttribute(name, value) { attributes.set(name, value); },
      removeAttribute(name) { attributes.remove(name); },
      getAttribute(name) { return attributes.get(name); },
      hasAttribute(name) { return attributes.has(name); },
      addEventListener(type, handler) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(handler);
      },
      removeEventListener(type, handler) {
        if (listeners.has(type)) listeners.get(type).delete(handler);
      },
      _listeners: listeners,
    };
    return el;
  }

  const body = makeElement("body");

  return {
    body,
    createElement(tag) { return makeElement(tag); },
    getElementById(id) { return registry.has(id) ? registry.get(id) : null; },
    _register(id, el) { registry.set(String(id), el); },
    addEventListener() { /* no-op stub */ },
    removeEventListener() { /* no-op stub */ },
  };
}
