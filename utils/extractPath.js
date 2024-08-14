
function extractPath(url) {
  const match = url.match(/\/([^\/]+\/[^\/]+\.jpeg)/);
  if (match) {
    return match[1]
  } else {
    console.log("No match found");
  }
}

module.exports=extractPath