const { GraphQL } = require('../dist/web');

const GQLConfig = { url: 'http://graphql.epi2me.nanoporetech.com' };

const GRAPHQL = new GraphQL(GQLConfig);

const ONTJWT = process.env.JWT;

if (!ONTJWT) {
  throw Error('PLEASE SET JWT AS ENV VAR');
}

GRAPHQL.convertONTJWT(ONTJWT)
  .then((res) => {
    const graphQL = new GraphQL({ ...GQLConfig, jwt: res.access });
    graphQL
      .workflows()
      .then(console.info)
      .catch((e) => console.error(e.networkError.result));
  })
  .catch(console.log);
