/**
* Return "json" "html" or "notAcceptable"
*/
module.exports = function (request) {
  var jsonAcceptHeaders = ['application/vnd.api+json', 'application/json'];
  var htmlAcceptHeaders = ['text/html', '*/*'];

  if (request.headers.accept) {
    var accept = request.headers.accept;
    var jsonContent = typesInHeaders(accept, jsonAcceptHeaders);
    var htmlContent = typesInHeaders(accept, htmlAcceptHeaders);
    // if accept header has both json and html return notAcceptable
    if (jsonContent && htmlContent) {
      // ammened as this seem to cause issues with CLiudfortn and Crawlers
      // return 'notAcceptable';
      return 'html';
    }

    if (htmlContent) {
      return 'html';
    }

    if (jsonContent) {
      return 'json';
    }
  }

  var twitterBot = (request.headers['user-agent'] || '').indexOf('Twitterbot') > -1;
  if (twitterBot) {
    return 'html';
  }

  // ammened as this seem to cause issues with CLiudfortn and Crawlers
  // return 'notAcceptable';
  return 'html';
};

function typesInHeaders (acceptHeaders, contentTypes) {
  var result = false;
  contentTypes.forEach(function (type) {
    if (acceptHeaders.indexOf(type) > -1) {
      result = true;
    }
  });
  return result;
}
