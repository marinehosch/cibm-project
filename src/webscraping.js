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

    return institutionUrls;
  } catch (error) {
    console.error("Error fetching sitemap:", error);
    return [];
  }
};

// Liste des URLs à ignorer
const ignoredUrls = ["https://cibm.ch/team_department/cibm-leadership/"];

// Fonction pour extraire l'institution et le module à partir du nom du département
const extractSectionFromDepartment = (departmentName) => {
  const sections = [
    "CHUV-UNIL",
    "UNIL",
    "EPFL",
    "HUG-UNIGE",
    "HUG",
    "CHUV-EPFL",
    "UNIGE",
    "EPFL-UNIGE",
  ];
  const modules = ["MRI", "EEG", "PET", "SP", "DS"];

  let institutions = [];
  let module = "";

  // Recherche de l'institution dans le nom du département
  for (const section of sections) {
    if (departmentName.includes(section)) {
      institutions.push(section);
    }
  }

  // Recherche du module dans le nom du département
  for (const mod of modules) {
    if (departmentName.includes(mod)) {
      module = mod;
      break;
    }
  }

  // Déterminer mainInstitution, par défaut "CIBM" si aucune institution trouvée
  let mainInstitution = institutions.length > 0 ? institutions[0] : "CIBM";

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
          institutions, // institutions trouvées dans le nom du département
          module,
        };
        members.push(member);
      }
    });

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
    if (ignoredUrls.includes(url)) {
      console.log(`Ignoring URL: ${url}`);
      continue;
    }
    const { department, members } = await getMemberNamesByDepartment(url);
    if (department && members.length > 0) {
      allMembersByDepartment.push({ department, members });
    }
  }

  return allMembersByDepartment;
};

export {
  getInstitutionUrls,
  getMemberNamesByDepartment,
  getAllMembersByDepartment,
};
