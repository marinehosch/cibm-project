import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "password")
);
// Requête pour récupérer les chercheurs par institution
const getResearchersByInstitution = async (institutionName) => {
  const session = driver.session();
  const result = await session.run(
    "MATCH (i:Institution {name: $institutionName})<-[:WORKS_FOR]-(r:Researcher) RETURN r.name AS name",
    { institutionName }
  );
  session.close();
  return result.records.map((record) => ({
    name: record.get("name"),
  }));
};

// Requête pour récupérer toutes les institutions
const getInstitutions = async () => {
  const session = driver.session();
  const institutions = await session.run("MATCH (n:Institution) RETURN n");
  session.close();
  return institutions.records.map((record) => record.get(0).properties);
};

export { getResearchersByInstitution, getInstitutions };
