const envConfig = require("../config/envConfig")
const axios = require("axios")

function encodePath(path) {
  let params = path.split("/")
  return params.map(param => encodeURI(param)).join("/")
}

async function purgeImage(path) {
  console.log(path)
  const headers = {
    Authorization: `Bearer ${envConfig.IMGIX_KEY}`,
    'Content-Type': 'application/vnd.api+json',
  };

  const encodedPath = encodePath(path)
  const data = JSON.stringify({
    data: {
          type: 'purges',
          attributes: {
              url: envConfig.IMGIX_URL + encodedPath,
              source_id: envConfig.IMGIX_SOURCE_ID,
          },
      }
  });
  await axios.post('https://api.imgix.com/api/v1/purge', data, { headers });
}

module.exports = purgeImage