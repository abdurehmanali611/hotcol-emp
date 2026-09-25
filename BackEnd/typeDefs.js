import { gql } from "apollo-server-express";
import {
  employeeMutationFields,
  employeeQueryFields,
  employeeTypeDefs,
} from "./employeeGraphql.js";

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  ${employeeTypeDefs}

  type Query {
    _health: String
    ${employeeQueryFields}
  }

  type Mutation {
    _noop: Boolean
    ${employeeMutationFields}
  }
`;
