const notFound = async (req, res) => {
  res.status(404).send("invalid path")
}
module.exports = notFound