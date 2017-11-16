const mongoose = require('mongoose');
const { promisify } = require('util');
const fs = require('fs');
const { join } = require('path');

const readdir = promisify(fs.readdir);

module.exports = function ({
  path, uri, models, destroyOld = false,
}, workingDir) {
  return {
    async seed(db, contents = []) {
      return Promise.all(contents
        .filter(file => ~file.search(/^[^.].*\.json$/))
        .map((file) => {
          const jsonPath = join(workingDir, path, file);
          const [modelName] = file.split('.');
          const json = require(jsonPath);
          const Model = mongoose.model(modelName);
          return Promise.all(json.map((document) => {
            const object = new Model(document);
            return object.save();
          }));
        }));
    },

    async init() {
      if (!mongoose.connection.db) {
        mongoose.Promise = Promise;
        mongoose.connection.on('error', (e) => { throw e; });
        await mongoose.connect(uri);
      }
      const db = mongoose.connection.db;
      if (destroyOld) {
        await db.dropDatabase();
      }
      const modelsPath = join(workingDir, models);
      (await readdir(modelsPath))
        .filter(file => ~file.search(/^[^.].*\.js$/))
        .map(modelName => require(join(modelsPath, modelName)))
        .filter(model => !!model.schema)
        .forEach(model => mongoose.model(model.modelName, model.schema));
      return db;
    },

    async end() {
      return mongoose.disconnect();
    },
  };
};
