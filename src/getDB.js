import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "password")
);
// Requête pour récupérer les chercheurs par institution
const getResearchersByInstitution = async () => {
  const session = driver.session();
  const result = await session.run(
    "MATCH (r:Researcher) RETURN r.name AS name, r.mainInstitution AS institution, r.module AS module"
    // "MATCH (r:Researcher)-[:WORKS_FOR]->(i:Institution) WITH i, COLLECT({name: r.name, module: r.module}) AS researchers RETURN name: i.name, researchers: researchers, latitude: i.latitude, longitude: i.longitude"
  );
  session.close();
  return result.records.map((record) => ({
    name: record.get("name"),
    institution: record.get("institution"),
    module: record.get("module"),
  }));
};

const getInstitutions = async () => {
  const session = driver.session();
  const institutions = await session.run(
    "MATCH (n:Institution) RETURN n.latitude, n.longitude, n.name"
  );
  session.close();
  return institutions.records.map((record) => ({
    name: record.get("n.name"),
    latitude: record.get("n.latitude"),
    longitude: record.get("n.longitude"),
  }));
};

export { getResearchersByInstitution, getInstitutions };
