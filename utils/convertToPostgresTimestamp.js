function convertToPostgresTimestamp(milliseconds) {
  const date = new Date(milliseconds);
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

module.exports = {convertToPostgresTimestamp}