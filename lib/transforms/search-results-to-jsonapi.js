/**
* Build a JSONAPI formated object
*/

const QueryString = require('querystring');
const TypeMapping = require('../type-mapping');
const createFacets = require('../facets/create-facets');
const checkPurchased = require('../check-purchased');

module.exports = (queryParams, results, config) => {
  results = results || {};
  config = config || {};

  const rootUrl = config.rootUrl || '';
  const resources = createResources(results, rootUrl);
  const data = resources.data;
  const included = resources.included;
  const links = createLinks(queryParams, results, rootUrl);
  const meta = createMeta(queryParams, results);

  return { data, included, links, meta };
};

// Create resources from hits, filter any unknown resource types
function createResources (results, rootUrl) {
  const hits = (results.hits || {}).hits || [];

  return hits.reduce((resources, hit) => {
    // Create a resource if a creator exists for the hit._type
    const creator = createResource[hit._type];

    if (!creator) {
      console.warn(`No resource creator for hit ${hit._id}`);
      return resources;
    }

    const res = creator(hit, rootUrl);
    return { data: resources.data.concat(res.data), included: resources.included.concat(res.included) };
  }, { data: [], included: [] });
}

const createResource = {
  object (hit, rootUrl) {
    const type = 'objects';
    const id = TypeMapping.toExternal(hit._id);

    const attributes = [
      'arrangement',
      'autocomplete',
      'categories',
      'component',
      'condition',
      'custodial_history',
      'dates',
      'description',
      'identifier',
      'inscription',
      'language',
      'legal',
      'lifecycle',
      'location',
      'materials',
      'measurements',
      'name',
      'note',
      'numbers',
      'options',
      'reference_links',
      'summary_title',
      'summary_title_text',
      'title'
    ].reduce((attrs, key) => {
      if (hit._source && hit._source[key]) {
        attrs[key] = hit._source[key];
        // temporary - restrict credit line if it contains 'Purchased'
        // https://github.com/TheScienceMuseum/collectionsonline/issues/195
        if (key === 'legal' && checkPurchased(attrs, key)) {
          delete attrs[key].credit_line;
        }
      }
      return attrs;
    }, {});

    const rels = createRelationships(hit, [
      'agents',
      'cultures',
      'events',
      'parent',
      'places',
      'terms'
    ], rootUrl);

    const relationships = rels.relationships;
    const included = rels.included;
    const links = { self: `${rootUrl}/objects/${id}` };

    return { data: { type, id, attributes, relationships, links }, included };
  },

  agent (hit, rootUrl) {
    const type = 'people';
    const id = TypeMapping.toExternal(hit._id);

    const attributes = [
      'date_of_birth',
      'date_of_death',
      'death_date',
      'description',
      'gender',
      'historical',
      'identifier',
      'life_dates',
      'lifecycle',
      'name',
      'nationality',
      'note',
      'occupation',
      'reference_links',
      'summary_title',
      'summary_title_text',
      'title',
      'website'
    ].reduce((attrs, key) => {
      if (hit._source && hit._source[key]) {
        attrs[key] = hit._source[key];
      }
      return attrs;
    }, {});

    const rels = createRelationships(hit, [
      'agents',
      'places',
      'terms'
    ], rootUrl);

    const relationships = rels.relationships;
    const included = rels.included;
    const links = { self: `${rootUrl}/people/${id}` };

    return { data: { type, id, attributes, relationships, links }, included };
  },

  archive (hit, rootUrl) {
    const type = 'documents';
    const id = TypeMapping.toExternal(hit._id);

    const attributes = [
      'arrangement',
      'description',
      'identifier',
      'legal',
      'level',
      'measurements',
      'name',
      'note',
      'reference_links',
      'summary_title',
      'summary_title_text',
      'title',
      'web'
    ].reduce((attrs, key) => {
      if (hit._source && hit._source[key]) {
        attrs[key] = hit._source[key];
      }
      return attrs;
    }, {});

    const rels = createRelationships(hit, [
      'agents',
      'archives',
      'fonds',
      'organisations',
      'parent'
    ], rootUrl);

    const relationships = rels.relationships;
    const included = rels.included;
    const links = { self: `${rootUrl}/documents/${id}` };

    return { data: { type, id, attributes, relationships, links }, included };
  }
};

function createRelationships (hit, props, rootUrl) {
  // Reference relationships
  const relationships = props.reduce((rels, key) => {
    if (hit._source && hit._source[key] && hit._source[key].length) {
      const type = TypeMapping.toExternal(key);

      rels[type] = {
        data: hit._source[key].map((r) => {
          const id = TypeMapping.toExternal(r.admin && r.admin.uid);
          return { type, id };
        })
      };
    }
    return rels;
  }, {});

  // Add included docs
  const included = props.reduce((incs, key) => {
    if (hit._source && hit._source[key] && hit._source[key].length) {
      const type = TypeMapping.toExternal(key);

      const resources = hit._source[key].map((r) => {
        const id = TypeMapping.toExternal(r.admin && r.admin.uid);

        return {
          type,
          id,
          attributes: { summary_title: r.summary_title },
          links: { self: `${rootUrl}/${type}/${id}` }
        };
      });

      incs = incs.concat(resources);
    }
    return incs;
  }, []);

  return { relationships, included };
}

// Creates a top level links object
function createLinks (queryParams, results, rootUrl) {
  const totalPages = Math.ceil(results.hits.total / queryParams.pageSize);
  const pageNumber = queryParams.pageNumber;
  const type = queryParams.type !== 'all' ? queryParams.type : null;
  const self = searchUrl(type, rootUrl, queryParams.query);
  const first = searchUrl(type, rootUrl, xtend(queryParams.query, { 'page[number]': 0 }));
  const last = searchUrl(type, rootUrl, xtend(queryParams.query, { 'page[number]': totalPages - 1 }));
  const prev = pageNumber > 0
    ? searchUrl(type, rootUrl, xtend(queryParams.query, { 'page[number]': pageNumber - 1 }))
    : null;
  const next = pageNumber < totalPages - 1
    ? searchUrl(type, rootUrl, xtend(queryParams.query, { 'page[number]': pageNumber + 1 }))
    : null;

  return { self, first, last, prev, next };
}

function searchUrl (type, rootUrl, params) {
  type = type ? '/' + type : '';
  delete params['fields[type]'];
  return `${rootUrl}/search${type}?${QueryString.stringify(params)}`;
}

function createMeta (queryParams, results) {
  const total = (results.hits || {}).total || 0;
  const totalPages = Math.ceil(total / queryParams.pageSize);
  const countCategories = createCountCategories(results);
  return { total_pages: totalPages, count: {type: countCategories}, filters: createFacets[queryParams.type](results) };
}

function createCountCategories (results) {
  const result = { all: 0, people: 0, objects: 0, documents: 0 };
  const buckets = results.aggregations.total_per_categories.buckets;
  result.all = results.aggregations.total.doc_count;
  // build the object {people: number, objects: number, documents: number,...}
  const numbers = {};
  buckets.forEach(bucket => {
    numbers[TypeMapping.toExternal(bucket.key)] = bucket.doc_count;
  });
  result.people += numbers.people ? numbers.people : 0;
  result.objects += numbers.objects ? numbers.objects : 0;
  result.documents += numbers.documents ? numbers.documents : 0;
  return result;
}

function xtend (obj1, obj2) {
  return Object.assign({}, obj1, obj2);
}