const Boom = require('boom');
const buildJSONResponse = require('../lib/jsonapi-response');
const TypeMapping = require('../lib/type-mapping');
var beautify = require('json-beautify');

module.exports = (elastic, config) => ({
  method: 'GET',
  path: '/api/{type}/{id}',
  config: {
    handler: function (request, reply) {
      elastic.get({index: 'smg', type: TypeMapping.toInternal(request.params.type), id: TypeMapping.toInternal(request.params.id)}, (err, result) => {
        if (err) {
          if (err.status === 404) {
            return reply(Boom.notFound());
          }
          return reply(Boom.serverUnavailable('unavailable'));
        }

        return reply(beautify(buildJSONResponse(result, config), null, 2, 80)).header('content-type', 'application/vnd.api+json');
      });
    }
  }
});