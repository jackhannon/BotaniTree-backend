const { Client } = require('pg');
const envConfig = require("../config/envConfig")

const logQuery = (statement, parameters) => {
  let timeStamp = new Date();
  let formattedTimeStamp = timeStamp.toString().substring(4, 24);
  console.log(formattedTimeStamp, statement, parameters);
};

const CONNECTION = {
  connectionString: envConfig.DATABASE_URL
}

module.exports = async function makeQuery(statement, ...parameters) {
  const client = new Client(CONNECTION);
  await client.connect();
  logQuery(statement, parameters);
  let result = await client.query(statement, parameters);
  await client.end();
  return result
}