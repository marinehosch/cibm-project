const neo4j = require("neo4j-driver");

// Connect to Neo4j
(async () => {
  const uri = "bolt://localhost:7687";
  const user = "neo4j";
  const password = "password";
  let driver;

  try {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    const session = driver.session();
    console.log("Connected to Neo4j");
  } catch (error) {
    console.error(`Could not connect to Neo4j : ${error.cause}`);
  }
})();
