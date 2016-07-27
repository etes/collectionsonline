var fetch = require('fetch-ponyfill')();
var searchResultsToTemplateData = require('../../lib/transforms/search-results-to-template-data');

module.exports = function (url, opts, queryParams, cb) {
  fetch(url, opts)
    .then(function (res) {
      if (res.ok) {
        return res.json();
      } else {
        return Promise.reject(new Error(res.status + ' Failed to fetch results'));
      }
    })
    .then(function (json) {
      if (json.errors) return Promise.reject(json.errors[0]);
      var data = searchResultsToTemplateData(queryParams, json);
      return cb(data);
    })
    .catch(function (err) {
      console.error('Failed to search', err);
    });
};