const s3 = require("../middleware/s3")
const envConfig = require("../config/envConfig");
const { ListObjectsCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const bucketName = envConfig.S3_BUCKET_NAME;

const deleteAllExcept = async (exceptions, ...folderKeys) => {
  const params = {
    Bucket: bucketName,
    Prefix: folderKeys.join('/')
  };
  const DeletePromises = [];
  const { Contents } = await s3.send(
    new ListObjectsCommand(params),
  );
  if (!Contents) return;
  Contents.forEach(({ Key }) => {
    if (!exceptions.includes(Key)) {
      DeletePromises.push(
        s3.send(
          new DeleteObjectCommand({
            Bucket: bucketName,
            Key,
          }),
        ),
      );
    }
  });
  await Promise.all(DeletePromises);
};


module.exports = deleteAllExcept
