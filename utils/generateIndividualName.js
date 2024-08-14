const isNameUnique = require("./isNameUnique")

function generateIndividualName(speciesName, species_id, highestId) {
  let name = "";
  let letterPositionToUse = 0;
  let postfix = String(highestId + 1);
  while (postfix.length < 3) {
    postfix = 0 + postfix;
  };
  while (!isNameUnique("individual_plant", speciesName, species_id) || name === "") {
    const prefix = speciesName.split(" ").map(word => word[letterPositionToUse].toUpperCase()).join("");
    name = prefix + postfix;
    letterPositionToUse++;
  };
  return name
}

module.exports=generateIndividualName