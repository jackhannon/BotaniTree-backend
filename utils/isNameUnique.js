const makeQuery = require("./makeQuery")

const isNameUnique = async (table, name, speciesId) => {
  if (name === "") {
    return 
  }

  let GET_BY_NAME;
  if (table === 'species') {
    GET_BY_NAME = `
      SELECT name 
      FROM species
      WHERE name = $1
    `;
  } else if (table === "individual_plant") {
    GET_BY_NAME = `
      SELECT name 
      FROM individual_plant
      WHERE species_id = $1 AND name = $2
    `;
  } else if (table === "species_group") {
    GET_BY_NAME = `
      SELECT name 
      FROM species_group
      WHERE species_id = $1 AND name = $2
    `;
  }
  
  const result = await makeQuery(GET_BY_NAME, table === 'species' ? name : speciesId, name);
  
  return !result.rowCount > 0
}



module.exports=isNameUnique