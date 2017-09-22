const mongoose = require('mongoose');
const { promisify } = require('util');
const fs = require('fs');
const { join } = require('path');

const readdir = promisify(fs.readdir);

module.exports = {
  async seed(db, { path }, contents = []) {
    return Promise.all(contents
      .filter(file => ~file.search(/^[^.].*\.json$/))
      .map((file) => {
        const jsonPath = join(process.cwd(), path, file);
        const [modelName] = file.split('.');
        const json = require(jsonPath);
        const Model = mongoose.model(modelName);
        return Promise.all(json.map((document) => {
          const object = new Model(document);
          return object.save();
        }));
      }));
  },

  async init({ uri, models, destroyOld = false } = {}) {
    mongoose.Promise = Promise;
    mongoose.connection.on('error', (e) => { throw e; });
    const db = await mongoose.connect(uri);
    if (destroyOld) {
      await mongoose.connection.db.dropDatabase();
    }
    const modelsPath = join(process.cwd(), models);
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
