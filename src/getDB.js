import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "password")
);
// Requête pour récupérer les chercheurs par institution avec leurs propriétés
const getResearchersByInstitution = async () => {
  const session = driver.session();
  const result = await session.run(
    `MATCH (r:Researcher)
     RETURN r.name AS name, 
            r.mainInstitution AS institution, 
            r.module AS module, 
            r.keywords AS keywords, 
            r.population_type AS populationType, 
            r.age_group AS ageGroup, 
            r.health_status AS healthStatus`
  );
  session.close();
  console.log(result.records);
  return result.records.map((record) => ({
    name: record.get("name"),
    institution: record.get("institution"),
    module: record.get("module"),
    keywords: record.get("keywords"),
    populationType: record.get("populationType"),
    ageGroup: record.get("ageGroup"),
    healthStatus: record.get("healthStatus"),
  }));
};

const getInstitutions = async () => {
  const session = driver.session();
  const institutions = await session.run(
    "MATCH (i:Institution) WHERE NOT i.name CONTAINS '-'  AND i.latitude IS NOT NULL AND i.longitude IS NOT NULL AND i.institutionType = 'foundingInstitution' RETURN i.latitude AS latitude, i.longitude AS longitude, i.name AS name"
  );
  session.close();
  return institutions.records.map((record) => ({
    name: record.get("name"),
    latitude: record.get("latitude"),
    longitude: record.get("longitude"),
  }));
};
const getPeople = async () => {
  const session = driver.session();
  const result = await session.run(
    "MATCH (p:People) RETURN labels(p) AS labels, p.mainInstituion AS institution, p.name AS name, p.arrivalDate AS arrivalDate, p.departureDate AS departureDate"
  );
  session.close();
  return result.records.map((record) => ({
    name: record.get("name"),
    startDate: record.get("startDate"),
    endDate: record.get("endDate"),
  }));
};
getPeople();

export { getResearchersByInstitution, getInstitutions };
