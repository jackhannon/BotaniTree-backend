const envConfig = require('../config/envConfig');
const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

const bucketName = envConfig.S3_BUCKET_NAME;
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



const speciesStorage = multerS3({
  s3,
  bucket: bucketName,
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.originalname });
  },
  key: async function (req, file, cb) {
    const speciesId = req.params.speciesId || req.params.nextId;;
    cb(null, `${speciesId}/${Date.now() + Math.floor(Math.random()*10000)}.jpeg`);
  },
});

const individualStorage = multerS3({
  s3,
  bucket: bucketName,
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: async function (req, file, cb) {
    const speciesId = req.params.speciesId;
    const individualId = req.params.individualId || req.params.nextId;
    cb(null, `${speciesId}/${individualId}${Date.now() + Math.floor(Math.random()*10000)}.jpeg`);
  },
});

const groupStorage = multerS3({
  s3,
  bucket: bucketName,
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req, file, cb) {
    const speciesName = req.bodyspeciesName;
    const groupName = req.body.groupName;
    cb(null, `${speciesName}/${groupName}/${file.fieldname}`);
  }
});

const speciesUpload = multer({storage: speciesStorage})
const individualUpload = multer({storage: individualStorage})
const groupUpload = multer({storage: groupStorage})

module.exports = { speciesUpload, individualUpload, groupUpload };




