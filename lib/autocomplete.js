const TypeMapping = require('../lib/type-mapping');
const searchWeights = require('./search-weights');

module.exports = async (elastic, queryParams) => {
  const must = [{
    match_phrase_prefix: {
      summary_title_stem: { query: queryParams.q }
    }
  }];

  if (queryParams.type) {
    must.push({
      term: { 'type.base': TypeMapping.toInternal(queryParams.type) }
    });
  }

  const searchOpts = {
    index: 'smg',
    size: queryParams.size || 3,
    body: {
      query: {
        function_score: {
          query: {
            bool: {
              must,
              filter: {
                terms: { 'type.base': ['agent', 'archive', 'object'] }
              }
            }
          },
          functions: searchWeights
        }
      }
    }
  };

  return await elastic.search(searchOpts);
};
