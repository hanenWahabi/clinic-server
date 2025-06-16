const Module = require('module');
Object.keys(Module._cache).forEach(key => {
  delete Module._cache[key];
});
console.log('Cache cleared');