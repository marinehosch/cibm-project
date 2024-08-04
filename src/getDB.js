import neo4j from "neo4j-driver";

const uri = import.meta.env.VITE_NEO4J_URI || "bolt://localhost:7687";
const user = import.meta.env.VITE_NEO4J_USER || "neo4j";
const password = import.meta.env.VITE_NEO4J_PASSWORD || "password";

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

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
            r.health_status AS healthStatus, 
            r.arrivalDate AS arrivalDate,
            r.departureDate AS departureDate`
  );
  session.close();
  return result.records.map((record) => ({
    name: record.get("name"),
    institution: record.get("institution"),
    module: record.get("module"),
    keywords: record.get("keywords"),
    populationType: record.get("populationType"),
    ageGroup: record.get("ageGroup"),
    healthStatus: record.get("healthStatus"),
    arrivalDate: record.get("arrivalDate"),
    departureDate: record.get("departureDate"),
  }));
};

const getInstitutions = async () => {
  const session = driver.session();
  const result = await session.run(
    "MATCH (i:Institution) WHERE NOT i.name CONTAINS '-'  AND i.latitude IS NOT NULL AND i.longitude IS NOT NULL AND i.institutionType = 'foundingInstitution' RETURN i.latitude AS latitude, i.longitude AS longitude, i.name AS name"
  );
  session.close();
  return result.records.map((record) => ({
    name: record.get("name"),
    latitude: record.get("latitude"),
    longitude: record.get("longitude"),
  }));
};

const getPeople = async () => {
  const session = driver.session();
  const result = await session.run(
    "MATCH (p:People) RETURN labels(p) AS labels, p.mainInstitution AS institution, p.name AS name, p.arrivalDate AS arrivalDate, p.departureDate AS departureDate"
  );
  session.close();
  console.log(result);
  return result.records.map((record) => ({
    name: record.get("name"),
    institution: record.get("institution"),
    arrivalDate: record.get("arrivalDate"),
    departureDate: record.get("departureDate"),
    labels: record.get("labels"),
  }));
};

export { getResearchersByInstitution, getInstitutions, getPeople, driver };
