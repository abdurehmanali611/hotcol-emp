import { DateTimeResolver, GraphQLJSON } from "graphql-scalars";
import { employeeResolvers } from "./employeeGraphql.js";

export const resolvers = {
  DateTime: DateTimeResolver,
  JSON: GraphQLJSON,
  Query: {
    _health: () => "HotCol Employee GraphQL API is running",
    ...employeeResolvers.Query,
  },
  Mutation: {
    _noop: () => true,
    ...employeeResolvers.Mutation,
  },
};
