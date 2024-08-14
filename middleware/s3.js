const { S3Client } = require("@aws-sdk/client-s3");
const envConfig = require("../config/envConfig")

const bucketRegion = envConfig.S3_BUCKET_REGION;
const accessKey = envConfig.S3_ACCESS_KEY;
const secretAccessKey = envConfig.S3_SECRET_ACCESS_KEY;

const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey,
  },
  region: bucketRegion
});


module.exports = s3