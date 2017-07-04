var getData = require('../lib/get-data.js');
var JSONToHTML = require('../../lib/transforms/json-to-html-data');
var Snackbar = require('snackbarlightjs');
var initComp = require('../lib/init-components.js');
var searchListener = require('../lib/search-listener');
var osdListener = require('../lib/osd-listener');
var downloadImageListener = require('../lib/download-image');
var archiveListeners = require('../lib/archive-listeners');
var getArticles = require('../lib/get-articles');
var hideKeyboard = require('../lib/hide-keyboard');
var Templates = require('../templates');

module.exports = function (type) {
  return {
    load: function (ctx, next) {
      load(ctx, next, type);
    },
    render: function (ctx, next) {
      render(ctx, next, type);
    },
    listeners: function (ctx, next) {
      listeners(ctx, next, type);
    }
  };
};

function load (ctx, next, type) {
  var pageType = type === 'people' ? type : type + 's';

  if (!ctx.isInitialRender) {
    var opts = {
      headers: { Accept: 'application/vnd.api+json' }
    };
    var id = ctx.params.id;
    var url = '/' + pageType + '/' + id + '?ajax=true';

    getData(url, opts, function (err, json) {
      if (err) {
        console.error(err);
        Snackbar.create('Error getting data from the server');
        return;
      }
      var data = JSONToHTML(json);

      ctx.state.data = data;
      // analytics
      if (data.inProduction) {
        window.dataLayer.push(data.layer);
      }

      ctx.state.data.page = type;
      next();
    });
  } else {
    ctx.state.data = {};
    ctx.state.data.page = type;
    listeners(ctx, next, type);
  }
}

function render (ctx, next, type) {
  var pageType = type === 'people' ? type : type + 's';
  var pageEl = document.getElementsByTagName('main')[0];

  hideKeyboard();
  document.getElementsByTagName('title')[0].textContent = ctx.state.data.titlePage;
  document.body.className = ctx.state.data.type;
  pageEl.innerHTML = Templates[pageType](ctx.state.data);

  if (window.location.href.indexOf('#') === -1) {
    window.scrollTo(0, 0);
  }

  next();
}

function listeners (ctx, next, type) {
  var funcs = [initComp, searchListener];

  if (type === 'object' || type === 'document') {
    funcs.push(osdListener, downloadImageListener);
  }

  if (type === 'object') {
    funcs.push(getArticles);
  } else if (type === 'document') {
    funcs.push(archiveListeners);
  }

  funcs.forEach(function (el) {
    el(ctx);
  });
}