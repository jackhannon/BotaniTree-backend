const makeQuery = require("../utils/makeQuery")
const tryCatch = require("../middleware/higherOrder")
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const deleteFolderAndContents = require("../utils/deleteFolderAndContents");
const isJsonString = require("../utils/isJsonString");
const generateIndividualName = require("../utils/generateIndividualName");
const { convertToSeconds, convertToPostgresTimestamp } = require("../utils/convertToPostgresTimestamp");
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const SECONDS_IN_A_YEAR = 31536000;

const getSpecies = tryCatch(async function(req, res, next) {
  const GET_ALL_SPECIES = `SELECT * 
                            FROM species 
                            ORDER BY date DESC`;

  const result = await makeQuery(GET_ALL_SPECIES)
  return res.json(result.rows).status(200)
})



const getSpecificSpeciesInfo = tryCatch(async function(req, res, next) {
  const GET_SPECIES = `SELECT *
                        FROM species
                        WHERE id = $1`;

  const speciesResult = await makeQuery(GET_SPECIES, req.params.speciesId)
  res.json(speciesResult.rows[0]).status(200)
})



const getIndividualInfo = tryCatch(async function(req, res, next) {
  const GET_INDIVIDUAL = `SELECT 
                            individual_plant.*,
                            species.name AS species_name
                            FROM individual_plant
                            JOIN species ON individual_plant.species_id = species.id
                            WHERE individual_plant.id = $1`;  

  const GET_NEW_INDIVIDUAL_DEFAULTS_SPECIES = `SELECT 
                                                species.name AS species_name, 
                                                species.id AS species_id, 
                                                species.substrate_values AS substrate_values, 
                                                species.light_values AS light_values, 
                                                species.water_values AS water_values, 
                                                COUNT(individual_plant.id) AS individuals_count
                                                FROM species
                                              LEFT JOIN individual_plant ON individual_plant.species_id = species.id
                                              WHERE species.id = $1
                                              GROUP BY
                                                species.name, 
                                                species.id, 
                                                species.substrate_values, 
                                                species.light_values, 
                                                species.water_values`;

  const GET_NEW_INDIVIDUAL_DEFAULTS_GROUP_AND_SPECIES = `SELECT 
                                                          species_group.name AS group_name, 
                                                          species_group.id AS group_id, 
                                                          species_group.substrate_values AS substrate_values, 
                                                          species_group.light_values AS light_values, 
                                                          species_group.water_values AS water_values,
                                                          species.name AS species_name, 
                                                          species.id AS species_id, 
                                                          COUNT(individual_plant.id) AS individuals_count
                                                        FROM species_group
                                                        LEFT JOIN species ON species.id = species_group.species_id
                                                        LEFT JOIN individual_plant ON individual_plant.species_id = species.id
                                                        WHERE species_group.id = $1
                                                        GROUP BY 
                                                          species_group.name, 
                                                          species_group.id, 
                                                          species_group.substrate_values, 
                                                          species_group.light_values, 
                                                          species_group.water_values,
                                                          species.name, 
                                                          species.id, 
                                                          species.substrate_values, 
                                                          species.light_values, 
                                                          species.water_values`;  
  
  const GET_MOTHER = `SELECT mother.id, mother.name, mother.images FROM individual_plant
                        JOIN child_parent_pair ON individual_plant.id = child_parent_pair.individual_plant_id
                        LEFT JOIN parent_pair ON child_parent_pair.parent_pair_id = parent_pair.id
                        LEFT JOIN individual_plant AS mother ON mother.id = parent_pair.mother_id
                        WHERE individual_plant.id = $1`;

  const GET_FATHER = `SELECT father.id, father.name, father.images FROM individual_plant
                        JOIN child_parent_pair ON individual_plant.id = child_parent_pair.individual_plant_id
                        LEFT JOIN parent_pair ON child_parent_pair.parent_pair_id = parent_pair.id
                        LEFT JOIN individual_plant AS father ON father.id = parent_pair.father_id
                        WHERE individual_plant.id = $1`;
                        

  if (req.params.individualId === "undefined") {
    if (req.params.groupId === "undefined") {
      const speciesDefaultsResult = await makeQuery(GET_NEW_INDIVIDUAL_DEFAULTS_SPECIES, req.params.speciesId)
      const generatedName = generateIndividualName(speciesDefaultsResult.rows[0].species_name, speciesDefaultsResult.rows[0].species_id, Number(speciesDefaultsResult.rows[0].individuals_count) || 0)
      speciesDefaultsResult.rows[0].generatedName = generatedName;
      res.json(speciesDefaultsResult.rows[0]).status(200)
    } else {
      const groupAndSpeciesDefaultsResult = await makeQuery(GET_NEW_INDIVIDUAL_DEFAULTS_GROUP_AND_SPECIES, req.params.groupId)
      const generatedName = generateIndividualName(groupAndSpeciesDefaultsResult.rows[0].species_name, Number(groupAndSpeciesDefaultsResult.rows[0].individuals_count) || 0)
      groupAndSpeciesDefaultsResult.rows[0].generatedName = generatedName
      res.json(groupAndSpeciesDefaultsResult.rows[0]).status(200)
    }
  } else {
    const getMothersResult = await makeQuery(GET_MOTHER, req.params.individualId);
    const getFathersResult = await makeQuery(GET_FATHER, req.params.individualId);
    const individualResult = await makeQuery(GET_INDIVIDUAL, req.params.individualId);
    const generatedName = generateIndividualName(individualResult.rows[0].species_name, individualResult.rows[0].species_id, Number(individualResult.rows[0].individuals_count) || 0)
    
    individualResult.rows[0].generatedName = generatedName
    individualResult.rows[0].parents = {mother: getMothersResult.rows[0], father: getFathersResult.rows[0] || null};
    res.send(individualResult.rows[0]).status(200)
  }
})



const getGroupInfo = tryCatch(async function(req, res, next) {
  const GET_GROUP = `SELECT * 
                      FROM species_group
                      WHERE id = $1`;

  const GET_NEW_GROUP_DEFAULTS_SPECIES = `SELECT name AS species_name, id AS species_id, substrate_values AS species_substrate_values, light_values AS light_values_values, water_values AS water_values_values 
                                                FROM species
                                                WHERE id = $1`;

  if (req.params.groupId === "undefined") {
    const speciesDefaultsResult = await makeQuery(GET_NEW_GROUP_DEFAULTS_SPECIES, req.params.speciesId)
    res.send(speciesDefaultsResult.rows[0]).status(200)
  } else {
    const groupResult = await makeQuery(GET_GROUP, req.params.groupId)
    res.send(groupResult.rows).status(200)
  }
})



const getSpeciesMembersNested = tryCatch(async function(req, res, next) {
  const mother = req.query?.mother;
  const father = req.query?.father;
  const page = req.query?.page;

  const GET_PARENT_LESS_INDIVIDUALS = `SELECT individual_plant.id AS id, individual_plant.name AS name, individual_plant.images AS images
                                        FROM individual_plant
                                        JOIN child_parent_pair ON child_parent_pair.individual_plant_id = individual_plant.id
                                        WHERE species_id = $1 AND child_parent_pair.parent_pair_id IS NULL`;

  let parentlessIndividualsResult;
  if (!mother && !father) {
    parentlessIndividualsResult = await makeQuery(GET_PARENT_LESS_INDIVIDUALS, req.params.speciesId)
  }
  
  const GET_CHILDREN_OF = `SELECT individual_plant.id AS id, individual_plant.name AS name, individual_plant.images AS images
                            FROM individual_plant
                            LEFT JOIN child_parent_pair ON child_parent_pair.individual_plant_id = individual_plant.id
                            LEFT JOIN parent_pair ON child_parent_pair.parent_pair_id = parent_pair.id
                            WHERE individual_plant.species_id = $1 AND parent_pair.mother_id = $2 AND (parent_pair.father_id = $3 OR $3 IS NULL)`;

  const GET_MATES_OF =  `SELECT 
                          father.id AS id, 
                          father.images AS images, 
                          father.name AS name, 
                          COUNT(child_parent_pair.id) AS child_count
                          FROM parent_pair
                          LEFT JOIN child_parent_pair ON child_parent_pair.parent_pair_id = parent_pair.id
                          LEFT JOIN individual_plant AS father ON parent_pair.father_id = father.id
                          WHERE parent_pair.mother_id = $1
                          GROUP BY father.id
                          ORDER BY child_count DESC`
  
  let nestedNodes = parentlessIndividualsResult?.rows || [{id: mother, mates: [{id: father}]}];
  
  const speciesId = Number(req.params.speciesId);
  async function recursivelyRetrieveNodes(node) {
    const mates = await makeQuery(GET_MATES_OF, node.id);
    node.mates = mates?.rows;
    await Promise.all(
      node.mates.map(async mate => {
        const children = await makeQuery(GET_CHILDREN_OF, speciesId, node.id, mate.id || null);
        mate.children = await Promise.all(children.rows.map(recursivelyRetrieveNodes))
        return mate
      })
    )
    return node
  }

  async function childrenOfPair(node) {
    const children = await makeQuery(GET_CHILDREN_OF, speciesId, node.id, node.mates?.[0]?.id);
    node.mates[0].children = await Promise.all(children.rows.map(recursivelyRetrieveNodes));
    return node
  }

  if (mother && father) {
    nestedNodes = await childrenOfPair(nestedNodes[0]);
  } else {
    nestedNodes = await Promise.all(nestedNodes.map(recursivelyRetrieveNodes));
  }
  res.send(nestedNodes).status(200);
})



const getSpeciesMembers = tryCatch(async function(req, res, next) {
  const query = decodeURI(req.query.search);
  const GET_INDIVIDUALS = `SELECT name, id, images FROM individual_plant WHERE species_id = $1 AND LOWER(name) LIKE LOWER($2) LIMIT 100`;
  const speciesId = Number(req.params.speciesId);
  const plants = await makeQuery(GET_INDIVIDUALS, speciesId, `%${query}%`);
  res.send(plants.rows).status(200);
})



const getSpeciesMembersFlat = tryCatch(async function(req, res, next) {
  for (key in req.query) {
    req.query[key] = decodeURI(req.query[key])
  }
  const {minAge, maxAge, motherId, fatherId, minWater, maxWater, minLight, maxLight, hasArtificialConditions, isClone, query, isDead} = req.query

  const GET_INFO = `
    WITH value_averages AS (
      SELECT
        ip.id,
        AVG(CAST((wv.value->>'water_count') AS INTEGER)) AS avg_water_count,
        AVG(CAST((lv.value->>'hours') AS INTEGER)) AS avg_light_count
      FROM
        individual_plant ip
      LEFT JOIN jsonb_array_elements(ip.water_values) AS wv(value) ON true
      LEFT JOIN jsonb_array_elements(ip.light_values) AS lv(value) ON true
      WHERE
        wv.value->>'water_count' ~ '^[0-9]+$'
        AND lv.value->>'hours' ~ '^[0-9]+$'
      GROUP BY
        ip.id
    )
    SELECT 
      EXTRACT(EPOCH FROM (NOW() - ip.germination_date)) AS age,
      ip.*,
      father.id AS father_id,
      mother.id AS mother_id,
      va.avg_water_count,
      va.avg_light_count
    FROM individual_plant ip
    JOIN value_averages va ON ip.id = va.id
    LEFT JOIN child_parent_pair cpp ON ip.id = cpp.individual_plant_id
    LEFT JOIN parent_pair pp ON cpp.parent_pair_id = pp.id
    LEFT JOIN individual_plant father ON father.id = pp.father_id
    LEFT JOIN individual_plant mother ON mother.id = pp.father_id
    WHERE 
      ip.species_id = $1
      AND (EXTRACT(EPOCH FROM (NOW() - ip.germination_date)) > $2 OR $2 IS NULL)
      AND (EXTRACT(EPOCH FROM (NOW() - ip.germination_date)) < $3 OR $3 IS NULL)
      AND (va.avg_water_count >= $4 OR $4 IS NULL)
      AND (va.avg_water_count <= $5 OR $5 IS NULL)
      AND (va.avg_light_count >= $6 OR $6 IS NULL)
      AND (va.avg_light_count <= $7 OR $7 IS NULL)
      AND (mother_id = $8 OR $8 IS NULL)
      AND (father_id = $9 OR $9 IS NULL)
      AND (ip.is_artificial_conditions = $10 OR $10 IS NULL)
      AND (ip.is_clone = $11 OR $11 IS NULL)
      AND (
        ($12 = true AND ip.death_date IS NOT NULL) OR
        ($12 = false AND ip.death_date IS NULL)
      )
      AND (LOWER(ip.name) LIKE LOWER($13) OR $13 IS NULL)
  `
  
  const speciesId = Number(req.params.speciesId);
  const minAgeParam = Number(minAge) > 0 ? Math.round(parseFloat(minAge) * SECONDS_IN_A_YEAR) : null;
  const maxAgeParam = Number(maxAge) > 0 ? Math.round(parseFloat(maxAge) * SECONDS_IN_A_YEAR) : null;
  const minWaterParam = Number(minWater) > 0 ? Number(minWater) : null;
  const maxWaterParam = Number(maxWater) > 0 ? Number(maxWater) : null;
  const minLightParam = Number(minLight) > 0 ? Number(minLight) : null;
  const maxLightParam = Number(maxLight) > 0 ? Number(maxLight) : null;
  const isCloneParam = isClone === "true" ? true : false;
  const hasArtificialConditionsParam = hasArtificialConditions === "true" ? true : false;
  const isDeadParam = isDead === "true" ? true : false;

  const motherIdParam = motherId ? Number(motherId) : null;
  const fatherIdParam = fatherId ? Number(fatherId) : null;
  const queryParam = query.trim() ? `%${query}%` : null
  const plants = await makeQuery(GET_INFO,
    speciesId,
    minAgeParam,
    maxAgeParam,
    minWaterParam,
    maxWaterParam,
    minLightParam,
    maxLightParam,
    motherIdParam,
    fatherIdParam,
    hasArtificialConditionsParam,
    isCloneParam,
    isDeadParam,
    queryParam
  );
  res.status(200).send(plants.rows);
});



const getSpecificSpeciesGroups = tryCatch(async function(req, res, next) {
  const GET_SPECIES = `SELECT * 
                        FROM species
                        WHERE name = $1`;

  const GET_SPECIES_GROUPS = `SELECT * 
                              FROM group
                              WHERE species_id = $1`;

  const speciesResult = await makeQuery(GET_SPECIES, )
  const groupsResult = await makeQuery(GET_SPECIES_GROUPS, speciesResult.rows[0].id)
  res.send(groupsResult.rows).status(200)
})



const getSpecificSpeciesSpecificGroup = tryCatch(async function(req, res, next) {
  const GET_SPECIES = `SELECT * 
                        FROM species
                        WHERE name = $1`;

  const GET_SPECIES_GROUP = `SELECT * 
                                FROM group
                                WHERE species_id = $1 AND name = $2`;

  const GET_GROUP_INDIVIDUALS = `SELECT * 
                                  FROM individual_plant
                                  WHERE group_id = $1`;

  const speciesResult = await makeQuery(GET_SPECIES, )
  const groupResult = await makeQuery(GET_SPECIES_GROUP, speciesResult.rows[0].id, )
  const individualsResult = await makeQuery(GET_GROUP_INDIVIDUALS, groupResult.rows[0].id, )
  res.send({group: groupResult.rows, individuals: individualsResult.rows}).status(200)
})




//create
const createSpecies = tryCatch(async function(req, res, next) {
  if (
    !req.body.name
  ) {
    res.status(400).send({ error: "Please complete all required fields" });
    return;
  }

  const clean = DOMPurify.sanitize(req.body.descriptionHTML);
  const ADD_SPECIES = `INSERT INTO species (id, name, images, description_delta, description_html, light_values, substrate_values, water_values)
                          VALUES ($1, 
                                  $2, 
                                  $3, 
                                  $4, 
                                  $5,
                                  COALESCE($6::jsonb, '[{"hours": 1, "month": "January"}, {"hours": 1, "month": "February"}, {"hours": 1, "month": "March"}, {"hours": 1, "month": "April"}, {"hours": 1, "month": "May"}, {"hours": 1, "month": "June"}, {"hours": 1, "month": "July"}, {"hours": 1, "month": "August"}, {"hours": 1, "month": "September"}, {"hours": 1, "month": "October"}, {"hours": 1, "month": "November"}, {"hours": 1, "month": "December"}]'::jsonb), 
                                  COALESCE($7::jsonb, '[{"percent": 50, "substrate": "pumice", "color": "#1a3b52"}, {"percent": 50, "substrate": "soil", "color": "#ab691e"}]'::jsonb), 
                                  COALESCE($8::jsonb, '[{"water_count": 1, "month": "January"}, {"water_count": 1, "month": "February"}, {"water_count": 1, "month": "March"}, {"water_count": 1, "month": "April"}, {"water_count": 1, "month": "May"}, {"water_count": 1, "month": "June"}, {"water_count": 1, "month": "July"}, {"water_count": 1, "month": "August"}, {"water_count": 1, "month": "September"}, {"water_count": 1, "month": "October"}, {"water_count": 1, "month": "November"}, {"water_count": 1, "month": "December"}]'::jsonb))`
  const addSpeciesResult = await makeQuery(ADD_SPECIES, 
    req.params.nextId,
    req.body.name,
    JSON.stringify(req.files),
    isJsonString(req.body.descriptionDelta) ? req.body.descriptionDelta : JSON.stringify(req.body.descriptionDelta),
    clean,
    !req.body.light_values ? null : 
      isJsonString(req.body.light_values) ? req.body.light_values : 
      JSON.stringify(req.body.light_values)
    ,
    !req.body.substrate_values ? null : 
      isJsonString(req.body.substrate_values) ? req.body.substrate_values : 
      JSON.stringify(req.body.substrate_values)
    ,
    !req.body.water_values ? null :
      isJsonString(req.body.water_values) ? req.body.water_values : 
      JSON.stringify(req.body.water_values)
  )
  res.send(addSpeciesResult.rowCount > 0).status(200)
})



const createSpeciesIndividual = tryCatch(async function(req, res, next) {
  const GET_PARENTS = `SELECT * FROM parent_pair WHERE mother_id = $1 AND (father_id = $2 OR $2 IS NULL)`

  const parents = await JSON.parse(req.body.parents)
  const getExistingParentsResult = await makeQuery(GET_PARENTS,
    parents.mother?.id || null,
    parents.father?.id || null
  )
  
  const ADD_PARENTS = `INSERT INTO parent_pair (mother_id, father_id)
                         VALUES ($1, $2)`

  let addParentsResult;
  if (parents.mother?.id && getExistingParentsResult.rowCount <= 0) {
    addParentsResult = await makeQuery(ADD_PARENTS,
      parents.mother.id,
      parents.father?.id || null
    )
  }
 
  const clean = DOMPurify.sanitize(req.body.descriptionHTML);
  const ADD_INDIVIDUAL = `INSERT INTO individual_plant (id, name, images, description_delta, description_html, light_values, substrate_values, water_values, group_id, species_id, is_clone, is_artificial_conditions, death_date)
                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;
  
  const addIndividualResult = await makeQuery(ADD_INDIVIDUAL, 
    req.params.nextId,
    req.body.name,
    JSON.stringify(req.files),
    isJsonString(req.body.descriptionDelta) ? req.body.descriptionDelta : JSON.stringify(req.body.descriptionDelta),
    clean,
    isJsonString(req.body.light_values) ? req.body.light_values : JSON.stringify(req.body.light_values),
    isJsonString(req.body.substrate_values) ? req.body.substrate_values : JSON.stringify(req.body.substrate_values),
    isJsonString(req.body.water_values) ? req.body.water_values : JSON.stringify(req.body.water_values),
    req.params.groupId !== "undefined" ? req.params.groupId : null,
    req.params.speciesId,
    req.params.isClone === "true" ? true : false,
    req.params.isArtificialConditions === "true" ? true : false,
    req.params.isDead === "true" ? convertToPostgresTimestamp(Date.now()) : null,
  )

  const ADD_PARENT_CHILD_PAIR = `INSERT INTO child_parent_pair (individual_plant_id, parent_pair_id) 
                                  VALUES ($1, $2)`

  const GET_PARENT_PAIR_ID = `SELECT id FROM parent_pair WHERE mother_id = $1  AND (father_id = $2 OR $2 IS NULL)`;
  let getParentPairIdResult;

  if (parents.mother?.id) {
    getParentPairIdResult = await makeQuery(GET_PARENT_PAIR_ID, parents.mother.id, parents.father?.id || null)
  } 
  await makeQuery(ADD_PARENT_CHILD_PAIR, req.params.nextId, getParentPairIdResult?.rows[0]?.id || null) 

  res.send(addIndividualResult.rowCount > 0).status(200)
})



const createSpeciesGroup = tryCatch(async function(req, res, next) {
  const ADD_GROUP = `INSERT INTO group (name, images, description, species_id)
                           VALUES ($1, $2, $3, $4)`;

  const addGroupResult = await makeQuery(ADD_GROUP, )
  res.send(addGroupResult.rowCount > 0).status(200)
})



//edit
const editSpecies = tryCatch(async function(req, res, next) {
  const EDIT_SPECIES = `UPDATE species
                        SET 
                          name = COALESCE($1, name),
                          images = COALESCE($2, images),
                          description_delta = COALESCE($3, description_delta),
                          description_html = COALESCE($4, description_html),
                          light_values = COALESCE($5, light_values),
                          substrate_values = COALESCE($6, substrate_values),
                          water_values = COALESCE($7, water_values)
                        WHERE id = $8`;

  let {name, descriptionDelta, descriptionHTML, substrate_values, light_values, water_values, parents, groupId, existing_images} = req.body;
  const speciesId = req.params.speciesId;
  existing_images = JSON.parse(existing_images)
  const imageNameRegex = /image(\d+)\.jpeg/;
  const images = [...req.files, ...existing_images].sort((a, b) => {
    const imageANumber = a.match(imageNameRegex);
    const imageBNumber = b.match(imageNameRegex);
    
    if (imageANumber && imageBNumber) {
      return imageANumber - imageBNumber
    } else {
      return -1
    }
  })

  const clean = DOMPurify.sanitize(descriptionHTML);
  const editGroupResult = await makeQuery(EDIT_SPECIES, 
    name, 
    JSON.stringify(images), 
    descriptionDelta,
    clean, 
    isJsonString(light_values) ? light_values : JSON.stringify(light_values),
    isJsonString(substrate_values) ? substrate_values : JSON.stringify(substrate_values),
    isJsonString(water_values) ? water_values : JSON.stringify(water_values),
    speciesId
  )
  res.send(editGroupResult.rowCount > 0).status(200)
})



const editSpeciesIndividual = tryCatch(async function(req, res, next) {
  let {name, descriptionDelta, descriptionHTML, substrate_values, light_values, water_values, groupId, existing_images, isClone, isArtificialConditions, isDead} = req.body;
  const parents = JSON.parse(req.body.parents)
  const EDIT_INDIVIDUAL = `UPDATE individual_plant
                           SET 
                            name = COALESCE($1, name),
                            images = COALESCE($2, images),
                            description_delta = COALESCE($3, description_delta),
                            description_html = COALESCE($4, description_html),
                            substrate_values = COALESCE($5, substrate_values),
                            light_values = COALESCE($6, light_values),
                            water_values = COALESCE($7, water_values),
                            group_id = COALESCE($8, group_id),
                            is_clone = COALESCE($9, is_clone),
                            is_artificial_conditions = COALESCE($10, is_artificial_conditions),
                            death_date = $11
                           WHERE id = $12`;

  const GET_PARENT_PAIR = `SELECT * FROM parent_pair
                             WHERE mother_id = $1 AND (father_id = $2 OR $2 IS NULL)`;

  const GET_PARENT_CHILD_PAIR = `SELECT child_parent_pair.* FROM child_parent_pair 
                                  JOIN individual_plant ON individual_plant.id = child_parent_pair.individual_plant_id 
                                  WHERE individual_plant.id = $1`
  
  const ADD_PARENTS = `INSERT INTO parent_pair (mother_id, father_id)
                         VALUES ($1, $2)`
                            
  const DELETE_OLD_PARENT_CHILD_PAIR = `DELETE FROM child_parent_pair 
                                         WHERE id = $1`

  const ADD_PARENT_CHILD_PAIR = `INSERT INTO child_parent_pair (individual_plant_id, parent_pair_id) 
                                   VALUES ($1, $2)`

  let getParentPairResult = await makeQuery(GET_PARENT_PAIR, parents.mother?.id, parents.father?.id);

  if (getParentPairResult.rowCount <= 0) {
    const getParentChildPairResult = await makeQuery(GET_PARENT_CHILD_PAIR, req.params.individualId);

    await makeQuery(DELETE_OLD_PARENT_CHILD_PAIR, getParentChildPairResult.rows[0]?.id);

    if (parents.mother?.id) {
      await makeQuery(ADD_PARENTS, parents.mother.id, parents.father?.id || null);
    }
    getParentPairResult = await makeQuery(GET_PARENT_PAIR, parents.mother?.id, parents.father?.id || null);

    await makeQuery(ADD_PARENT_CHILD_PAIR, req.params.individualId, getParentPairResult.rows[0]?.id || null);
  }

  existing_images = JSON.parse(existing_images);
  const imageNameRegex = /image(\d+)\.jpeg/;
  const images = [...req.files, ...existing_images].sort((a, b) => {
    const imageANumber = a.match(imageNameRegex);
    const imageBNumber = b.match(imageNameRegex);
    if (imageANumber && imageBNumber) {
      return imageANumber - imageBNumber
    } else {
      return -1
    }
  })

  const clean = DOMPurify.sanitize(descriptionHTML);
  
  const editIndividualResult = await makeQuery(EDIT_INDIVIDUAL, 
    name, 
    JSON.stringify(images),
    descriptionDelta,
    clean,
    isJsonString(substrate_values) ? substrate_values : JSON.stringify(substrate_values),
    isJsonString(light_values) ? light_values : JSON.stringify(light_values),
    isJsonString(water_values) ? water_values : JSON.stringify(water_values),
    groupId,
    isClone === "true" ? true : false,
    isArtificialConditions === "true" ? true : false,
    isDead === "true" ? convertToPostgresTimestamp(Date.now()) : null,
    req.params.individualId
  );
  res.send(editIndividualResult.rowCount > 0).status(200);
})



const editSpeciesGroup = tryCatch(async function(req, res, next) {
  const EDIT_GROUP = `UPDATE group
                      SET 
                        name = COALESCE($1, name),
                        images = COALESCE($2, images),
                        description = COALESCE($3, description)
                      WHERE id = $4`;

  const editGroupResult = await makeQuery(EDIT_GROUP, )
  res.send(editGroupResult.rowCount > 0).status(200)
})



//delete
const deleteSpecies = tryCatch(async function(req, res, next) {
  const DELETE_SPECIES = `DELETE from species
                          WHERE id = $1`;

  const deleteSpeciesResult = await makeQuery(DELETE_SPECIES, req.params.speciesId)

  deleteFolderAndContents(req.body.speciesName)

  res.send(deleteSpeciesResult.rowCount > 0).status(200)
})



const deleteSpeciesIndividual = tryCatch(async function(req, res, next) {
  const DELETE_INDIVIDUAL = `DELETE from individual_plant
                             WHERE id = $1`;

  const deleteIndividualResult = await makeQuery(DELETE_INDIVIDUAL, req.params.individualId)
  deleteFolderAndContents(req.body.speciesName, req.body.individualName)
  res.send(deleteIndividualResult.rowCount > 0).status(200)
})



const deleteSpeciesGroup = tryCatch(async function(req, res, next) {
  const DELETE_GROUP = `DELETE from group
                        WHERE id = $1`;

  const deleteGroupResult = await makeQuery(DELETE_GROUP, req.params.groupId);
  deleteFolderAndContents(req.body.speciesName, req.body.groupName)
  res.send(deleteGroupResult.rowCount > 0).status(200);
})


module.exports = {
  deleteSpeciesGroup,
  deleteSpeciesIndividual,
  deleteSpecies,
  editSpecies,
  editSpeciesGroup,
  editSpeciesIndividual,
  createSpecies,
  createSpeciesGroup,
  createSpeciesIndividual,
  getSpecies,
  getSpecificSpeciesInfo,
  getSpeciesMembers,
  getSpeciesMembersFlat,
  getSpeciesMembersNested,
  getSpecificSpeciesGroups,
  getIndividualInfo,
  getGroupInfo,
  getSpecificSpeciesSpecificGroup,
}
