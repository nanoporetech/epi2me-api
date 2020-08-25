const { GraphQL } = require('../dist/web');

const GQLConfig = { url: 'http://epi2me-vm.nanoporetech.com' };

const GRAPHQL = new GraphQL(GQLConfig);

GRAPHQL.convertONTJWT(process.env.JWT)
  .then((res) => {
    const graphQL = new GraphQL({ ...GQLConfig, jwt: res.access });
    graphQL
      .workflows()
      .then(console.info)
      .catch((e) => console.error(e.networkError.result));
  })
  .catch(console.log);
