const deleteAllExcept = require("../utils/deleteAllExcept");
const extractPath = require("../utils/extractPath");

const deleteFolderImages = async (req, res, next) =>  {
  if (req.files) {
    req.files = await Promise.all(req.files.map(async (file) => {
      const locationLink = file.location;
      let newUrl = await locationLink.replace(/^(https?:\/\/)[^\/]+/, '$1botanical-lineage-store.imgix.net')
      return newUrl;
    }));
  } else {
    req.files = []
  }
  let existingImages = JSON.parse(req.body.existing_images)

  const allImages = [...existingImages, ...req.files].map(extractPath);


  await deleteAllExcept(allImages, req.params.speciesId)
  next()
}

module.exports = deleteFolderImages