const envConfig = require('../config/envConfig');
const { Pool } = require("pg");


const getNextId = async (tableToGetId, req, res, next) =>  {
  const pool = new Pool({
    connectionString: envConfig.DATABASE_URL
  })
  const client = await pool.connect()
  const speciesIdResult = await client.query(`SELECT nextval($1 || '_id_seq') AS next_id`, [tableToGetId]);
  req.params.nextId = speciesIdResult.rows[0].next_id;
  client.release();
  await pool.end()
  next()
}

module.exports = getNextId