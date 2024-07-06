import axios from "axios";
import cheerio from "cheerio";

const proxyUrl = "/api";

// Fonction pour récupérer les URL des départements via le sitemap
const getInstitutionUrls = async () => {
  const sitemap_url = `${proxyUrl}/team_department-sitemap.xml`;

  try {
    const response = await axios.get(sitemap_url);
    const sitemapData = response.data;
    const $sitemap = cheerio.load(sitemapData, { xmlMode: true });

    const institutionUrls = [];
    $sitemap("url > loc").each((index, element) => {
      const url = $sitemap(element).text();
      institutionUrls.push(url);
    });

    console.log("Fetched URLs:", institutionUrls);
    return institutionUrls;
  } catch (error) {
    console.error("Error fetching sitemap:", error);
    return [];
  }
};

// Fonction pour extraire l'institution et le module à partir du nom du département
const extractSectionFromDepartment = (departmentName) => {
  const keywords = ["CHUV", "UNIL", "EPFL", "UNIGE", "HUG"];
  const modules = ["MRI", "EEG", "PET", "SP", "DS"];

  let institutions = [];
  let module = "";

  // Recherche de l'institution dans le nom du département
  for (const keyword of keywords) {
    if (departmentName.includes(keyword)) {
      institutions.push(keyword);
    }
  }

  // Recherche du module dans le nom du département
  for (const mod of modules) {
    if (departmentName.includes(mod)) {
      module = mod;
      break;
    }
  }

  // Déterminer mainInstitution
  let mainInstitution = "";
  if (institutions.length > 1) {
    mainInstitution = institutions[0];
  } else if (institutions.length === 1 && institutions[0] !== "CIBM") {
    mainInstitution = institutions[0];
  }

  const section = institutions.join("-");

  return { institutions, module, section, mainInstitution };
};

// Fonction pour récupérer les noms des membres par département
const getMemberNamesByDepartment = async (url) => {
  try {
    const response = await axios.get(proxyUrl + url, { timeout: 10000 });
    const html = response.data;
    const $ = cheerio.load(html);

    const departmentName = $("title").text().trim(); // Récupérer le nom du département depuis le titre de la page
    const { institutions, module, section, mainInstitution } =
      extractSectionFromDepartment(departmentName);
    const members = [];

    $("div.post-inner div.publist p span.post-title").each((index, element) => {
      const name = $(element).text().trim();
      if (name) {
        const member = {
          name,
          section,
          mainInstitution,
          institutions, // Utilisation de toutes les institutions trouvées dans la section
          module,
        };
        members.push(member);
      }
    });

    console.log(`Members for ${departmentName}:`, members);
    return { department: departmentName, members };
  } catch (error) {
    console.error(`Error fetching member names for ${url}:`, error);
    return { department: "", members: [] };
  }
};

// Fonction pour récupérer tous les membres par département, institution et module
const getAllMembersByDepartment = async () => {
  const departmentUrls = await getInstitutionUrls();

  if (!departmentUrls.length) {
    console.error("No URLs fetched from sitemap");
    return [];
  }

  const allMembersByDepartment = [];

  for (const url of departmentUrls) {
    console.log(`Processing URL: ${url}`);
    const { department, members } = await getMemberNamesByDepartment(url);
    if (department && members.length > 0) {
      allMembersByDepartment.push({ department, members });
    }
  }

  console.log(
    "All Members by Department, Institution, and Module:",
    allMembersByDepartment
  );
  return allMembersByDepartment;
};

// Appel de la fonction pour récupérer tous les membres
getAllMembersByDepartment();
