import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "password")
);

// Fonction pour ajouter les membres principaux a la DB
const pushMembersToDB = async (members) => {
  const session = driver.session();
  try {
    for (const member of members) {
      const { name, module, institution } = member;
      await session.run(
        `MERGE (r:Researcher {name: $name})
         ON CREATE SET r.moduleType = $module, r.Institution = $institution, 
         ON MATCH SET r.moduleType = $module, r.Institution = $institution,`,
        { name, module, institution }
      );
      await session.run("MERGE (i:Institution {name: $institution})", {
        institution,
      });
      await session.run(
        `MATCH (r:Researcher {name: $name}), (i:Institution {name: $institution})
         MERGE (r)-[:WORKS_FOR]->(i)`,
        { name, institution }
      );
    }
    console.log("Data successfully pushed to Neo4j");
  } catch (error) {
    console.error("Error pushing data to Neo4j:", error);
  } finally {
    await session.close();
  }
};

export { pushMembersToDB };
